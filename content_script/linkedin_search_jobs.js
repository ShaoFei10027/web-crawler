
(function(){
	console.log('初始化button');
    var btn = "<button id='crawlBtn'>↓<button>";
    $('.jobs-search-box').append(btn);

})();

$(document).ready(function() {
	$('#crawlBtn').click(function(event) {
		console.log('click btn');

		var keywords = $('.keyword-search-form input').val(),
			location = $('.location-search-form input').val(),
			sortBy = $('#sort-dropdown-select').val();
		console.log('输入参数:',keywords, location, sortBy);

		getSearchJobs(keywords, location, sortBy);
	});
});

async function getSearchJobs(keywords, location, sortBy) {
	var url = 'https://www.linkedin.com/voyager/api/search/hits',
		interval = 25,
		params = {
			'decoration': '(hitInfo(com.linkedin.voyager.search.SearchJobJserp(descriptionSnippet,jobPosting~(entityUrn,savingInfo,title,formattedLocation,applyingInfo,new,jobState,sourceDomain,applyMethod(com.linkedin.voyager.jobs.OffsiteApply,com.linkedin.voyager.jobs.SimpleOnsiteApply,com.linkedin.voyager.jobs.ComplexOnsiteApply),listedAt,expireAt,closedAt,companyDetails(com.linkedin.voyager.jobs.JobPostingCompany(company~(entityUrn,name,logo,backgroundCoverImage)),com.linkedin.voyager.jobs.JobPostingCompanyName),eligibleForReferrals,~relevanceReason(entityUrn,jobPosting,details(com.linkedin.voyager.jobs.shared.InNetworkRelevanceReasonDetails(totalNumberOfConnections,topConnections*~(profilePicture,firstName,lastName,entityUrn)),com.linkedin.voyager.jobs.shared.CompanyRecruitRelevanceReasonDetails(totalNumberOfPastCoworkers,currentCompany~(entityUrn,name,logo,backgroundCoverImage)),com.linkedin.voyager.jobs.shared.SchoolRecruitRelevanceReasonDetails(totalNumberOfAlumni,mostRecentSchool~(entityUrn,name,logo)),com.linkedin.voyager.jobs.shared.HiddenGemRelevanceReasonDetails)),~jobSeekerQuality(entityUrn,qualityType,qualityToken,messagingStatus))),com.linkedin.voyager.search.FacetSuggestion,com.linkedin.voyager.search.SearchCompany,com.linkedin.voyager.search.SearchJob,com.linkedin.voyager.search.SearchProfile,com.linkedin.voyager.search.SearchSchool,com.linkedin.voyager.search.SecondaryResultContainer),trackingId)',
			'keywords': keywords,
			'location': location,
			'q': 'jserpAll',
			'start': 0,
			'count': interval,
			'sortBy': sortBy,
		},
		record,rawElements;

	var setStart = prompt("Please enter the start number","0");
	if (setStart === null) {
		return;
	} else if(isNaN(setStart)) {
		alert("Please enter a valid numeber!");
		return;
	} else if (parseInt(setStart) > 1000) {
		alert("Please enter a no more than 1000 number!");
		return;
	} else {
		setStart = parseInt(setStart);
		params["start"] = setStart;
		console.log("用户设置的开始数目:",setStart);
	}

	var setTotal = prompt("How many items do you want?","25");
	if (setTotal === null) {
		return;
	} else if(isNaN(setTotal)) {
		alert("Please enter a valid numeber!");
		return;
	} else if (parseInt(setTotal) > 1000) {
		alert("Please enter a no more than 1000 number!");
		return;
	} else {
		setTotal = parseInt(setTotal);
		console.log("用户需要的数目:",setTotal);
	}

	$("#crawlBtn").text('...');

	var header_crsf = await getHeaderCrsf();

	if (setTotal <= interval) {
		params["count"] = setTotal;

		record = await sendRequest(url, params, header_crsf);
		rawElements = record.elements;
	} else {
		record = await sendRequest(url, params, header_crsf);
		rawElements = record.elements;

		let jobsTotal = record.paging.total;

		console.log("显示的总数目:",jobsTotal);
		if (jobsTotal > setTotal) {
			let jobsPage = parseInt(setTotal/interval), //setTotal=51,page=2
				jobsRemainder  = setTotal%interval, //1
				requestArray = [];

			for (let i = 1; i <= jobsPage; i++) {
				params["start"] = i*interval;

				if (i == jobsPage) {
					params["count"] = jobsRemainder;
				}

				requestArray.push(sendRequest(url, params, header_crsf));
			}

			record = await Promise.all(requestArray);

			for (var i = 0; i < record.length; i++) {
				rawElements = rawElements.concat(record[i]["elements"]);
			}
		}
	}

	var dataLists = handleJobsRes(rawElements);

	exportCsv({
		title:["Title","Company","Location","Description","Timestamp"],
		titleForKey:["title","comapny_name",'location','description_snippet','listed_at'],
		data: dataLists,
		fileName: "Jobs_" + keywords + "_" + location,
  	});

  	$("#crawlBtn").text('↓');

  	return;
}

function sendRequest(url, params, hearders) {
	return new Promise((resolve) => {
		$.ajax({
			url: url,
			type: 'GET',
			dataType: 'json',
			data: {
				'decoration': params.decoration,
				'keywords': params.keywords,
				'location': params.location,
				'q': params.q,
				'start': params.start,
				'count': params.count,
				'sortBy': params.sortBy,
			},
			beforeSend: function(xhr){
			    xhr.setRequestHeader('Csrf-Token', hearders);//这里设置header
			},
		})
		.done(function(res) {
			resolve(res)
		})
		.fail(function(res) {
			console.log("error");
			reject(res);
		});

	});
}

function getHeaderCrsf(){

	return new Promise(function(resolve, reject){

		chrome.runtime.sendMessage({getHeaderCrsf: true}, function(response) {
			if (response.length === 0) {
				reject();
				return;
			}

			console.log('getHeaderCrsf response:', response);

			resolve(response.headerCrsf);
		});

	});
}

function handleJobsRes(elements) {
	var jobLists = elements,
		lists = [];

	$.each(jobLists, function(index, val) {
		let item = val['hitInfo']['com.linkedin.voyager.search.SearchJobJserp'],
			description, result;

		if (!item) {
			return;
		}

		description = item['descriptionSnippet'],
		result = item['jobPostingResolutionResult'];

		if (result) {
			let company = result['companyDetails']['com.linkedin.voyager.jobs.JobPostingCompany'],
				companyName;

			if (company) {
				companyName = result['companyDetails']['com.linkedin.voyager.jobs.JobPostingCompany']['companyResolutionResult']['name'];
			} else {
				companyName = result['companyDetails']['com.linkedin.voyager.jobs.JobPostingCompanyName']['companyName'];
			}

			lists.push({
				"title": result['title'],
				"comapny_name": companyName,
				"location": result['formattedLocation'],
				"description_snippet": description,
				"listed_at": result['listedAt'],
			});
		}

	});

	console.log(lists);
	return lists;
}

function exportCsv (obj) {

	// var datas = obj.data;
	//处理字符串中的, "
	obj['data'] = obj['data'].map(function(elem) {

		if (elem['title'] && /[",\r\n]/g.test(elem['title'])) {
			elem['title'] = '"' + elem['title'].replace(/(")/g, '""') + '"';
		}


		if (elem['comapny_name'] && /[",\r\n]/g.test(elem['comapny_name'])) {
			elem['comapny_name'] = '"' + elem['comapny_name'].replace(/(")/g, '""') + '"';
		}

		if (elem['location'] && /[",\r\n]/g.test(elem['location'])) {
			elem['location'] = '"' + elem['location'].replace(/(")/g, '""') + '"';
		}

		if (elem['description_snippet'] && /[",\r\n]/g.test(elem['description_snippet'])) {
			elem['description_snippet'] = '"' + elem['description_snippet'].replace(/(")/g, '""') + '"';
		}

		return elem;
	});

    //title ["","",""]
    var title = obj.title;
    //titleForKey ["","",""]
    var titleForKey = obj.titleForKey;
    var data = obj.data;
    var str = [];
    str.push(obj.title.join(",")+"\n");

    for(var i=0;i<data.length;i++){
        var temp = [];
        for(var j=0;j<titleForKey.length;j++){
            temp.push(data[i][titleForKey[j]]);
     	}
     	str.push(temp.join(",")+"\n");
	}

	var uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent("\uFEFF" + str.join(""));  //添加BOM头
	var downloadLink = document.createElement("a");
	downloadLink.href = uri;
	downloadLink.download = obj.fileName+".csv";
	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
};
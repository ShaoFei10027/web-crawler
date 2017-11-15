
(function(){
	console.log('初始化button');
    var btn = "<button id='crawlBtn'>↓<button>";
    $('.jobs-search-box').append(btn);
})();

$(document).ready(function() {
	$('#crawlBtn').click(function(event) {
		console.log('click btn');

		var keywords = $('.keyword-search-form input').val();

		if (!keywords) {
			alert("Please enter keywords!");
			return;
		}

		console.log('输入参数:',keywords);
		getSearchJobs(keywords);
	});
});

async function getSearchJobs(keywords) {
	var url = 'https://www.linkedin.com/voyager/api/search/cluster',
		interval = 10,
		params = {
			'guides': 'List(v->COMPANIES)',
			'origin': 'SWITCH_SEARCH_VERTICAL',
			'q': 'guided',
			'keywords': keywords,
			'start': 0,
			'count': interval,
		},
		record,rawElements,dataLists;

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

	var setTotal = prompt("How many items do you want?","10");
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
	}

	$("#crawlBtn").text('...');

	var header_crsf = await getHeaderCrsf();

	console.log("用户需要的数目:",setTotal);
	if (setTotal <= interval) {
		params["count"] = setTotal;

		record = await sendRequest(url, params, header_crsf);
		// rawElements = record.included;
		dataLists = handleCompaniesRes(record["included"]).elements;
	} else {
		record = await sendRequest(url, params, header_crsf);

		let tempData  = handleCompaniesRes(record["included"]),
			jobsTotal = tempData.total;

		dataLists = tempData.elements;

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
				tempData = handleCompaniesRes(record[i]["included"]),

				dataLists = dataLists.concat(tempData.elements);
			}
		}
	}

	console.log(dataLists);

	exportCsv({
		title:["ID","Company","Industry","Location","Size"],
		titleForKey:["id","name",'industry','location','size'],
		data: dataLists,
		fileName: "Companies_" + keywords,
  	});

  	$("#crawlBtn").text('↓');

  	return;
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

function sendRequest(url, params, hearderCsrf) {
	return new Promise((resolve) => {
		$.ajax({
			url: url,
			type: 'GET',
			dataType: 'json',
			data: params,
			beforeSend: function(xhr){
			    xhr.setRequestHeader('Csrf-Token', hearderCsrf);//这里设置header
			    xhr.setRequestHeader('Accept', 'application/vnd.linkedin.normalized+json');
			    xhr.setRequestHeader('X-RestLi-Protocol-Version', '2.0.0');
			},
		})
		.done(function(res) {
			resolve(res);
		})
		.fail(function(res) {
			console.log("error");
			reject(res);
		});

	});
}

function handleCompaniesRes(res){
	var companyTotal,
		nameArray = [],
		detailArray = [],
		companies = [];

	for (let i = 0; i < res.length; i++) {
		if (res[i]["$type"] === "com.linkedin.voyager.search.SearchCluster") {
			companyTotal = res[i]["total"];
		} else if (res[i]["$type"] === "com.linkedin.voyager.entities.shared.MiniCompany") {
			nameArray.push(res[i]);
		} else if (res[i]["$type"] === "com.linkedin.voyager.search.SearchCompany") {
			detailArray.push(res[i]);
		}
	}

	// console.log(companyTotal);
	// console.log(nameArray);
	// console.log(detailArray);

	for (let i = 0; i < nameArray.length; i++) {
		// nameArray[i];
		let companyUrn = nameArray[i]["objectUrn"];
			companyName = nameArray[i]["name"];

		for (let n = 0; n < detailArray.length; n++) {
			// detailArray[n];
			if (detailArray[n]["backendUrn"] === companyUrn) {
				companies.push({
					"id": detailArray[n]["id"],
					"name": companyName,
					"location": detailArray[n]["location"],
					"industry": detailArray[n]["industry"],
					"size": detailArray[n]["size"]
				});
			}
		}
	}

	return {
		'total': companyTotal,
		'elements': companies
	};
}

function exportCsv (obj) {

	// var datas = obj.data;
	//处理字符串中的, "
	obj['data'] = obj['data'].map(function(elem) {

		if (elem['name'] && /[",\r\n]/g.test(elem['name'])) {
			elem['name'] = '"' + elem['name'].replace(/(")/g, '""') + '"';
		}


		if (elem['industry'] && /[",\r\n]/g.test(elem['industry'])) {
			elem['industry'] = '"' + elem['industry'].replace(/(")/g, '""') + '"';
		}

		if (elem['location'] && /[",\r\n]/g.test(elem['location'])) {
			elem['location'] = '"' + elem['location'].replace(/(")/g, '""') + '"';
		}

		if (elem['size'] && /[",\r\n]/g.test(elem['size'])) {
			elem['size'] = '"' + elem['size'].replace(/(")/g, '""') + '"';
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
}


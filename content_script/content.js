/**
 * [exportCsv 将对象导出为csv格式文件]
 * @param  {[obj]} obj  对象格式如下:
	{
		title:["title1","title2","title3"],
		titleForKey:["key1","key1",'key1'],
		data: dataLists,
		fileName: name
	}
 *
 */
var exportCsv = function(obj){

	// var datas = obj.data;
	//处理字符串中的, "
	obj['data'] = obj['data'].map(function(elem) {

		if (elem['name'] && /[",\r\n]/g.test(elem['name'])) {
			elem['name'] = '"' + elem['name'].replace(/(")/g, '""') + '"';
		}


		if (elem['title'] && /[",\r\n]/g.test(elem['title'])) {
			elem['title'] = '"' + elem['title'].replace(/(")/g, '""') + '"';
		}

		if (elem['comment'] && /[",\r\n]/g.test(elem['comment'])) {
			elem['comment'] = '"' + elem['comment'].replace(/(")/g, '""') + '"';
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

/**
 * [getHeaderCrsf 向background发送获取header的请求]
 * @return {objection} [返回promise]
 */
var getHeaderCrsf = function(){

	return new Promise(function(resolve, reject){

		chrome.runtime.sendMessage({getHeaderCrsf: true}, function(response) {
			if (response.length === 0) {
				reject();
				return;
			}

			console.log('getHeaderCrsf response:');
			console.log(response);

			resolve(response.headerCrsf);
		});

	});
};

/**
 * [getLikesRecord 通过api接口发送ajax请求获取likes数据]
 * @param  {object}   query    [query注意是ajax请求的参数,包括objId start count header]
 * @param  {Function} callback [ajax成功后的回调函数,处理返回的结果]
 * @return {[type]}            [description]
 */
var getLikesRecord = function(query){
	var url = query.url,
		_objectId = query.objId,
		_q = query.likes,
		_start = query.start,
		_count = query.count;

	return new Promise(function(resolve, reject) {
		//当异步代码执行成功时，调用resolve, 当异步代码失败时调用reject
		$.ajax({
			url: url,
			type: "GET",
			data: {
				'objectId': _objectId,
				'q': _q,
				'start': _start,
				'count': _count
			},
			beforeSend: function(xhr){
			    xhr.setRequestHeader('csrf-token', query.header);//这里设置header
			},
		}).done(function(msg) {
			resolve(msg);
		}).fail(function(msg) {
			console.log(msg);
			reject(msg);
		});
	});
};

/**
 * [getCommentsRecord 通过api接口发送ajax请求获取comments数据]
 * @param  {object}   query    [query注意是ajax请求的参数,包括objId start count header]
 * @param  {Function} callback [ajax成功后的回调函数,处理返回的结果]
 * @return {[type]}            [description]
 */
var getCommentsRecord = function(query){
	var url = query.url,
		_objectId = query.objId,
		_start = query.start,
		_count = query.count,
		_sort = 'REV_CHRON';

	return new Promise(function(resolve, reject) {
		//当异步代码执行成功时，调用resolve, 当异步代码失败时调用reject

		$.ajax({
			url: url,
			type: "GET",
			data: {
				'urn': _objectId,
				'sort': _sort,
				'start': _start,
				'count': _count
			},
			beforeSend: function(xhr){
			    xhr.setRequestHeader('csrf-token', query.header);//这里设置header
			},
		}).done(function(msg) {
			resolve(msg);
		}).fail(function(msg) {
			console.log(msg);
			reject(msg);
		});
	});
};

// result = res.elements
var handleLikesRes = function(result){
	var profile, name, title, publicIdentifier, link,
		lists= [];

	for (var i = 0; i < result.length; i++) {

		profile = result[i]['actor']['com.linkedin.voyager.feed.MemberActor'] || result[i]['actor']['com.linkedin.voyager.feed.InfluencerActor'];
		profile = profile['miniProfile'];

		name = profile.firstName + " " + profile.lastName;
		title = profile.occupation;
		publicIdentifier = profile.publicIdentifier;
		link = "https://www.linkedin.com/in/" + publicIdentifier;

		lists.push({'name':name, 'title': title, 'link':link, 'publicIdentifier': publicIdentifier});
	}

	return lists;
};

// result = res.elements
var handleCommentsRes = function(result){
	var profile, name, title, comment , link, createdDate,
		lists= [];

	for (var i = 0; i < result.length; i++) {
		profile = result[i]['commenter'],
		comment = result[i]['message'],
		createdDate = result[i]['createdDate'];

		name = profile.name;
		title = profile.headline;
		link = profile.publicProfileUrl;

		lists.push({'name':name, 'title': title, 'comment': comment, 'createdDate': createdDate,'link':link});
	}
	console.log(lists);

	return lists;
};

/**
 * [getLikesProfile 获取likes中成员信息, 利用promise串行和并行处理异步请求]
 * @param  {string} objId [由于js数值精度的问题, id以string形式传入]
 */
var getLikesProfile = function(objId){
	var url = "https://www.linkedin.com/voyager/api/feed/likes",
		objectId = "activity:" + objId,
		queryType = "likes",
		start = 0,
		count = 100;

	var query = {
			"url": url,
			"objId": objectId,
			"start": start,
			"count": count,
			"likes": queryType,
		};

	getHeaderCrsf()
		.then( //有时会无法获取header,待解决
			function(res){
				// doneCallbacks
				console.log(res);
				query["header"] = res;
				return getLikesRecord(query);
			}
		)
		.then(
			function(res) {
    			// console.log(res);

    			var rawElements  = res["elements"],
    				dataLists;

    			if (res.paging.total <= count) {

					dataLists= handleLikesRes(rawElements);

					exportCsv({
						title:["Name","Title","Link"],
						titleForKey:["name","title",'link'],
						data: dataLists,
						fileName: objId + "_likes",
				  	});

				  	return;
    			}

    			var likesTotal = res["paging"]["total"], //total=350
					likesPage = parseInt(likesTotal/count), //page=3
					likesRemainder  = likesTotal%count, //50
					requestArray = [];


				for (var i = 1; i <= likesPage; i++) {

					query["start"] = i*count;

					if (i == likesPage) {
						query["count"] = likesRemainder;
					}

					requestArray.push(getLikesRecord(query));
				}

				Promise.all(requestArray).then(function(res){

					for (var i = 0; i < res.length; i++) {
						rawElements = rawElements.concat(res[i]["elements"]);
					}

					dataLists= handleLikesRes(rawElements);
					exportCsv({
						title:["Name","Title","Link"],
						titleForKey:["name","title",'link'],
						data: dataLists,
						fileName: objId + "_likes",
				  	});
				});
  			}
  		);
};

/**
 * [getLikesProfile 获取comments中成员信息, 利用promise串行和并行处理异步请求]
 * @param  {string} objId [由于js数值精度的问题, id以string形式传入]
 */
var getCommentsProfile = function(objId){
	var url = "https://www.linkedin.com/pulse-fe/api/v1/comments",
		objectId = "urn:li:activity:" + objId,
		start = 0,
		count = 10;

	var query = {
			"url": url,
			"objId": objectId,
			"start": start,
			"count": count,
		};

	getCommentsRecord(query)
		.then(
			function(res){
    			var rawElements  = res["elements"],
    				dataLists;

    			if (res.paging.total <= count) {

					dataLists= handleCommentsRes(rawElements);

					exportCsv({
						title:["Name","Title","Comment","timestamp","Link"],
						titleForKey:["name","title","comment","createdDate",'link'],
						data: dataLists,
						fileName: objId + "_comments",
				  	});

				  	return;
    			}

    			var commentsTotal = res["paging"]["total"], //total=61
					commentsPage = parseInt(commentsTotal/count), //page=6
					commentsRemainder  = commentsTotal%count, //1
					requestArray = [];

				for (var i = 1; i <= commentsPage; i++) {

					query["start"] = i*count;

					if (i == commentsPage) {
						query["count"] = commentsRemainder;
					}

					requestArray.push(getCommentsRecord(query));
				}

				Promise.all(requestArray).then(function(res){

					for (var i = 0; i < res.length; i++) {
						rawElements = rawElements.concat(res[i]["elements"]);
					}

					dataLists= handleCommentsRes(rawElements);
					exportCsv({
						title:["Name","Title","Comment","timestamp","Link"],
						titleForKey:["name","title","comment","createdDate",'link'],
						data: dataLists,
						fileName: objId + "_comments",
				  	});
				});
			}
		);
};

//待删除
/*$(document).on('click', '.feed-s-likers-modal__likes-countttt', function(event) {
	event.preventDefault();
	console.log($(this));
	console.log(event.target);
	var $target = $(event.target),
		$parentNode = $target.parents('.modal-content-wrapper'),
		$nextNode = $parentNode.find('.feed-fe-modal__content');

	console.log($parentNode);

	console.log($nextNode);

	var lists = [],
		temp = [];

    var itmes = $nextNode.find('.actor-item');
    console.log(itmes);
    $.each(itmes, function(index, val) {
    	console.log(val);
    	var name = $(val).find('h3.name').text();
    	var title = $(val).find('p.headline').text();
    	// temp['name'] = name;
    	// temp['title'] = title;
    	// console.log(temp);
    	// lists.push(temp);

    	if (name && /[",\r\n]/g.test(name)) {
			name = '"' + name.replace(/(")/g, '""') + '"';
		}


		if (title && /[",\r\n]/g.test(title)) {
			title = '"' + title.replace(/(")/g, '""') + '"';
		}

    	lists.push({'name':name,'title': title});
    });

    console.log(lists);

	if (lists) {
		 exportCsv({
		      title:["Name","Title"],
		      titleForKey:["name","title"],
		      data: lists
		  });
	}
});

$(document).on('click', '.feed-s-likers-modal__likes-count', function(event) {
	var $target = $(event.target),
		$parentNode = $target.parents('.modal-content-wrapper'),
		$likes_list= $parentNode.find('ul.feed-s-likers-modal__actor-list'),
		$isLoader = $likes_list.children('li:last').children('span').is('.loader'),
		scrollHeight = $likes_list[0].scrollHeight,
		clientHeight = $likes_list[0].clientHeight,
		scrollTop = $likes_list[0].scrollTop,
		isLoaded = false;

	scroll();

	isAllLoaded();

	function scroll(){

		var isLoadSpan= $likes_list.children('li:last').children('span').is('.loader');

		if ( ($likes_list[0].scrollHeight > $likes_list[0].scrollTop + clientHeight + 1) || (isLoadSpan))
		{
			$likes_list[0].scrollTop = $likes_list[0].scrollHeight - clientHeight;

			setTimeout(scroll, 3000);
		}else{
			isLoaded = true;
		}
	}

	function isAllLoaded(){
		if (isLoaded) {
			exportRes();
		}else{
			setTimeout(isAllLoaded, 3000);
		}
	}

	function exportRes(){
    	console.log('导出结果');

    	var lists = [],
		temp = [];

	    var itmes = $likes_list.find('.actor-item');

	    $.each(itmes, function(index, val) {
	    	// console.log(val);
	    	var name = $(val).find('h3.name').text();
	    	var title = $(val).find('p.headline').text();

	    	if (name && /[",\r\n]/g.test(name)) {
				name = '"' + name.replace(/(")/g, '""') + '"';
			}


			if (title && /[",\r\n]/g.test(title)) {
				title = '"' + title.replace(/(")/g, '""') + '"';
			}

	    	lists.push({'name':name,'title': title});
	    });

		if (lists) {
			 exportCsv({
			      title:["Name","Title"],
			      titleForKey:["name","title"],
			      data: lists
			  });
		}

		}

});

$(document).on('click', "button[data-control-name='control_menu_copy_link']", function(event) {
	var $target = $(event.target),
		$clipboard = $('#clipboard-target'),
		url = $clipboard.text(),
		activityId = url.trim().substr(-19);

	console.log(activityId);

	// var notification = chrome.notifications.create("notificationId", {
	// 	type: 'basic',
	// 	iconUrl: 'assets/images/icon128.png',
	// 	title: 'crawl title',
	// 	message: 'crawl message',
	// 	buttons: 'button1',
	// }, function(id) {
	// 	// notification showed
	// });

	getLikesProfile(activityId);
	getCommentsProfile(activityId);
});*/
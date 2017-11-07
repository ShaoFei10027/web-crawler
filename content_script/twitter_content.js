(function() {
    var div = $('.original-permalink-page'),
        postContent = div.children('.permalink-tweet-container'),
        reliesContent = div.children('.permalink-replies');

    var btn = "<button id='crawlBtn'>Crawl<button>";
    $('#permalink-overlay').append(btn);


})();

$(document).ready(function() {
    $('#crawlBtn').click(function(event) {
        var $testDiv = $('#permalink-overlay-dialog').find('.permalink-tweet-container'),
        	noticeHtml = "<div id='crawlNoticeDiv'>Start to crawl!</div>";

       	$('#permalink-overlay').append(noticeHtml);

        console.log("click button");
        getTweetContent($testDiv).then( v => {
        	console.log(v);
        	var jsonText = JSON.stringify(v);
        	// console.log(jsonText);

        	console.log("Crawl Complete!download start:");
        	$("#crawlNoticeDiv").text('Download result...');
        	downloadFile(jsonText, v.item_id);
        	$("#crawlNoticeDiv").text('Complete crawl!');

        	setTimeout("$('#crawlNoticeDiv').remove()" , 3000);
        });

    });
});


async function getTweetContent(contentObj) {
	var $obj = contentObj,
		record;

	if ( ! $obj.hasClass('permalink-tweet-container')) {
		return;
	}

	console.log("tweet content start:");
	$("#crawlNoticeDiv").text('Crawling tweet content...');

	var $tweetDiv = $obj.children('.tweet'),
		$profileDiv = $tweetDiv.children('.content'),//作者信息
		$timeStamp = $profileDiv.find('.permalink-header .time .tweet-timestamp'),
		$textDIv = $tweetDiv.children('.js-tweet-text-container'),//推文内容
		$mediaDIv = $tweetDiv.children('.AdaptiveMediaOuterContainer'),//附加资源
		$statsDiv = $tweetDiv.children('.js-tweet-details-fixer'),//时间,转发,点赞
		$actionDiv = $tweetDiv.children('.stream-item-footer').children('.js-actions');//评论,转发,点赞等

	//获取作者信息
	var userProfile = $tweetDiv.data('reply-to-users-json')[0];
		// itemID = $tweetDiv.data('item-id'),
		// itemLink = tweetDiv.data('permalink-path'),

	record = {
		"item_id": $tweetDiv.data('item-id'),
		"item_link": $tweetDiv.data('permalink-path'),
		"user_id": $tweetDiv.data('user-id'),
		"user_screen_name": $tweetDiv.data('screen-name'),
		"user_name": $tweetDiv.data('name'),
		"timestamp": $timeStamp.children('.js-short-timestamp').data('time'),
		"time": $timeStamp.attr('title'),
	};

	//获取推文
	record["text"] = $textDIv.children('.js-tweet-text').contents().filter(function(){return this.nodeType == 3 || !this.classList.contains("u-hidden");}).text();
	// record["text"] = $textDIv.children('.js-tweet-text').contents().filter().text();

	//获取统计数据
	record["stats"]={};
	record["stats"]["reply"] = $actionDiv.find('.ProfileTweet-action--reply .ProfileTweet-actionCountForPresentation').first().text() || "0";
	record["stats"]["retwee"] = $actionDiv.find('.ProfileTweet-action--retweet .ProfileTweet-actionCountForPresentation').first().text() || "0";
	record["stats"]["favorite"] = $actionDiv.find('.ProfileTweet-action--favorite .ProfileTweet-actionCountForPresentation').first().text() || "0";

	var stats = await asyncGetStats(record.user_screen_name, record.item_id);

	Object.assign(record, stats);

	return record;
}

async function asyncGetStats(name, tweetId) {

	console.log("retweet start:");
	$("#crawlNoticeDiv").text('Crawling retweets...');
	var retweets = await getRetweets(tweetId);

	console.log("favorate start:");
	$("#crawlNoticeDiv").text('Crawling likes...');
	var favorites = await getFavorites(tweetId);

	console.log("comment start:");
	$("#crawlNoticeDiv").text('Crawling comments...');
	var comments = await getComments(name, tweetId);

	// console.log(retweets);
	// console.log(favorites);
	// console.log(comments);
	return {
		"retweets_count": retweets.length,
		"retweets": retweets,
		"favorites_count": favorites.length,
		"favorites": favorites,
		"comments_count": comments.length,
		"comments": comments
	};
}

async function getRetweets(tweetId) {
	var url = 'https://twitter.com/i/activity/retweeted_popup?id=' + tweetId,
		record;

	record = await myajax(url);

	return handleRetAndFav(record);
}

async function getFavorites(tweetId) {
	var url = 'https://twitter.com/i/activity/favorited_popup?id=' + tweetId,
		record;

	record = await myajax(url);

	return handleRetAndFav(record);
}

async function getComments(name, tweetId) {
	var url = 'https://twitter.com/i/' + name + '/conversation/' + tweetId,
		params = {
		    "include_available_features": 1,
		    "include_entities": 1,
		    "max_position": "",
		};

	var record, hasMore,
		result = [];

	do {

		record = await myajax(url, params);

		hasMore = record.descendants.has_more_items;
		let temp = handleComments(record.descendants.items_html);

		if (hasMore) {
			params["max_position"] = record.descendants.min_position;
		} else if (temp.ajaxParam) {
			hasMore = true;
			params["max_position"] = temp.ajaxParam;
		}

		result = result.concat(temp.lists);

	} while (hasMore);

	//删除第一条comments, 为作者本身
	result.splice(0, 1);

	return result;
}

function handleRetAndFav(html) {
	var $usersList = $(html.htmlUsers).children('.js-stream-item'),
		lists = [];

	$.each($usersList, function(index, val) {
		var $userDIv = $(val).children('.account');
		lists.push({
			"screen_name": $userDIv.data('screen-name'),
			"id": $userDIv.data('user-id'),
			"name": $userDIv.data('name')
		});
	});

	return lists;
}

function handleComments(html) {
	var $usersList = $(html).closest('.ThreadedConversation, .ThreadedConversation--loneTweet, .ThreadedConversation-showMoreThreads'),
		lists = [],
		ajaxParam;

	$.each($usersList, function(index, val) {
		var $comDiv = $(val),
			$userDiv, $text;

		if ($comDiv.hasClass('ThreadedConversation--loneTweet')) {
			$userDiv = $comDiv.find('.js-stream-tweet');
			$text = $userDiv.find('.js-tweet-text-container .js-tweet-text');

			lists.push({
				"screen_name": $userDiv.data('screen-name'),
				"id": $userDiv.data('user-id'),
				"name": $userDiv.data('name'),
				"text": $text.text(),
			});
		} else if ($comDiv.hasClass('ThreadedConversation')){
			$userDiv = $comDiv.find('.js-stream-tweet').first();
			$text = $userDiv.find('.js-tweet-text-container .js-tweet-text');

			lists.push({
				"screen_name": $userDiv.data('screen-name'),
				"id": $userDiv.data('user-id'),
				"name": $userDiv.data('name'),
				"text": $text.text(),
			});
		} else if ($comDiv.hasClass('ThreadedConversation-showMoreThreads')) {
			ajaxParam = $comDiv.children('.ThreadedConversation-showMoreThreadsButton').data('cursor');
		}
	});

	// console.log(lists);
	// console.log(ajaxParam);
	return {
		"lists": lists,
		"ajaxParam": ajaxParam
	};
}

function addURLParam(url, name, value) {
    url += (url.indexOf("?") == -1 ? "?" : "&");
    url += encodeURIComponent(name) + "=" + encodeURIComponent(value);
    return url;
}

function myajax(url, params) {

    var url;

    for (x in params)
    {
    	url = addURLParam(url, x, params[x]);
    }

    // url = addURLParam(url, "include_available_features", 1);
    // url = addURLParam(url, "include_entities", 1);
    // url = addURLParam(url, "include_available_features", false);
    // url = addURLParam(url, "max_position", "DAACDwABCgAAAA4MWG58J9QAAAxYbuahF1ACDFhuHH8XUAQMWHCFdhawAgxYs49P17AADFiqFp3XYAAMWH2MzRdgAQxYb8JglDAADFhvezfWsAQMWKTjF9dwAAxYbm7cl7AADFhzCgfVYAAMWHBlUJdgAQxYb0Dsl1ABCAADAAAAAQIABAAAAA");
    console.log(url);

    return new Promise((resolve) => {
		let xhr = new XMLHttpRequest();
		xhr.onload = function() {

		    let res;

		    if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {

		        res = JSON.parse(xhr.responseText);

		        resolve(res);

		    } else {
		        console.log("Request was unsuccessful: " + xhr.status);
		    }

		};
		xhr.open("get", url, true);
		xhr.send(null);
	});
}

function downloadFile (content, filename) {
    // 创建隐藏的可下载链接
    var eleLink = document.createElement('a');
    eleLink.download = filename+'.json';
    eleLink.style.display = 'none';
    // 字符内容转变成blob地址
    var blob = new Blob([content]);
    eleLink.href = URL.createObjectURL(blob);
    // 触发点击
    document.body.appendChild(eleLink);
    eleLink.click();
    // 然后移除
    document.body.removeChild(eleLink);
}
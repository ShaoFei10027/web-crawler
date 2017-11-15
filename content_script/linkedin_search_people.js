
(function(){
	console.log('初始化button');
    var btn = "<button id='crawlBtn'>↓</button><button id='opBtn' class='btn btn-primary'>op</button>";
    $('.search-typeahead-v2').append(btn);

    var form = 
			'<div id="addCrea" class="modal fade in" tabindex="-1" role="dialog" style="display: none;">'+
				'<div class="modal-dialog modal-lg">'+
					'<div class="modal-content">'+
						'<div class="modal-header">'+
							'<button type="button" class="close craw-btn-close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span></button>'+
							'<h4 class="modal-title" id="myModalLabel">Options</h4>'+
						'</div>'+
						'<div id="craw-input" class="modal-body tags-body">'+
							'<label>Please enter the start page</label><input type="number" id="craw-page-start" value="1">'+
							'<label>Please enter the end page</label><input type="number" id="craw-page-end" value="1">'+
						'</div>'+
						'<div id="craw-wait" class="modal-body tags-body" style="display: none;">'+
							'Please wait...'+
						'</div>'+
						'<div id="craw-res" class="modal-body tags-body" style="display: none;">'+
							'<textarea style="height: 150px;"></textarea>'+
						'</div>'+
						'<div class="modal-footer">'+
							'<button type="button" class="btn btn-default craw-btn-close" data-dismiss="modal">Close</button>'+
							'<button id="craw-submit" type="submit" class="btn btn-primary">Confirm</button>'+
						'</div>'+
					'</div>'+
				'</div>'+
			'</div>';

    $('body').append(form);

    downloadLink = "<a id='downloadLink' href='' download=''>down</a>";
	$('body').append(downloadLink);
})();

$(document).ready(function() {
	$("#craw-submit").html('Confirm');

	var keywords;
	var url = window.location.href;
	var reg = /craw=/g;
	var page, end, searchRes = {
		total: 0,
		rows: 'Name,Occupied,Location,company\n'
	};

	function init(){
		$("#craw-submit").html('Confirm');
		searchRes = {
			total: 0,
			rows: 'Name,Occupied,Location,company\n'
		};
	}

	$('#crawlBtn').click(function(event) {
		init();
		event.preventDefault();
		console.log('click btn');

		keywords = $('.search-typeahead-v2 input').val();

		if (!keywords) {
			alert("Please enter keywords!");
			return;
		}
		$("#addCrea, #craw-wait").show();
		$("#craw-input, #craw-res").hide();
		end = 1;
		getData(1);
	});

	

	/*if(cookies('get')){
		page = url.split('&page=').pop();
		page = page.split('&').shift();
		end = url.split('&craw=').pop();

		$("#addCrea, #craw-wait").show();
		$("#craw-input, #craw-res").hide();

		getData(page);
	}*/


	$('#opBtn').click(function(event) {
		init();
		event.preventDefault();
		console.log('click btn');

		keywords = $('.search-typeahead-v2 input').val();

		if (!keywords) {
			alert("Please enter keywords!");
			return;
		}
		$("#addCrea, #craw-input").show();
		$("#craw-res, #craw-wait").hide();
	});

	$("#craw-submit").on("click",async function(){
		if($(this).html() == 'Confirm'){
			var start = $("#craw-page-start").val();
			var end = $("#craw-page-end").val();
			
			var craw = await cookies('set', start, end);
			console.log(craw)

			var url = window.location.href;
			var reg = /page=/g;
			if(reg.test(url)){
				url = url.replace(/page=[0-9]+/, 'page=' + start);
			}else{
				url = url + '&page=' + start;
				if(start - 1 === 0){
					hascookies(cookies);
					return;
				}
			}
			
			window.location.href = url;	
		}else if($(this).html() == 'ExportCsv'){
			console.log(searchRes.rows);
			var downloadLink = document.getElementById('downloadLink');
			downloadLink.download = keywords + ".csv"; // 下载的文件名称
			// downloadLink.href = encodeURI("data:text/csv;charset=utf-8,\ufeff" + searchRes.rows);
			
			
			$('#downloadLink').off('click').on('click', function(){
				this.href = 'data:attachment/csv;charset=utf-8,' + '\uFEFF' + encodeURIComponent(searchRes.rows);
			});

			$('#downloadLink').trigger('click');
			
		}
		
	});

	$(".craw-btn-close").on('click', function(){
		$("#addCrea").hide();
	});

	function getData(pagenum){
		var height = 50;
		$(document).scrollTop(0);
		var clock = setInterval(function(){
			var H = $(document).scrollTop();
			var Hnew = H + height;
			$(document).scrollTop(Hnew);

			if((Hnew - $(document).scrollTop()) > 10){
				clearInterval(clock);
				var pre = JSON.parse(JSON.stringify(searchRes));
				
					//console.log(pagenum,searchRes.total,pre.total);
					
					$("li.search-result__occluded-item").each(function(){
						if($(this).find("span.name-and-icon span").html()){
							var occupiedArr = $.trim($(this).find("p.subline-level-1").html().replace(/,/g,'，')).split(' at ');
							searchRes.rows +=
								$.trim($(this).find("span.name-and-icon span").html().replace(/,/g,'，')) + ',' +
								occupiedArr[0] + ',' +
								$.trim($(this).find("p.subline-level-2").html().replace(/,/g,'，')) + ',';
							searchRes.total = searchRes.total + 1;

							if(occupiedArr[1]){
								searchRes.rows += occupiedArr[1] + '\n';
							}else if($(this).find("p.subline-level-2").next('p').html()){
								searchRes.rows +=
								$.trim($(this).find("p.subline-level-2").next('p').html().replace(/,/g,'，')).split(' at ')[1] + '\n';
							}else{
								searchRes.rows += ' \n';
							}
						}
					});
				
				if((searchRes.total - pre.total) !== 10 && (end - 1) !== 0){
					searchRes = JSON.parse(JSON.stringify(pre));
					pagenum--;
				}
				console.log(pagenum,searchRes.total,pre.total);
				pagenum++;
				
				if(pagenum > end){
					var resstr = searchRes.rows;
					$("#craw-res").show().find('textarea').val(resstr);
					console.log(resstr);
					$("#craw-input, #craw-wait").hide();
					$("#craw-res textarea")[0].select();
					$("#craw-submit").html('ExportCsv');
					
				}else{
					if((searchRes.total - pre.total) == 10){
						$("button.next").trigger('click');
					}
					
					var wait = setInterval(function(){
						var url = window.location.href;
						url = parseInt(url.split('page=')[1]);
						if(!url)url=1;
						if(url == pagenum){
							clearInterval(wait);
							getData(pagenum);
						}
					}, 100);
				}
				
			}
		},50);
		

		return;
		/*$("#crawlDiv").css("display","block").html(JSON.stringify(res));
		$("#crawlDiv")[0].select();
		document.execCommand("Copy");
		setTimeout(function(){
			$("#crawlDiv").css("display","none");
		},8000);
		alert("已将内容复制到剪贴板");*/
	}



	function cookies(op, start, end){

		return new Promise(function(resolve, reject){

			chrome.runtime.sendMessage({cookies: op, start: start, end: end}, function(response) {
				if (!response) {
					reject();
					return;
				}

				console.log('cookies response:', response);

				resolve(response);
				if(op === 'get')cookies('remove');
			});

		});
	}

	async function hascookies(func){
		var res = await func('get');
		console.log(cookies);
		if(res.cookies){
			var cookies = res.cookies.value.split('-');

			page = cookies[0];
			end = cookies[1];

			$("#addCrea, #craw-wait").show();
			$("#craw-input, #craw-res").hide();

			getData(page);
		}
		return;
		
	}

	hascookies(cookies);
});
//keywords=HEINEKEN&origin=GLOBAL_SEARCH_HEADER&q=blended
/*
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

*/
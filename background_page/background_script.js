var headers_csrf;

console.log(headers_csrf);
if (!headers_csrf) {
    chrome.webRequest.onBeforeSendHeaders.addListener(
    function(res) {

        var url = decodeURIComponent(res.url),
            headers = res.requestHeaders;

        for( obj in headers)
        {
            if (headers[obj]["name"] == "Csrf-Token") {
                headers_csrf = headers[obj]["value"];
            }
        }
    },
    {
        //url filters
        urls: ["http://www.linkedin.com/voyager/api/*"],
    },
    // extraInfoSpec
    ["blocking","requestHeaders"]
);
}
console.log(headers_csrf);
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.getHeaderCrsf) {
            sendResponse({headerCrsf: headers_csrf});
            //return true;
        }
        if (request.cookies === 'set') {
            chrome.cookies.set({
                url: "http://www.linkedin.com/search/results/people/",
                name: "craw",
                value: request.start + '-' + request.end
            }, function(cookies){
                sendResponse({
                    cookies: cookies
                });
            });
            //return true;
        }else if (request.cookies === 'get') {
            chrome.cookies.get({
                url: "http://www.linkedin.com/search/results/people/",
                name: "craw"
            }, function(cookies){
                sendResponse({
                    cookies: cookies
                });
            });
        }else if (request.cookies === 'remove') {
            chrome.cookies.remove({
                url: "http://www.linkedin.com/search/results/people/",
                name: "craw"
            }, function(){
                sendResponse({remove: true});
            });
        }

        return true;
});

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
        urls: ["https://www.linkedin.com/voyager/api/*"],
    },
    // extraInfoSpec
    ["blocking","requestHeaders"]
);
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log(headers_csrf);
        if (request.getHeaderCrsf) {
            sendResponse({headerCrsf: headers_csrf});
            return true;
        }
});

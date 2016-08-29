console.log("Start Crawling.");
/* Listen for messages */
var dispatchMouseEvent = function(target, var_args) {
    var e = document.createEvent("MouseEvents");
    // If you need clientX, clientY, etc., you can call
    // initMouseEvent instead of initEvent
    e.initEvent.apply(e, Array.prototype.slice.call(arguments, 1));
    target.dispatchEvent(e);
};

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action_type) {
            if (request.action_type == "get_dom") {
                console.log("Received get_dom request");
                sendResponse({data: document.getElementsByTagName('html')[0].innerHTML});
            } else if (request.action_type == "sim_scroll") {
                console.log("Received sim_scroll request");
                // Get the next-page link
                var nextPage = $("table.outerTable:first tbody td:first a:last");
                var currPage = $("table.outerTable:first tbody td:first b:first");
                dispatchMouseEvent(nextPage[0], 'click', true, true);
                sendResponse({currPage: currPage[0].innerText});
            } else if (request.action_type == "sim_click") {
                if (request.click_what) {
                    request.click_what = $(request.click_what)[0];
                    console.log("Sim Click", request.click_what);
                    dispatchMouseEvent(request.click_what, 'click', true, true);
                    sendResponse({data: "Complete Clicking" + request.click_what.innerHTML});
                }
            }
        }
});

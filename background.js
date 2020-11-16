browser.runtime.onMessage.addListener(onReceived);

var enabled = true;

browser.storage.local.set({ 'enabled': enabled });

const pattern = "<all_urls>";
let lastClickedLink = null;

function onReceived(message) {
    if (message.id === 1) {
        console.log(`Clicked link: ${message.url}`);
        lastClickedLink = message.url;
    } else if (message.id == 'enableDisable') {
        enabled = !enabled;
        browser.storage.local.set({ 'enabled': enabled });
    }
}

function redirect(requestDetails) {
    console.log(`Redirecting url: ${requestDetails.url}`);
    if (lastClickedLink === requestDetails.url) {
        console.log("Cancelling request.");
        lastClickedLink = null;
        browser.tabs.query({
            currentWindow: true,
            active: true
        }).then(tabs => sendMessageToTabs(tabs, requestDetails)).catch(onError);
        return {"cancel": true};
    } else {
        return {"cancel": false};
    }
}

function onError(error) {
    console.error(`Error: ${error}`);
}

function sendMessageToTabs(tabs, requestDetails) {
    for (let tab of tabs) {
        browser.tabs.sendMessage(
            tab.id,
            {
                "id": 0,
                "url": requestDetails.url
            }
        );
    }
}

browser.webRequest.onBeforeRequest.addListener(
    redirect,
    {urls: [pattern]},
    ["blocking"]
);



// https://usamaejaz.com/bypassing-security-iframe-webextension/
browser.webRequest.onHeadersReceived.addListener(info => {
    const headers = info.responseHeaders; // original headers
    for (let i=headers.length-1; i>=0; --i) {
        let header = headers[i].name.toLowerCase();
        if (header === "x-frame-options" || header === "frame-options") {
            headers.splice(i, 1); // Remove the header
        }
    }
    // return modified headers
    return {responseHeaders: headers};
}, {
    urls: [ "<all_urls>" ], // match all pages
    types: [ "sub_frame" ] // for framing only
}, ["blocking", "responseHeaders"]);

browser.webRequest.onHeadersReceived.addListener(info => {
    const headers = info.responseHeaders; // original headers
    for (let i=headers.length-1; i>=0; --i) {
        let header = headers[i].name.toLowerCase();
        if (header === "content-security-policy") { // csp header is found
            // modifying frame-ancestors; this implies that the directive is already present
            //headers[i].value = headers[i].value.replace("frame-ancestors", "frame-ancestors https://yourpage.com/");
            headers.splice(i, 1); // Remove the header
        }
    }
    // return modified headers
    return {responseHeaders: headers};
}, {
    urls: [ "<all_urls>" ], // match all pages
    types: [ "sub_frame" ] // for framing only
}, ["blocking", "responseHeaders"]);

browser.runtime.onMessage.addListener(onReceived);

const pattern = "<all_urls>";
let lastClickedLink = null;

function onReceived(message) {
    if (message.id === 1) {
        console.log(`Clicked link: ${message.url}`);
        lastClickedLink = message.url;
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
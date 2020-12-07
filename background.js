browser.runtime.onMessage.addListener(onReceived);

let enabled = true;

browser.storage.local.set({'enabled': enabled}).then(r => console.log(r));

const trees = {};

const pattern = "<all_urls>";
let lastClickedLink = null;
let needsScreenshot = new Map();

function printTree(tree) {
    if (tree == null) {
        console.log('tree is null');
        return;
    }
    let result = '';
    function iterator(node) {
        let depth = "", i;
        if (node.depth === 0) {
            result += node.data.url + '\r\n';
        } else {
            for (i = 1; i <= node.depth; i++) depth += ">";
            result += ([depth, node.data.url].join(" ")) + '\r\n';
        }
    }
    tree.traverseDown(iterator);
    return result;
}

function onReceived(message, sender, sendResponse) {
    let tabId;
    switch (message.id) {
        case 'enableDisable':
            enabled = !enabled;
            browser.storage.local.set({'enabled': enabled}).then(r => console.log(r));
            break;
        case 'linkClicked':
            console.log(`Tab ${sender.tab.id} clicked link from ${message.sourceUrl} to ${message.targetUrl}`);
            lastClickedLink = message.targetUrl;
            handleLinkClick(sender.tab, message.sourceUrl, message.targetUrl);
            break;
        case 'getTreeForTab':
            tabId = message.tabId;
            if (!(tabId in trees))
                sendResponse('Error: No tree found for this tab...');
            sendResponse(printTree(trees[tabId]));
            break;
        case 'iframeCreated':
            console.log(`Waiting for ${message.url} to load...`);
            needsScreenshot.set(message.url, message.boundingBox);
            break;
        default:
            console.log(`Unknown message id: ${message.id}`);
    }
}

function handleLinkClick(tab, sourceUrl, targetUrl) {
    let tree;
    if (!(tab.id in trees)) {
        initializeTree(tab.id, sourceUrl);
    }
    tree = trees[tab.id];
    console.log('Old tree:');
    console.log(printTree(tree));
    // TODO: This doesn't work if there is another node with the same URL. EX: you navigate on Wikipedia
    //       from Bird -> Feather -> Bird -> Wing
    const srcNode = tree.find(function (node) { return node.data.url === sourceUrl; });
    if (srcNode == null) {
        console.log('Error: could not find source node for link click');
        return;
    }
    console.log(`Current node:\n\turl: ${srcNode.data.url}\n\timage: ${srcNode.data.imageUri}`);
    // don't open duplicate child windows within a parent
    for (const node of srcNode.children) {
        if (node.data.url === targetUrl) {
            console.log('Not opening new child window since it already exists within this window.');
            return;
        }
    }
    srcNode.appendChild({ 'url': targetUrl });
    console.log(`Asking tab ${tab.id} to open ${targetUrl}`);
    browser.tabs.sendMessage(tab.id, {
        'id': 'openIFrame',
        'targetUrl': targetUrl,
        'upThumbnail': srcNode.data.imageUri
    }).then(r => console.log(r));
    console.log('New tree:');
    console.log(printTree(tree));
}

function initializeTree(tabId, url, imageUri) {
    if (imageUri) {
        trees[tabId] = new Arboreal(null, {'url': url, 'imageUri': imageUri});
    } else {
        trees[tabId] = new Arboreal(null, {'url': url});
    }
}

function onError(error) { console.error(`Error: ${error}`); }

function webRequestHandler(requestDetails) {
    console.log(`Requested url: ${requestDetails.url}`);
    if (lastClickedLink === requestDetails.url) {
        lastClickedLink = null;
        console.log("Cancelling request.");
        return {"cancel": true};
    } else {
        return {"cancel": false};
    }
}

browser.webRequest.onBeforeRequest.addListener(
    webRequestHandler,
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

// Initialize state on page load completed
browser.webNavigation.onCompleted.addListener(details => {
    // Initialize tree if it doesn't already exist
    if (!(details.tabId in trees)) {
        browser.tabs.captureVisibleTab()
            .then(imageUri => {
                console.log(`Setting data for tab ${details.tabId} with url ${details.url} and image ${imageUri}`);
                initializeTree(details.tabId, details.url, imageUri);
            }, onError);
    } else {
        console.log(`Searching for url ${details.url}...`);
        console.log(needsScreenshot);
        for (let [key, value] of needsScreenshot.entries()) {
            console.log(key + "===" + details.url);
            if (key === details.url) {
                console.log("Waiting for iframe capture...");
                browser.tabs.captureVisibleTab(browser.windows.WINDOW_ID_CURRENT, {
                    rect: {
                        x: value.x,
                        y: value.y,
                        width: value.width,
                        height: value.height
                    }
                }).then(imageUri => {
                    console.log("Capturing iframe");
                    const node = trees[details.tabId].find(function (node) {
                        return node.data.url === details.url;
                    });
                    node.data.imageUri = imageUri;
                }, onError);
                break;
            }
        }
        needsScreenshot.delete(details.url);
    }
});

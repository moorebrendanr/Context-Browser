browser.runtime.onMessage.addListener(onReceived);

var enabled = true;

browser.storage.local.set({ 'enabled': enabled });

var trees = {};

const pattern = "<all_urls>";
let lastClickedLink = null;

function printTree(tree) {
    function iterator(node) {
        var depth = "", i;
        for (i = 1; i <= node.depth; i++) depth += ">";
        console.info([depth, node.data.url].join(" "));
    }
    tree.traverseDown(iterator);
}

function onReceived(message, sender, sendResponse) {
    if (message.id == 'enableDisable') {
        enabled = !enabled;
        browser.storage.local.set({ 'enabled': enabled });
    } else if (message.id === 'linkClicked') {
        console.log(`Tab ${sender.tab.id} clicked link from ${message.sourceUrl} to ${message.targetUrl}`);
        lastClickedLink = message.targetUrl;
        handleLinkClick(sender.tab, message.sourceUrl, message.targetUrl, sendResponse);
    }
}

function handleLinkClick(tab, sourceUrl, targetUrl, sendResponse) {
    let tree = null;
    if (!(tab.id in trees)) {
        // The user opened a new tab, went to page A, and clicked on a link going to page B.
        // A tree does not exist for this, so initialize it.
        trees[tab.id] = new Arboreal();
        tree = trees[tab.id];
        tree.appendChild({ 'url': sourceUrl });
    }
    printTree(tree);
    const srcNode = tree.find(function (node) { return node.data.url === sourceUrl; });
    if (srcNode == null) {
        console.log('Error: could not find source node for link click');
        return;
    }
    // TODO: don't open pip window if it already exists
    srcNode.appendChild({ 'url': targetUrl });
    console.log(`Asking tab ${tab.id} to open ${targetUrl}`);
    //lastClickedLink = null;
    browser.tabs.sendMessage(tab.id, {
        'id': 'openIFrame',
        'targetUrl': targetUrl
    });
    //lastClickedLink = targetUrl;
};



function onError(error) { console.error(`Error: ${error}`); }

function webRequestHandler(requestDetails) {
    console.log(`Requested url: ${requestDetails.url}`);
    if (lastClickedLink === requestDetails.url) {
        console.log("Cancelling request.");
        lastClickedLink = null;
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

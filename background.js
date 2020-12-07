console.log(nanoid());

browser.runtime.onMessage.addListener(onReceived);

let enabled = true;
let windowId = 0;

async function initLocalStorage() {
    await browser.storage.local.get('enabled').then(data => {
        if ('enabled' in data)
            enabled = data['enabled'];
        else
            browser.storage.local.set({'enabled': enabled});
    });
    await browser.storage.local.get('windowId').then(data => {
        if ('windowId' in data)
            windowId = data['windowId'];
        else
            browser.storage.local.set({'windowId': windowId});
    });
    await browser.storage.local.get('saves').then(data => {
        if (!('saves' in data))
            browser.storage.local.set({'saves': []});
    });
}
initLocalStorage();

function getNewWindowId() {
    // JS 'integers' can safely increment to (2^53)-1 ≈ 9 quadrillion
    // so no need for any sort of overflow detection/handling
    browser.storage.local.set({'windowId': ++windowId});
    return windowId;
}

const trees = {};

const pattern = "<all_urls>";
let lastClickedLink = null;
let needsScreenshot = new Map();

function printTree(tree) {
    if (tree == null) {
        return 'tree is null';
    }
    let result = '';
    function iterator(node) {
        let depth = "", i;
        if (node.depth === 0) {
            result += node.data.url + '\r\n';
        } else {
            for (i = 1; i <= node.depth; i++) depth += ">";
            result += `${depth} ${node.data.id} ${node.data.url}\r\n`
        }
    }
    tree.traverseDown(iterator);
    return result;
}

function onReceived(message, sender, sendResponse) {
    let tabId;
    if ('tab' in sender)
        tabId = sender.tab.id;
    switch (message.id) {
        case 'clearLocalStorage':
            browser.storage.local.clear();
            initLocalStorage().then(() =>
                browser.runtime.sendMessage({ 'id': 'popupRefresh' }));
            break;
        case 'enableDisable':
            enabled = !enabled;
            browser.storage.local.set({'enabled': enabled});
            break;
        case 'linkClicked':
            console.log(`Tab ${sender.tab.id} clicked link from ${message.sourceUrl} to ${message.targetUrl}`);
            lastClickedLink = message.targetUrl;
            let newWindowData = handleLinkClick(sender.tab, message.sourceUrl, message.targetUrl);
            if (newWindowData !== null) {
                console.log(`Asking tab ${sender.tab.id} to open ${message.targetUrl}`);
                sendResponse(newWindowData);
            }
            break;
        case 'getTreeForTab':
            let tabIdToGet = message.tabId;
            if (!(tabIdToGet in trees))
                sendResponse('Error: No tree found for this tab...');
            sendResponse(printTree(trees[tabId]));
            break;
        case 'iframeCreated':
            console.log(`Waiting for ${message.url} to load...`);
            needsScreenshot.set(message.url, message.boundingBox);
            break;
        case 'iframeClosed':
            deleteIframe(tabId, message.windowId);
            break;
        case 'saveCurrentTab':
            browser.tabs.query({currentWindow: true, active: true}).then((tabs) => {
                addSave(tabs[0]).then(() => {
                    browser.runtime.sendMessage({ 'id': 'popupRefresh' })
                });
            });
            // send response when done so the popup knows to refresh the save list
            break;
        default:
            console.log(`Unknown message id: ${message.id}`);
    }
}

// check whether a new window should be created
// returns either null or the data required for a new window
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
    // Update this to use window IDs instead of URLs
    const srcNode = tree.find(function (node) { return node.data.url === sourceUrl; });
    if (srcNode == null) {
        console.log('Error: could not find source node for link click');
        return null;
    }
    console.log(`Current node:\n\turl: ${srcNode.data.url}\n\timage: ${srcNode.data.imageUri}`);
    // don't open duplicate child windows within a parent
    for (const node of srcNode.children) {
        if (node.data.url === targetUrl) {
            console.log('Not opening new child window since it already exists within this window.');
            return null;
        }
    }
    let newWindowId = getNewWindowId();
    srcNode.appendChild({
        'url': targetUrl,
        'id': newWindowId
    });
    return {
        'id': 'openIFrame',
        'windowId': newWindowId,
        'targetUrl': targetUrl,
        'upThumbnail': srcNode.data.imageUri
    };
}

function initializeTree(tabId, url, imageUri) {
    let newNode = {};
    Object.assign(newNode,
        { 'url': url },
        { 'id': getNewWindowId() },
        imageUri ? { 'imageUri' : imageUri } : null);
    console.log(newNode);
    trees[tabId] = new Arboreal(null, newNode);
}

function deleteIframe(tabId, windowId) {
    if (!(tabId in trees))
        return;
    let tree = trees[tabId];
    console.log(`Deleting window ${windowId} from tab ${tabId}`);
    tree.traverseDown(item => {
        if (item.data.id === windowId) {
            item.remove();
            return false;
        }
    });
}

function getSaves() {
    browser.storage.local.get('saves').then(data => {
        return data.saves;
    });
}

async function addSave(tab) {
    console.log(`adding save for tab ${tab.id}`);
    if (!(tab.id in trees))
        return;

    let tree = trees[tab.id];

    let numNodes = 0;
    tree.traverseDown((node) => { ++numNodes; });

    let screenshot = await browser.tabs.captureVisibleTab();

    let newSave = {
        'id': nanoid(),
        'url': tab.url,
        'faviconUrl': tab.favIconUrl,
        'tree': tree,
        'date': new Date(),
        'numNodes': numNodes,
        'screenshot': screenshot
    };

    let data = await browser.storage.local.get('saves');
    let saves = data.saves;
    saves.push(newSave);
    await browser.storage.local.set({'saves': saves});
    console.log('Save added');
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

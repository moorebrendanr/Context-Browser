browser.runtime.onMessage.addListener(onReceived);

window.addEventListener("click", notifyLinkClicked);

$("a")
    .attr("target", "_self") // Prevent links from opening in new tab
    .removeAttr("onmousedown"); // Prevent google from messing up our plugin

// Map each url string to an object consisting of a containerId (the iframe's container) 
// and a minimizedId (the minimized button for that iframe)
// {url: {containerId, minimizedId}}
const iframes = new Map();

function onReceived(message, sender, sendResponse) {
}

/**
 * Create a PiP view associated with a certain link element on the page.
 */
function createIframe(data) {
    let url = data.targetUrl;
    let upThumbnail = data.upThumbnail;
    let windowId = data.windowId;

    console.log("Creating iframe with id " + windowId);
    let containerId = "linkPreviewContainer" + windowId;

    // Create the containing div
    let div = document.createElement("div");
    div.id = containerId;
    div.classList.add("linkPreviewContainer");
    div.onclick = function() {
        // Bring selected element to front
        $(".linkPreviewContainer").each(function(index, element) {
            if (element.isSameNode(div)) {
                $(element).css({
                    "z-index": 1000005
                });
            } else {
                $(element).css({
                    "z-index": 1000000
                });
            }
        });
    };

    // create the iframe
    let iframe = document.createElement("iframe");
    iframe.ctxBrowserId = windowId;
    iframe.src = url;
    iframe.classList.add("linkPreviewIframe");

    // create the header bar
    let headerBar = document.createElement("div");
    headerBar.classList.add("headerBar");

    // create the button container
    let btnContainer = document.createElement("div");
    btnContainer.classList.add("btnContainer");

    // Create the minimized button
    let minimized = document.createElement("button");
    let minimizedId = "minimized" + windowId;
    minimized.id = minimizedId;
    minimized.type = "button";
    minimized.innerHTML = "+";
    minimized.style.display = "none";
    minimized.style.backgroundColor = "red";
    minimized.onclick = function () {
        this.style.display = "none";
        div.style.display = "block";
    };
    let element = $(`.userClicked${windowId}`)[0];
    insertAfter(minimized, element);

    // create the close button
    let btnClose = document.createElement("button");
    btnClose.type = "button";
    btnClose.classList.add("btnClose", "windowButton");
    btnClose.onclick = function () {
        div.remove();
        iframes.delete(url);
        browser.runtime.sendMessage({
            'id': 'iframeClosed',
            'windowId': windowId
        });
    };

    // create the minimize button
    let btnMin = document.createElement("button");
    btnMin.type = "button";
    btnMin.classList.add("btnMin", "windowButton");
    btnMin.onclick = function () {
        console.log("minimize clicked");
        div.style.display = "none";
        minimized.style.display = "inline";
    };

    // create the maximize button
    let btnMax = document.createElement("button");
    btnMax.type = "button";
    btnMax.classList.add("btnMax", "windowButton");
    btnMax.onclick = function () {
        let currentlyMaximized = (div.clientHeight >= 0.90 * window.innerHeight && div.clientWidth >= 0.90 * window.innerWidth);
        if (currentlyMaximized) {
            div.style.width = '50%';
            div.style.height = '50%';
            div.style.top = '10px';
            div.style.left = '10px';
            let url = browser.runtime.getURL("icons/maximize_26px.png");
            btnMax.style.backgroundImage = `url(${url})`;
        } else {
            div.style.width = '100%';
            div.style.height = '100%';
            div.style.top = '0';
            div.style.left = '0';
            let url = browser.runtime.getURL("icons/restore_down_26px.png");
            btnMax.style.backgroundImage = `url(${url})`;
        }
    };

    // put the elements together
    btnContainer.appendChild(btnMin);
    btnContainer.appendChild(btnMax);
    btnContainer.appendChild(btnClose);
    headerBar.appendChild(btnContainer);
    div.appendChild(headerBar);
    div.appendChild(iframe);
    if (upThumbnail) {
        console.log("Setting up thumbnail");
        let thumbnailImg = document.createElement("img");
        thumbnailImg.classList.add("upThumbnail");
        thumbnailImg.src = upThumbnail;
        div.appendChild(thumbnailImg);
    }
    document.body.appendChild(div);

    // Add the ids to the map
    let pair = {containerId: containerId, minimizedId: minimizedId};
    iframes.set(url, pair);

    dragElement(div);
    setResizable(div);
    notifyIframeCreated(url, iframe.getBoundingClientRect())
}

function notifyIframeCreated(url, boundingBox) {
    browser.runtime.sendMessage({
        "id": "iframeCreated",
        "url": url,
        "boundingBox": boundingBox
    })
}

function notifyLinkClicked(e) {
    let el = e.target;
    while (el.tagName !== "A" && el !== el.parentNode) {
        el = el.parentNode;
        if (el == null) break;
    }
    // don't trigger on JS action hrefs, such as javascript:void(0)
    if (el != null && !el.href.startsWith('javascript:') && el.tagName === "A") {
        browser.storage.local.get('enabled').then(data => {
            if (data['enabled'])
                handleLinkClick(el)
        });
    }
}

function handleLinkClick(el) {
    console.log('Link clicked');
    browser.runtime.sendMessage({
        'id': 'linkClicked',
        'sourceUrl': document.location.href,
        'targetUrl': el.href,
        'linkText': el.textContent
    }).then(r => {
        el.classList.add("userClicked" + r.windowId);
        createIframe(r);
    });
}

function setResizable(el) {
    console.log("set resizable");
    // https://stackoverflow.com/a/22720042
    $(el).resizable({
        start: function (event, ui) {
            ui.element.append($("<div/>", {
                id: "iframe-barrier",
                css: {
                    position: "absolute",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    "z-index": 10
                }
            }));
        },
        stop: function (event, ui) {
            $("#iframe-barrier", ui.element).remove();
            $("iframe", ui.element).css({
                width: "100%",
                height: "calc(100% - 20px)"
            });
        },
        resize: function (event, ui) {
            $("iframe", ui.element).width(ui.size.width).height(ui.size.height - 20); // leave room for the header bar
        }
    });
}

// https://www.w3schools.com/howto/howto_js_draggable.asp
function dragElement(elmnt) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    elmnt.firstChild.onmousedown = dragMouseDown;
    let iframeBarrier;

    function dragMouseDown(e) {
        console.log("header clicked");
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        iframeBarrier = $("<div/>", {
            id: "iframe-barrier",
            css: {
                position: "absolute",
                top: 20,
                right: 0,
                bottom: 0,
                left: 0,
                "z-index": 10,
                cursor: "move"
            }
        })[0];
        elmnt.appendChild(iframeBarrier);
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
        if (iframeBarrier != null) {
            iframeBarrier.remove();
        }
    }
}

// https://stackoverflow.com/a/4793630
function insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

browser.runtime.onMessage.addListener(onReceived);

window.addEventListener("click", notifyLinkClicked);

$("a")
    .attr("target", "_self") // Prevent links from opening in new tab
    .removeAttr("onmousedown"); // Prevent google from messing up our plugin

// Map each url string to an object consisting of a containerId (the iframe's container) 
// and a minimizedId (the minimized button for that iframe)
// {url: {containerId, minimizedId}}
const iframes = new Map();
let idModifier = 0;

function onReceived(message, sender, sendResponse) {
    if (message.id === 'openIFrame') {
        sendResponse({});
        console.log("Received image: "+message.upThumbnail);
        createIframe(message.targetUrl, message.upThumbnail);
    }
}

/**
 * Create a PiP view associated with a certain link element on the page.
 */
function createIframe(url, upThumbnail) {
    console.log("Creating iframe");
    let containerId = "linkPreviewContainer" + idModifier;

    // Create the containing div
    let div = document.createElement("div");
    div.id = containerId;
    div.classList.add("linkPreviewContainer");

    // create the iframe
    let iframe = document.createElement("iframe");
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
    let minimizedId = "minimized" + idModifier;
    minimized.id = minimizedId;
    minimized.type = "button";
    minimized.innerHTML = "+";
    minimized.style.display = "none";
    minimized.style.backgroundColor = "red";
    minimized.onclick = function () {
        this.style.display = "none";
        div.style.display = "block";
    };
    let element = $(`.userClicked${idModifier}`)[0];
    insertAfter(minimized, element);

    // create the close button
    let btnClose = document.createElement("button");
    btnClose.type = "button";
    btnClose.classList.add("btnClose", "windowButton");
    btnClose.onclick = function () {
        div.remove();
        iframes.delete(url);
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
    idModifier++;
    notifyIframeCreated(url, iframe.getBoundingClientRect())
}

function notifyIframeCreated(url, boundingBox) {
    browser.runtime.sendMessage({
        "id": "iframeCreated",
        "url": url,
        "boundingBox": boundingBox
    }).then(r => console.log(r))
}

function notifyLinkClicked(e) {
    let el = e.target;
    while (el.tagName !== "A" && el !== el.parentNode) {
        el = el.parentNode;
        if (el == null) break;
    }
    if (el != null && el.tagName === "A") {
        browser.storage.local.get('enabled').then(data => {
            if (data['enabled'])
                handleLinkClick(el)
        });
    }
}

function handleLinkClick(el) {
    console.log('Link clicked');
    // give the element a unique class to find it later
    el.classList.add("userClicked" + idModifier);
    browser.runtime.sendMessage({
        "id": 'linkClicked',
        "sourceUrl": document.location.href,
        "targetUrl": el.href
    }).then(r => console.log(r));
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

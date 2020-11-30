browser.runtime.onMessage.addListener(onReceived);

window.addEventListener("click", notifyLinkClicked);

$("a")
    .attr("target", "_self") // Prevent links from opening in new tab
    .removeAttr("onmousedown"); // Prevent google from messing up our plugin

// Map each url string to an object consisting of a containerId (the iframe's container) 
// and a minimizedId (the minimized button for that iframe)
// {url: {containerId, minimizedId}}
const iframes = new Map();
var idModifier = 0;

function onReceived(message) {
    if (message.id === 0) {
        createIframe(message.url);
    }
}

// TODO: Each link should be associated with an iframe with a unique id. Each id can only be open once.
/**
* Create a PiP view associated with a certain link element on the page.
*/
function createIframe(url) {
    console.log("Creating iframe");
    if (!iframes.has(url)) {
        let containerId = "linkPreviewContainer" + idModifier;

        // Create the minimized button
        let minimized = document.createElement("button");
        let minimizedId = "minimized" + idModifier;
        minimized.id = minimizedId;
        minimized.type = "button";
        minimized.innerHTML = "+";
        minimized.style.display = "none";
        minimized.onclick = function() {
            this.style.display = "none";
            div.style.display = "block";
        };
        let element = $(`.userClicked${idModifier}`)[0];
        insertAfter(minimized, element);

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

        // create the close button
        let btnClose = document.createElement("button");
        btnClose.type = "button";
        btnClose.innerHTML = "x";
        btnClose.onclick = function() { 
            div.remove();
            iframes.delete(url); 
        };

        // create the minimize button
        let btnMin = document.createElement("button");
        btnMin.type = "button";
        btnMin.innerHTML = "–";
        btnMin.onclick = function() { 
            console.log("minimize clicked");
            div.style.display = "none";
            minimized.style.display = "inline";
        };

        // create the maximize button
        let btnMax = document.createElement("button");
        btnMax.type = "button";
        btnMax.innerHTML = "+";
        btnMax.onclick = function() {
            let currentlyMaximized = (div.clientHeight >= 0.90 * window.innerHeight && div.clientWidth >= 0.90 * window.innerWidth);
            if (currentlyMaximized) {
                div.style.width = '50%';
                div.style.height = '50%';
                div.style.top = '10px';
                div.style.left = '10px';
            } else {
                div.style.width = '100%';
                div.style.height = '100%';
                div.style.top = '0';
                div.style.left = '0';
            }
        };

        // put the elements together
        btnContainer.appendChild(btnMin);
        btnContainer.appendChild(btnMax);
        btnContainer.appendChild(btnClose);
        headerBar.appendChild(btnContainer);
        div.appendChild(headerBar);
        div.appendChild(iframe);
        document.body.appendChild(div);

        // Add the ids to the map
        let pair = {containerId: containerId, minimizedId: minimizedId};
        iframes.set(url, pair);
        
        dragElement(div);
        // setResizable(containerId);
        idModifier++;
    }
}

function notifyLinkClicked(e) {
    var el = e.target;
    while (el.tagName !== "A" && el !== el.parentNode)
        el = el.parentNode;
    if (el.tagName === "A") {
        browser.storage.local.get('enabled').then(function (data) {
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
        "id": 1,
        "url": el.href
    });
}

function setResizable(id) {
    console.log("set resizable");
    // https://stackoverflow.com/a/22720042
    $("#"+id).resizable({
        start: function(event, ui) {
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
        stop: function(event, ui) {
            $("#iframe-barrier", ui.element).remove();
        },
        resize: function(event, ui) {
            $("iframe", ui.element).width(ui.size.width).height(ui.size.height - 20); // leave room for the header bar
        }
    });
}

// https://www.w3schools.com/howto/howto_js_draggable.asp
function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  elmnt.firstChild.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    console.log("header clicked");
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
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
  }
}

// https://stackoverflow.com/a/4793630
function insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

browser.runtime.onMessage.addListener(onReceived);

window.addEventListener("click", notifyLinkClicked);

function onReceived(message) {
    if (message.id === 0) {
        createIframe(message.url);
    }
}

// TODO: Each link should be associated with an iframe with a unique id. Each id can only be open once.
function createIframe(url) {
    console.log("Creating iframe");
    if (!document.getElementById("linkPreviewContainer")) {
        let div = document.createElement("div");
        div.id = "linkPreviewContainer";

        let iframe = document.createElement("iframe");
        iframe.src = url;
        iframe.id = "linkPreviewIframe";

        let headerBar = document.createElement("div");
        headerBar.id = "headerBar";

        let btnContainer = document.createElement("div");
        btnContainer.id = "btnContainer";

        let btnClose = document.createElement("button");
        btnClose.type = "button";
        btnClose.id = "iframeCloseBtn";
        btnClose.innerHTML = "x";
        btnClose.onclick = function() { $("#linkPreviewContainer").remove() };

        let btnMin = document.createElement("button");
        btnMin.type = "button";
        btnMin.id = "iframeMinBtn";
        btnMin.innerHTML = "–";
        btnMin.onclick = function() { 
            console.log("minimize clicked");
            $("#linkPreviewContainer").css("display", "none");
            $("#minimized").css("display", "inline");
        };

        let btnMax = document.createElement("button");
        btnMax.type = "button";
        btnMax.id = "iframeMaxBtn";
        btnMax.innerHTML = "+";
        btnMax.onclick = function() { window.location.href = url; };

        btnContainer.appendChild(btnMin);
        btnContainer.appendChild(btnMax);
        btnContainer.appendChild(btnClose);
        headerBar.appendChild(btnContainer);
        div.appendChild(headerBar);
        div.appendChild(iframe);
        document.body.appendChild(div);

        Array.from(document.getElementsByClassName("userClicked")).forEach((el, id) => {
            if (!document.getElementById("minimized")) {
                let minimized = document.createElement("button");
                minimized.id = "minimized"; // TODO: need to change this, since IDs need to be unique.
                minimized.type = "button";
                minimized.innerHTML = "+";
                minimized.style.display = "none";
                minimized.onclick = function() {
                    this.style.display = "none";
                    $("#linkPreviewContainer").css("display", "block");
                }
                insertAfter(minimized, el);
            }
        });

        setResizable();
        dragElement(document.getElementById("linkPreviewContainer"));
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
    el.classList.add("userClicked");
    browser.runtime.sendMessage({
        "id": 1,
        "url": el.href
    });
}

function setResizable() {
    // https://stackoverflow.com/a/22720042
    $("#linkPreviewContainer").resizable({
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
  if (document.getElementById("headerBar")) {
    // if present, the header is where you move the DIV from:
    document.getElementById("headerBar").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }

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

setResizable();
dragElement(document.getElementById("linkPreviewContainer"));

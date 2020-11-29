browser.runtime.onMessage.addListener(onReceived);

window.addEventListener("click", notifyLinkClicked);

function onReceived(message) {
    if (message.id === 0) {
        console.log("Creating iframe");
        let div = document.createElement("div");
        div.id = "linkPreviewContainer";

        let iframe = document.createElement("iframe");
        iframe.src = message.url;
        iframe.id = "linkPreviewIframe";

        let headerBar = document.createElement("div");
        headerBar.id = "headerBar";

        let btn = document.createElement("button");
        btn.type = "button";
        btn.id = "iframeCloseBtn";
        btn.innerHTML = "x";
        btn.onclick = function() { $("#linkPreviewContainer").remove() }

        headerBar.appendChild(btn);
        div.appendChild(headerBar);
        div.appendChild(iframe);
        document.body.appendChild(div);

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

setResizable();
dragElement(document.getElementById("linkPreviewContainer"));

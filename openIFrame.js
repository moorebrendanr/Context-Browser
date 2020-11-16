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
        div.appendChild(iframe);
        document.body.appendChild(div);
        setResizable();
    }
}

function notifyLinkClicked(e) {
    var el = e.target;
    while (el.tagName !== "A" && el !== el.parentNode)
        el = el.parentNode;
    if (el.tagName === "A") {
        browser.runtime.sendMessage({
            "id": 1,
            "url": el.href
        });
    }
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
            $("iframe", ui.element).width(ui.size.width).height(ui.size.height);
        }
    });
}
setResizable();

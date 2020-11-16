browser.runtime.onMessage.addListener(onReceived);

window.addEventListener("click", notifyLinkClicked);

function onReceived(message) {
    if (message.id === 0) {
        console.log("Creating iframe");
        let iframe = document.createElement("iframe");
        iframe.src = message.url;
        iframe.id = "linkPreview";
        document.body.appendChild(iframe);
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


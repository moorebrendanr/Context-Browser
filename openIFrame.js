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
    if (e.target.tagName === "A") {
        browser.runtime.sendMessage({
            "id": 1,
            "url": e.target.href
        });
    }
}


function onGot(tabs) {
	console.log(tabs);
	if (tabs.length > 0) {
		document.getElementById("site").innerHTML = tabs[0].url;
	}
}

function onError(error) {
	console.log(`Error: ${error}`);
}

const gettingCurrent = browser.tabs.query({active: true, lastFocusedWindow: true});
gettingCurrent.then(onGot, onError);
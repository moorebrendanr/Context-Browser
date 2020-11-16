const edb = $('#enableDisableButton');

// set initial state of enable/disable button based on whether currently enabled
browser.storage.local.get('enabled').then(
	e => edb.text(e['enabled'] ? 'Disable' : 'Enable'));

edb.click(function() {
	if (edb.text() == 'Enable') edb.text('Disable'); else edb.text('Enable');
	browser.runtime.sendMessage({ 'id': 'enableDisable' });
});

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

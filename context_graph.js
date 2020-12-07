const edb = $('#enableDisableButton');
const saveButton = $('#saveButton');
const contextsDiv = $('#contexts');

// set initial state of enable/disable button based on whether currently enabled
browser.storage.local.get('enabled').then(
	e => edb.text(e['enabled'] ? 'Disable' : 'Enable'));

edb.click(function() {
	if (edb.text() == 'Enable') edb.text('Disable'); else edb.text('Enable');
	browser.runtime.sendMessage({ 'id': 'enableDisable' });
});

async function onGot(tabs) {
	if (tabs.length < 0)
		return;
	tab = tabs[0];
	document.getElementById("site").textContent = tab.url;
	document.getElementById("tree").setAttribute('style', 'white-space: pre;');
	document.getElementById("tree").textContent = await browser.runtime.sendMessage({ 'id': 'getTreeForTab', 'tabId': tab.id });
}

function onError(error) { console.log(`Error: ${error}`); }

const gettingCurrent = browser.tabs.query({active: true, lastFocusedWindow: true});
gettingCurrent.then(onGot, onError);

saveButton.click(() => {
	browser.runtime.sendMessage({ 'id': 'saveCurrentTab' })
		.then(getSavedContexts());
});

async function getSavedContexts() {
	var saves;
	let storageResult = await browser.storage.local.get('saves');
	saves = storageResult.saves;
	for (const save of saves) {
		text = `Save of ${save.url} at ${save.date}`;
		console.log(text);
		var p = document.createElement('p');
		var pt = document.createTextNode(text);
		p.appendChild(pt);
		contextsDiv.append(p);
	}
}

getSavedContexts();

const edb = $('#enableDisableButton');
const saveButton = $('#saveButton');
const contextsDiv = $('#contexts');

$('#clearLocalStorage').click(() =>
    browser.runtime.sendMessage({ 'id': 'clearLocalStorage' }));

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
        //text = `${save.url}${dateToString(save.date)}`;
        //console.log(text);
        var img = document.createElement('img');
        img.src = save.faviconUrl;
        img.width = 16;
        img.height = 16;
        var p = document.createElement('p');
        p.appendChild(img);
        p.appendChild(document.createTextNode(' '));
        p.appendChild(document.createTextNode(`${save.url}`));
        p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(`Saved ${dateToString(save.date)}`));
        p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(`${save.numNodes} pages`));
        contextsDiv.append(p);
    }
}

getSavedContexts();

function dateToString(d) {
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    if (m < 10) m = '0'+m;
    var day = d.getDate();
    if (day < 10) day = '0'+day;
    var h = d.getHours();
    if (h < 10) h = '0'+h;
    var min = d.getMinutes();
    if (min < 10) min = '0'+min;
    return y + '-' + m + '-' + day + ' @ ' + h + ':' + min;
}

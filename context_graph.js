// For some reason specifying this CSS in the HTML as style='...' doesn't work...
// Firefox imposes a limit of 800x600, but setting it to 800x600 shows
//   scrollbars even if the content isn't that big, so make it a bit smaller.
$('body').css({
    'width': 780,
    'height': 580
});

const edb = $('#enableDisableButton');
const contextsDiv = $('#contexts');

$('#saveButton').click(() =>
    browser.runtime.sendMessage({ 'id': 'saveCurrentTab' }));

$('#clearLocalStorage').click(() =>
    browser.runtime.sendMessage({ 'id': 'clearLocalStorage' }));

// set initial state of enable/disable button based on whether currently enabled
browser.storage.local.get('enabled').then(
    e => edb.text(e['enabled'] ? 'Disable' : 'Enable'));

edb.click(function() {
    if (edb.text() == 'Enable') edb.text('Disable'); else edb.text('Enable');
    browser.runtime.sendMessage({ 'id': 'enableDisable' });
});

async function getSavedContexts() {
    var saves;
    let storageResult = await browser.storage.local.get('saves');
    saves = storageResult.saves;
    contextsDiv.empty();
    for (const save of saves) {
        let saveId = save.id;

        var saveContainer = document.createElement('div');
        saveContainer.className = 'saveContainer';

        var screenshot = document.createElement('img');
        screenshot.src = save.screenshot;
        screenshot.className = 'saveScreenshot';
        saveContainer.append(screenshot);

        var p = document.createElement('p');
        p.className = 'saveText';
        var favicon = document.createElement('img');
        favicon.src = save.faviconUrl;
        favicon.className = 'saveFavicon';
        p.appendChild(favicon);
        p.appendChild(document.createTextNode(' '));
        p.appendChild(document.createTextNode(save.title));
        p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(save.url));
        p.appendChild(document.createElement('br'));
        p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(`Saved ${dateToString(save.date)}`));
        p.appendChild(document.createElement('br'));
        if (save.numNodes == 1)
            p.appendChild(document.createTextNode('1 page'));
        else
            p.appendChild(document.createTextNode(`${save.numNodes} pages`));
        p.appendChild(document.createElement('br'));
        p.appendChild(document.createElement('br'));

        var restoreButton = document.createElement('button');
        restoreButton.textContent = 'Restore';
        restoreButton.addEventListener('click', () => {
            browser.runtime.sendMessage({ 'id': 'restoreSave', 'saveId': saveId });
        });

        var deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
            browser.runtime.sendMessage({ 'id': 'deleteSave', 'saveId': saveId });
        });

        p.appendChild(restoreButton);
        p.appendChild(document.createTextNode(' '));
        p.appendChild(deleteButton);
        //p.appendChild(document.createTextNode(' '));
        //p.appendChild(document.createTextNode(`Id: ${save.id}`));
        saveContainer.append(p);

        contextsDiv.append(saveContainer);
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

function onReceived(message, sender, sendResponse) {
    switch (message.id) {
        case 'popupRefresh':
            getSavedContexts();
            break;
        default:
            console.log(`Unknown message id: ${message.id}`);
    }
}
browser.runtime.onMessage.addListener(onReceived);

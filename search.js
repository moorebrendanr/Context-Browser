// Keeps an updated list of search parameters. If a parameter is toggled off, then it is set to null.
const parameterSettings = {
    targetColor: null, // rgb
    colorDiff: null, // on each r/g/b component
    oldestCreateTime: null, // month is 0-indexed
    newestCreateTime: null,
    oldestModifyTime: null, // don't filter on this if null
    newestModifyTime: null
};

// Persists the values, even when they are toggled off.
const inputValues = {
    targetColor: [0, 0, 0],
    colorDiff: 127,
    oldestCreateTime: null,
    newestCreateTime: null,
    oldestModifyTime: null,
    newestModifyTime: null
};

const checkboxes = {
    oldestCreateTime: document.getElementById("createdAfterCheckbox"),
    newestCreateTime: document.getElementById("createdBeforeCheckbox"),
    oldestModifyTime: document.getElementById("modifiedAfterCheckbox"),
    newestModifyTime: document.getElementById("modifiedBeforeCheckbox"),
    targetColor: document.getElementById("colorCheckbox")
};

checkboxes.oldestCreateTime.addEventListener('change', () => toggleParameter("oldestCreateTime"));
checkboxes.newestCreateTime.addEventListener('change', () => toggleParameter("newestCreateTime"));
checkboxes.oldestModifyTime.addEventListener('change', () => toggleParameter("oldestModifyTime"));
checkboxes.newestModifyTime.addEventListener('change', () => toggleParameter("newestModifyTime"));
checkboxes.targetColor.addEventListener('change', () => toggleParameter("targetColor", "colorDiff"));
// checkboxes.targetColor.addEventListener('change', () => toggleParameter("colorDiff"));

// Data and time inputs
const oldestCreateDayInput = document.getElementById("createdAfterDate");
const oldestCreateTimeInput = document.getElementById("createdAfterTime");
const newestCreateDayInput = document.getElementById("createdBeforeDate");
const newestCreateTimeInput = document.getElementById("createdBeforeTime");
const oldestModifyDayInput = document.getElementById("modifiedAfterDate");
const oldestModifyTimeInput = document.getElementById("modifiedAfterTime");
const newestModifyDayInput = document.getElementById("modifiedBeforeDate");
const newestModifyTimeInput = document.getElementById("modifiedBeforeTime");

oldestCreateDayInput.addEventListener('change', event => setDate(event, "oldestCreateTime"));
oldestCreateTimeInput.addEventListener('change', event => setHours(event, "oldestCreateTime"));
newestCreateDayInput.addEventListener('change', event => setDate(event, "newestCreateTime"));
newestCreateTimeInput.addEventListener('change', event => setHours(event, "newestCreateTime"));
oldestModifyDayInput.addEventListener('change', event => setDate(event, "oldestModifyTime"));
oldestModifyTimeInput.addEventListener('change', event => setHours(event, "oldestModifyTime"));
newestModifyDayInput.addEventListener('change', event => setDate(event, "newestModifyTime"));
newestModifyTimeInput.addEventListener('change', event => setHours(event, "newestModifyTime"));

const colorInput = document.getElementById("colorPicker");
colorInput.addEventListener('change', event => {
    let color = [0, 0, 0];
    let value = event.target.value;
    if (value) {
        color[0] = parseInt(value.substring(1, 3), 16);
        color[1] = parseInt(value.substring(3, 5), 16);
        color[2] = parseInt(value.substring(5, 7), 16);
    }

    inputValues.targetColor = color;
    if (checkboxes.targetColor.checked) {
        parameterSettings.targetColor = inputValues.targetColor;
    }
    console.log(JSON.parse(JSON.stringify(parameterSettings)));
})

document.getElementById("colorSlider").addEventListener('change', event => {
    let value = event.target.valueAsNumber;
    inputValues.colorDiff = value;
    if (checkboxes.targetColor.checked) {
        parameterSettings.colorDiff = inputValues.colorDiff;
    }
    console.log(JSON.parse(JSON.stringify(parameterSettings)));
})

document.getElementById("searchButton").onclick = search;

function setDate(event, property) {
    let day;
    if (event.target.value) {
        day = new Date(event.target.value);
    } else {
        day = new Date();
    }

    if (inputValues[property]) {
        inputValues[property].setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    } else {
        inputValues[property] = day;
    }

    if (checkboxes[property].checked) {
        parameterSettings[property] = inputValues[property];
    }
    console.log(JSON.parse(JSON.stringify(parameterSettings)));
}

function setHours(event, property) {
    let hours;
    if (event.target.value) {
        hours = event.target.value.split(':');
    } else {
        hours = [0, 0];
    }
    // const hours = event.target.value.split(':');
    if (inputValues[property]) {
        inputValues[property].setHours(hours[0], hours[1]);
    } else {
        inputValues[property] = new Date();
        inputValues[property].setHours(hours[0], hours[1]);
    }

    if (checkboxes[property].checked) {
        console.log("Checkbox is checked");
        parameterSettings[property] = inputValues[property];
    }
    console.log(JSON.parse(JSON.stringify(parameterSettings)));
}

function toggleParameter(property, ...also) {
    if (checkboxes[property].checked) {
        if (inputValues[property]) {
            parameterSettings[property] = inputValues[property];
            for (let alsoProperty of also) {
                parameterSettings[alsoProperty] = inputValues[alsoProperty];
            }
        }
    } else {
        parameterSettings[property] = null;
        for (let alsoProperty of also) {
            parameterSettings[alsoProperty] = null;
        }
    }
    console.log(JSON.parse(JSON.stringify(parameterSettings)));
}

function search() {
    browser.runtime.sendMessage({
        id: "search",
        params: parameterSettings
    }).then(saves => {
        console.log("Retrieved saves: "+ saves);
        if (saves) {
            populateResults(saves);
        }
    });
}

function populateResults(saves) {
    const resultsDiv = document.getElementById("searchResults");
    $(resultsDiv).empty();
    // TODO: This code is duplicated from context_graph.js, but I don't know a better solution in
    //       JavaScript at the moment. Should abstract this logic somehow.
    for (const save of saves) {
        let saveId = save.id;

        const saveContainer = document.createElement('div');
        saveContainer.className = 'saveContainer';

        const screenshot = document.createElement('img');
        screenshot.src = save.screenshot;
        screenshot.className = 'saveScreenshot';
        saveContainer.append(screenshot);

        const p = document.createElement('p');
        p.className = 'saveText';
        const favicon = document.createElement('img');
        favicon.src = save.faviconUrl;
        favicon.className = 'saveFavicon';
        p.appendChild(favicon);
        p.appendChild(document.createTextNode(' '));
        p.appendChild(document.createTextNode(save.title));
        p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(save.url));
        p.appendChild(document.createElement('br'));
        p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(`Saved ${save.date.toDateString()}`));
        p.appendChild(document.createElement('br'));
        if (save.numNodes === 1)
            p.appendChild(document.createTextNode('1 page'));
        else
            p.appendChild(document.createTextNode(`${save.numNodes} pages`));
        p.appendChild(document.createElement('br'));
        p.appendChild(document.createElement('br'));

        const restoreButton = document.createElement('button');
        restoreButton.textContent = 'Restore';
        restoreButton.addEventListener('click', () => {
            browser.runtime.sendMessage({ 'id': 'restoreSave', 'saveId': saveId });
        });

        p.appendChild(restoreButton);
        p.appendChild(document.createTextNode(' '));

        saveContainer.appendChild(p);

        resultsDiv.appendChild(saveContainer);
    }
}
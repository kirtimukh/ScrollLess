const hideOnLoadButton = document.getElementById('hideOnLoadButton');
const toggleDisplayButton = document.getElementById('toggleDisplayButton');

function updateButtonBG(isEnabled) {
    hideOnLoadButton.style.backgroundColor = isEnabled ? "greenyellow" : "lightgrey";
}

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['hideOnLoad'], (result) => {
        const isEnabled = result.hideOnLoad === true;
        updateButtonBG(isEnabled);
    });
});

hideOnLoadButton.addEventListener('click', () => {
    chrome.storage.local.get(['hideOnLoad'], (result) => {
        const newState = !(result.hideOnLoad === true);
        chrome.storage.local.set({ hideOnLoad: newState }, () => {
            updateButtonBG(newState);
        });
    });
});

toggleDisplayButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true })
    .then(tabs => {
        const currentTab = tabs[0];
        chrome.tabs.sendMessage(currentTab.id, { action: 'toggleDisplay' })
    });
});

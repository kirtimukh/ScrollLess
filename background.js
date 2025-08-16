// Handle keyboard shortcut commands
chrome.commands.onCommand.addListener((command) => {
    if (command === "toggleDisplay") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];
            // Only send to ChatGPT tabs
            if (currentTab && currentTab.id && currentTab.url && currentTab.url.includes('chatgpt.com')) {
                chrome.tabs.sendMessage(currentTab.id, { action: 'toggleDisplay' });
            }
        });
    }
});

// Handle tab updates for SPA navigation
function handleUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
        // Only send to ChatGPT tabs for hide on load functionality
        if (tab.url.includes('chatgpt.com')) {
            chrome.tabs.sendMessage(tabId, { action: 'urlChanged' });
        }
    }
}

chrome.tabs.onUpdated.addListener(handleUpdated);

chrome.runtime.onInstalled.addListener(() => {
    console.log("ScrollLess Extension installed or updated");
    // Set default values
    chrome.storage.local.get(['hideOnLoad', 'onDisplay'], (result) => {
        if (result.hideOnLoad === undefined) {
            chrome.storage.local.set({ hideOnLoad: false });
        }
        if (result.onDisplay === undefined) {
            chrome.storage.local.set({ onDisplay: true });
        }
    });
});

// Handle SPA navigation for ChatGPT
chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {
    if (details.url && details.url.includes('chatgpt.com')) {
        chrome.tabs.sendMessage(details.tabId, { action: "urlChanged" });
    }
}, {
    url: [{hostContains: 'chatgpt.com'}]
});

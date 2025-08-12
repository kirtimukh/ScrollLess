// chrome.commands.onCommand.addListener(command => {
//     if (command === 'toggleDisplay') {
//         chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//             chrome.scripting.executeScript({
//                 target: { tabId: tabs[0].id },
//                 function: () => {
//                     toggleDisplay();
//                 }
//             });
//         });
//     }
// });

// chrome.commands.onCommand.addListener((command) => {
//     if (command === "toggleDisplay") {
//         chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//             const currentTab = tabs[0];
//             if (currentTab && currentTab.id) {
//                 chrome.tabs.sendMessage(currentTab.id, { action: 'toggleDisplay' });
//             }
//         });
//     }
// });


// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//     console.log(2727272)
//     if (changeInfo.url) {
//         console.log('Tab URL changed to:', changeInfo.url);
//         chrome.tabs.sendMessage(currentTab.id, { action: 'urlChanged' });
//     }
// });

function handleUpdated(tabId, changeInfo, tabInfo) {
    if (changeInfo.status === 'complete' && tab.url) {
        chrome.tabs.sendMessage(tabId, { action: 'urlChanged' });
      }
    // if (changeInfo.url) {
    //     console.log(`Tab: ${tabId} URL changed to ${changeInfo.url}`);
    //     chrome.tabs.sendMessage(tabId, { action: 'urlChanged' });
    // }
}

// chrome.tabs.onUpdated.addListener(handleUpdated);

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed or updated");
});


// chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {
//     console.log("URL changed (SPA navigation):", details.url);
//     chrome.tabs.sendMessage(details.tabId, { action: "urlChanged" });
//   });
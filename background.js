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

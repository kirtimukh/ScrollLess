const hideOnLoadButton = document.getElementById('hideOnLoadButton');
const toggleDisplayButton = document.getElementById('toggleDisplayButton');
const exportJsonButton = document.getElementById('exportJsonButton');
const exportTxtButton = document.getElementById('exportTxtButton');

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

function downloadJson(obj, filename) {
    const json = JSON.stringify(obj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

exportJsonButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(tabs => {
        const tab = tabs[0];
        if (!tab || !tab.id) return;
        chrome.tabs.sendMessage(tab.id, { action: 'extractConversation' }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('Error extracting conversation:', chrome.runtime.lastError.message);
                return;
            }
            if (!response || !response.ok) {
                console.warn('No data returned from page');
                return;
            }
            const data = response.data;
            const safeTitle = (data.title || 'chatgpt_conversation')
                .replace(/[^a-z0-9_\-]+/gi, '_')
                .slice(0, 60);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            downloadJson(data, `${safeTitle}_${timestamp}.json`);
        });
    });
});

function downloadTxt(text, filename) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function toPlainText(data) {
    const lines = [];
    lines.push(`# ${data.title || 'Conversation'}`);
    lines.push(`URL: ${data.url}`);
    if (data.conversationId) lines.push(`Conversation ID: ${data.conversationId}`);
    lines.push(`Captured: ${data.capturedAt}`);
    lines.push('');
    data.items.forEach(item => {
        const role = item.role || 'unknown';
        const idx = (typeof item.index === 'number') ? ` (${item.index})` : '';
        lines.push(`${role.toUpperCase()}${idx}`);
        if (item.timestampISO || item.timestampText) {
            lines.push(`Time: ${item.timestampISO || item.timestampText}`);
        }
        lines.push(item.text || '');
        lines.push('');
    });
    return lines.join('\n');
}

exportTxtButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(tabs => {
        const tab = tabs[0];
        if (!tab || !tab.id) return;
        chrome.tabs.sendMessage(tab.id, { action: 'extractConversation' }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('Error extracting conversation:', chrome.runtime.lastError.message);
                return;
            }
            if (!response || !response.ok) {
                console.warn('No data returned from page');
                return;
            }
            const data = response.data;
            const safeTitle = (data.title || 'chatgpt_conversation')
                .replace(/[^a-z0-9_\-]+/gi, '_')
                .slice(0, 60);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const text = toPlainText(data);
            downloadTxt(text, `${safeTitle}_${timestamp}.txt`);
        });
    });
});

// Get all button elements
const hideOnLoadButton = document.getElementById('hideOnLoadButton');
const toggleDisplayButton = document.getElementById('toggleDisplayButton');
const exportJsonButton = document.getElementById('exportJsonButton');
const exportTxtButton = document.getElementById('exportTxtButton');
const transcriptWithTimestampBtn = document.getElementById('transcriptWithTimestamp');
const transcriptNoTimestampBtn = document.getElementById('transcriptNoTimestamp');

// Get section elements
const chatgptSection = document.getElementById('chatgpt-section');
const youtubeSection = document.getElementById('youtube-section');
const defaultSection = document.getElementById('default-section');
const youtubeStatus = document.getElementById('youtube-status');

function updateButtonBG(isEnabled) {
    if (hideOnLoadButton) {
        hideOnLoadButton.classList.toggle('enabled', isEnabled);
    }
}

/**
 * Show appropriate section based on current tab URL
 */
function showAppropriateSections(url) {
    // Hide all sections initially
    chatgptSection.classList.add('hidden');
    youtubeSection.classList.add('hidden');
    defaultSection.classList.add('hidden');
    
    if (!url) {
        defaultSection.classList.remove('hidden');
        return;
    }
    
    // Check if it's ChatGPT
    if (url.includes('chatgpt.com')) {
        chatgptSection.classList.remove('hidden');
    }
    // Check if it's YouTube
    else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        youtubeSection.classList.remove('hidden');
        // Check if we're on a video page
        if (!url.includes('/watch?v=')) {
            showYouTubeStatus('Please navigate to a video to extract transcript', 'error');
        }
    }
    // Show default for other sites
    else {
        defaultSection.classList.remove('hidden');
    }
}

/**
 * Show status message in YouTube section
 */
function showYouTubeStatus(message, type = 'error') {
    youtubeStatus.textContent = message;
    youtubeStatus.classList.remove('hidden');
    
    if (type === 'success') {
        youtubeStatus.style.background = '#e8f5e9';
        youtubeStatus.style.color = '#2e7d32';
    } else {
        youtubeStatus.style.background = '#ffebee';
        youtubeStatus.style.color = '#d32f2f';
    }
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            youtubeStatus.classList.add('hidden');
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Get current tab and show appropriate sections
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            showAppropriateSections(tabs[0].url);
        }
    });
    
    // Initialize ChatGPT hide on load button state
    chrome.storage.local.get(['hideOnLoad'], (result) => {
        const isEnabled = result.hideOnLoad === true;
        updateButtonBG(isEnabled);
    });
});

// ChatGPT Event Listeners
if (hideOnLoadButton) {
    hideOnLoadButton.addEventListener('click', () => {
        chrome.storage.local.get(['hideOnLoad'], (result) => {
            const newState = !(result.hideOnLoad === true);
            chrome.storage.local.set({ hideOnLoad: newState }, () => {
                updateButtonBG(newState);
            });
        });
    });
}

if (toggleDisplayButton) {
    toggleDisplayButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, lastFocusedWindow: true })
        .then(tabs => {
            const currentTab = tabs[0];
            chrome.tabs.sendMessage(currentTab.id, { action: 'toggleDisplay' })
        });
    });
}

// YouTube Event Listeners
if (transcriptWithTimestampBtn) {
    transcriptWithTimestampBtn.addEventListener('click', () => {
        extractYouTubeTranscript(true);
    });
}

if (transcriptNoTimestampBtn) {
    transcriptNoTimestampBtn.addEventListener('click', () => {
        extractYouTubeTranscript(false);
    });
}

/**
 * Extract YouTube transcript
 */
function extractYouTubeTranscript(includeTimestamps) {
    // Hide any previous status messages
    youtubeStatus.classList.add('hidden');
    
    // Disable buttons during extraction
    transcriptWithTimestampBtn.disabled = true;
    transcriptNoTimestampBtn.disabled = true;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab || !tab.id) {
            showYouTubeStatus('Unable to access current tab', 'error');
            transcriptWithTimestampBtn.disabled = false;
            transcriptNoTimestampBtn.disabled = false;
            return;
        }
        
        // Check if we're on a YouTube video page
        if (!tab.url || !tab.url.includes('/watch?v=')) {
            showYouTubeStatus('Please navigate to a YouTube video first', 'error');
            transcriptWithTimestampBtn.disabled = false;
            transcriptNoTimestampBtn.disabled = false;
            return;
        }
        
        // Send message to content script
        chrome.tabs.sendMessage(
            tab.id, 
            { 
                action: 'extractTranscript', 
                includeTimestamps: includeTimestamps 
            }, 
            (response) => {
                // Re-enable buttons
                transcriptWithTimestampBtn.disabled = false;
                transcriptNoTimestampBtn.disabled = false;
                
                if (chrome.runtime.lastError) {
                    showYouTubeStatus('Error: ' + chrome.runtime.lastError.message, 'error');
                    return;
                }
                
                if (!response) {
                    showYouTubeStatus('No response from page. Please refresh and try again.', 'error');
                    return;
                }
                
                if (response.success) {
                    showYouTubeStatus('Transcript extracted successfully!', 'success');
                } else {
                    showYouTubeStatus('Error: ' + (response.error || 'Unknown error'), 'error');
                }
            }
        );
    });
}

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

if (exportJsonButton) {
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
}

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

if (exportTxtButton) {
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
}

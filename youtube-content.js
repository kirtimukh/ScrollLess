// YouTube Transcript Extraction Content Script

/**
 * Extract video ID from YouTube URL
 */
function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
}

/**
 * Wait for an element to appear in the DOM
 */
function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const checkElement = () => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                resolve(null);
            } else {
                setTimeout(checkElement, 100);
            }
        };
        
        checkElement();
    });
}

/**
 * Click the "Show transcript" button to open transcript panel
 */
async function openTranscriptPanel() {
    // First check if transcript panel is already open
    const existingPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]');
    if (existingPanel && existingPanel.offsetHeight > 0) {
        return true;
    }

    // Look for the "Show transcript" button
    const showTranscriptBtn = document.querySelector('button[aria-label*="Show transcript"]') ||
                             document.querySelector('button[aria-label*="transcript"]') ||
                             document.querySelector('#button[aria-label*="Transcript"]');
    
    if (!showTranscriptBtn) {
        // Try to find it in the description area's menu
        const moreActionsBtn = document.querySelector('tp-yt-paper-button#expand');
        if (moreActionsBtn) {
            moreActionsBtn.click();
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Try again after expanding
        const transcriptBtn = document.querySelector('button[aria-label*="Show transcript"]') ||
                             document.querySelector('button[aria-label*="transcript"]');
        
        if (transcriptBtn) {
            transcriptBtn.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            return true;
        }
        return false;
    }
    
    showTranscriptBtn.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
}

/**
 * Extract transcript text from the transcript panel
 */
async function extractTranscriptFromPanel(includeTimestamps) {
    const transcriptPanel = await waitForElement('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]', 5000);
    
    if (!transcriptPanel) {
        throw new Error('Transcript panel not found');
    }

    // Wait for transcript segments to load
    await waitForElement('ytd-transcript-segment-renderer', 5000);
    
    // Get all transcript segments
    const segments = transcriptPanel.querySelectorAll('ytd-transcript-segment-renderer');
    
    if (segments.length === 0) {
        throw new Error('No transcript segments found');
    }
    
    const transcriptLines = [];
    
    segments.forEach(segment => {
        const timestampElement = segment.querySelector('.segment-timestamp');
        const textElement = segment.querySelector('.segment-text');
        
        if (textElement) {
            const text = textElement.textContent.trim();
            
            if (includeTimestamps && timestampElement) {
                const timestamp = timestampElement.textContent.trim();
                transcriptLines.push(`[${timestamp}] ${text}`);
            } else {
                transcriptLines.push(text);
            }
        }
    });
    
    return transcriptLines.join('\n');
}

/**
 * Get video metadata
 */
function getVideoMetadata() {
    const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer, h1.title, yt-formatted-string.style-scope.ytd-watch-metadata');
    const channelElement = document.querySelector('ytd-channel-name yt-formatted-string, #channel-name yt-formatted-string');
    
    return {
        title: titleElement ? titleElement.textContent.trim() : 'Unknown Title',
        channel: channelElement ? channelElement.textContent.trim() : 'Unknown Channel',
        url: window.location.href,
        videoId: getVideoId(),
        extractedAt: new Date().toISOString()
    };
}

/**
 * Main function to extract transcript
 */
async function extractYouTubeTranscript(includeTimestamps) {
    try {
        // Check if we're on a video page
        const videoId = getVideoId();
        if (!videoId) {
            throw new Error('Not on a YouTube video page');
        }
        
        // Try to open the transcript panel
        const panelOpened = await openTranscriptPanel();
        
        if (!panelOpened) {
            throw new Error('Could not open transcript panel. Video may not have captions.');
        }
        
        // Extract the transcript
        const transcript = await extractTranscriptFromPanel(includeTimestamps);
        
        if (!transcript) {
            throw new Error('Transcript is empty');
        }
        
        // Get video metadata
        const metadata = getVideoMetadata();
        
        return {
            success: true,
            data: {
                ...metadata,
                transcript: transcript,
                includesTimestamps: includeTimestamps
            }
        };
        
    } catch (error) {
        console.error('Error extracting transcript:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Download content as a text file
 */
function downloadTextFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/**
 * Format transcript for download
 */
function formatTranscriptForDownload(data) {
    const lines = [];
    lines.push('='.repeat(50));
    lines.push(`Title: ${data.title}`);
    lines.push(`Channel: ${data.channel}`);
    lines.push(`URL: ${data.url}`);
    lines.push(`Video ID: ${data.videoId}`);
    lines.push(`Extracted: ${data.extractedAt}`);
    lines.push(`Timestamps: ${data.includesTimestamps ? 'Included' : 'Not included'}`);
    lines.push('='.repeat(50));
    lines.push('');
    lines.push('TRANSCRIPT:');
    lines.push('-'.repeat(50));
    lines.push(data.transcript);
    
    return lines.join('\n');
}

// Listen for messages from the extension popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'extractTranscript') {
        extractYouTubeTranscript(message.includeTimestamps).then(result => {
            if (result.success) {
                // Format the transcript for download
                const content = formatTranscriptForDownload(result.data);
                
                // Create filename
                const safeTitle = result.data.title
                    .replace(/[^a-z0-9\s_\-]+/gi, '')
                    .replace(/\s+/g, '_')
                    .slice(0, 50);
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const filename = `${safeTitle}_transcript_${timestamp}.txt`;
                
                // Download the file
                downloadTextFile(content, filename);
                
                sendResponse({ 
                    success: true, 
                    message: 'Transcript extracted and downloaded successfully' 
                });
            } else {
                sendResponse({ 
                    success: false, 
                    error: result.error 
                });
            }
        });
        
        return true; // Keep the message channel open for async response
    }
});

// Log that the content script is loaded
console.log('YouTube transcript extraction script loaded');

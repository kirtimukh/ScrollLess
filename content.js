const userDialogIdMod2 = 1

// Hashtag Navigation Class
class HashtagNavigator {
    constructor() {
        this.hashtags = new Map(); // Map of hashtag -> {element, article, turnId}
        this.navPanel = null;
        this.observer = null;
        this.isInitialized = false;
        this.scrollOffset = 100; // Offset from top when scrolling to hashtag
        this.isFirstLoad = true; // Track if this is the first load
        this.lastHashtagCount = 0; // Track last hashtag count
    }

    init() {
        if (this.isInitialized) return;
        
        // Create navigation panel
        this.createNavigationPanel();
        
        // Initial scan for hashtags
        this.scanForHashtags();
        
        // Setup observer for new content
        this.setupContentObserver();
        
        this.isInitialized = true;
    }

    createNavigationPanel() {
        // Remove existing panel if any
        if (this.navPanel) {
            this.navPanel.remove();
        }

        // Create the navigation panel container
        this.navPanel = document.createElement('div');
        this.navPanel.id = 'scrollless-hashtag-nav';
        this.navPanel.className = 'scrollless-hashtag-nav';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'hashtag-nav-header';
        header.innerHTML = `
            <span class="hashtag-nav-title">Hashtag Navigation</span>
            <button class="hashtag-nav-close" title="Close navigation">×</button>
        `;
        
        // Create hashtag list container
        const listContainer = document.createElement('div');
        listContainer.className = 'hashtag-nav-list';
        listContainer.id = 'hashtag-nav-list';
        
        // Create empty state message
        const emptyState = document.createElement('div');
        emptyState.className = 'hashtag-nav-empty';
        emptyState.textContent = 'No hashtags found in conversation';
        emptyState.style.display = 'none';
        
        // Assemble the panel
        this.navPanel.appendChild(header);
        this.navPanel.appendChild(listContainer);
        this.navPanel.appendChild(emptyState);
        
        // Add to page
        document.body.appendChild(this.navPanel);
        
        // Setup close button
        header.querySelector('.hashtag-nav-close').addEventListener('click', () => {
            this.hide();
        });
        
        // Add toggle button to page header if exists
        this.addToggleButton();
    }

    addToggleButton() {
        // Wait a bit for the header to be fully rendered
        setTimeout(() => {
            // Find the conversation header actions area
            const headerActions = document.querySelector('#conversation-header-actions');
            if (!headerActions) {
                // Try mobile header or fallback location
                const pageHeader = document.querySelector('#page-header');
                if (pageHeader) {
                    const actionsArea = pageHeader.querySelector('.flex.items-center:last-child');
                    if (actionsArea) {
                        this.insertToggleButton(actionsArea);
                        this.insertShowHideButton(actionsArea);
                    }
                }
                // If still no header found, try again later
                if (!document.querySelector('#hashtag-nav-toggle')) {
                    setTimeout(() => this.addToggleButton(), 1000);
                }
                return;
            }
            
            this.insertShowHideButton(headerActions);
            this.insertToggleButton(headerActions);
        }, 100);
    }

    insertToggleButton(container) {
        // Check if button already exists
        if (document.querySelector('#hashtag-nav-toggle')) return;
        
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'hashtag-nav-toggle';
        toggleBtn.className = 'text-token-text-primary no-draggable hover:bg-token-surface-hover focus-visible:bg-token-surface-hover touch:h-10 touch:w-10 flex h-9 w-9 items-center justify-center rounded-lg focus-visible:outline-0 disabled:opacity-50';
        toggleBtn.title = 'Toggle hashtag navigation';
        toggleBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon">
    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/>
</svg>
        `;
        
        toggleBtn.addEventListener('click', () => {
            this.toggle();
        });
        
        container.appendChild(toggleBtn);
    }

    insertShowHideButton(container) {
        // Check if button already exists
        if (document.querySelector('#show-hide-all-toggle')) return;
        
        const showHideBtn = document.createElement('button');
        showHideBtn.id = 'show-hide-all-toggle';
        showHideBtn.className = 'text-token-text-primary no-draggable hover:bg-token-surface-hover focus-visible:bg-token-surface-hover touch:h-10 touch:w-10 flex h-9 w-9 items-center justify-center rounded-lg focus-visible:outline-0 disabled:opacity-50';
        showHideBtn.title = 'Show/hide all responses';
        
        // Get current state to set appropriate icon
        chrome.storage.local.get(['onDisplay'], (result) => {
            const isShowing = result.onDisplay !== false;
            this.updateShowHideIcon(showHideBtn, isShowing);
        });
        
        showHideBtn.addEventListener('click', () => {
            toggleDisplay();
            // Update icon after toggling
            setTimeout(() => {
                chrome.storage.local.get(['onDisplay'], (result) => {
                    const isShowing = result.onDisplay !== false;
                    this.updateShowHideIcon(showHideBtn, isShowing);
                });
            }, 100);
        });
        
        container.appendChild(showHideBtn);
    }

    updateShowHideIcon(button, isShowing) {
        if (isShowing) {
            // Eye icon - responses are visible
            button.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                </svg>
            `;
            button.title = 'Hide all responses';
        } else {
            // Eye-off icon - responses are hidden
            button.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon">
                    <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd"/>
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
                </svg>
            `;
            button.title = 'Show all responses';
        }
    }

    scanForHashtags() {
        // Clear existing hashtags
        this.hashtags.clear();
        
        // Find all conversation articles
        const articles = document.querySelectorAll('article[data-testid^="conversation-turn-"]');
        
        articles.forEach(article => {
            const turnId = article.dataset.turnId;
            const role = article.dataset.turn; // 'user' or 'assistant'
            
            // Only scan assistant responses for hashtags
            if (role !== 'assistant') {
                return;
            }
            
            // Find the first text element in the response
            // Look for the first paragraph or text block in the markdown content
            const markdownContent = article.querySelector('.markdown');
            if (!markdownContent) {
                return;
            }
            
            // Get the first paragraph, heading, or text element
            const firstTextElement = markdownContent.querySelector('p, h1, h2, h3, h4, h5, h6');
            if (!firstTextElement) {
                return;
            }
            
            // Get the text content and extract just the first word
            const text = firstTextElement.textContent || '';
            const trimmedText = text.trim();
            
            // Split by whitespace and get the first word
            const words = trimmedText.split(/\s+/);
            if (words.length === 0) {
                return;
            }
            
            const firstWord = words[0];
            
            // Check if the first word is a hashtag
            const hashtagPattern = /^#[a-zA-Z0-9_]+$/;
            if (hashtagPattern.test(firstWord)) {
                const hashtag = firstWord;
                const key = hashtag.toLowerCase();
                
                if (!this.hashtags.has(key)) {
                    this.hashtags.set(key, {
                        hashtag: hashtag,
                        element: firstTextElement,
                        article: article,
                        turnId: turnId,
                        role: role,
                        firstOccurrence: true,
                        isFirstWord: true
                    });
                } else {
                    // Mark as having multiple occurrences
                    const existing = this.hashtags.get(key);
                    existing.multiple = true;
                }
            }
        });
        
        this.updateNavigationPanel();
    }

    updateNavigationPanel() {
        if (!this.navPanel) return;
        
        const listContainer = document.getElementById('hashtag-nav-list');
        const emptyState = this.navPanel.querySelector('.hashtag-nav-empty');
        
        if (!listContainer) return;
        
        // Store current hashtag keys for comparison
        const currentHashtagKeys = new Set(
            Array.from(listContainer.querySelectorAll('.hashtag-nav-item'))
                .map(item => item.dataset.hashtagKey)
        );
        
        // Create new hashtag keys set
        const newHashtagKeys = new Set(this.hashtags.keys());
        
        // Check if hashtags have actually changed
        const hasChanged = currentHashtagKeys.size !== newHashtagKeys.size ||
            [...newHashtagKeys].some(key => !currentHashtagKeys.has(key));
        
        // Only update if there's an actual change
        if (!hasChanged && listContainer.children.length > 0) {
            // Just update the counter if needed
            const header = this.navPanel.querySelector('.hashtag-nav-title');
            if (header) {
                header.textContent = `Hashtags (${this.hashtags.size})`;
            }
            return;
        }
        
        // Clear existing items
        listContainer.innerHTML = '';
        
        if (this.hashtags.size === 0) {
            emptyState.style.display = 'block';
            return;
        } else {
            emptyState.style.display = 'none';
        }
        
        // Group hashtags by conversation turn
        const hashtagsByTurn = new Map();
        
        this.hashtags.forEach((data, key) => {
            const turnKey = data.turnId;
            if (!hashtagsByTurn.has(turnKey)) {
                hashtagsByTurn.set(turnKey, []);
            }
            hashtagsByTurn.get(turnKey).push({ key, ...data });
        });
        
        // Create navigation items without animation class initially
        let itemIndex = 0;
        hashtagsByTurn.forEach((hashtags, turnId) => {
            // Sort hashtags alphabetically within each turn
            hashtags.sort((a, b) => a.hashtag.localeCompare(b.hashtag));
            
            hashtags.forEach(data => {
                const item = document.createElement('div');
                item.className = 'hashtag-nav-item no-animation';
                item.dataset.hashtagKey = data.key; // Store key for comparison
                
                const hashtagSpan = document.createElement('span');
                hashtagSpan.className = 'hashtag-nav-tag';
                hashtagSpan.textContent = data.hashtag;
                
                if (data.multiple) {
                    const multipleSpan = document.createElement('span');
                    multipleSpan.className = 'hashtag-nav-multiple';
                    multipleSpan.textContent = '●●';
                    multipleSpan.title = 'Multiple occurrences';
                    item.appendChild(multipleSpan);
                }
                
                item.appendChild(hashtagSpan);
                
                // Add click handler
                item.addEventListener('click', () => {
                    this.scrollToHashtag(data.key);
                });
                
                listContainer.appendChild(item);
                
                // Add animation only for truly new items with delay
                if (this.isFirstLoad || hasChanged) {
                    setTimeout(() => {
                        item.classList.remove('no-animation');
                        item.classList.add('with-animation');
                    }, itemIndex * 50); // Stagger animation
                    itemIndex++;
                }
            });
        });
        
        // Update counter in header
        const header = this.navPanel.querySelector('.hashtag-nav-title');
        if (header) {
            header.textContent = `Hashtags (${this.hashtags.size})`;
        }
        
        // Mark first load as complete
        if (this.isFirstLoad) {
            this.isFirstLoad = false;
        }
    }

    scrollToHashtag(hashtagKey) {
        const data = this.hashtags.get(hashtagKey);
        if (!data || !data.article) return;
        
        // Make sure the article is visible (in case it was hidden)
        if (data.article.style.display === 'none') {
            data.article.style.display = 'block';
        }
        
        // Find the actual scrollable container in ChatGPT
        // ChatGPT uses a specific structure with overflow-y-auto
        let scrollContainer = document.querySelector('main .overflow-y-auto');
        if (!scrollContainer) {
            // Fallback to main element
            scrollContainer = document.querySelector('main');
        }
        
        // Additional fallback: find any parent with overflow-y set
        if (!scrollContainer) {
            let parent = data.article.parentElement;
            while (parent && parent !== document.body) {
                const style = window.getComputedStyle(parent);
                if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                    scrollContainer = parent;
                    break;
                }
                parent = parent.parentElement;
            }
        }
        
        if (!scrollContainer) {
            console.warn('ScrollLess: Could not find scroll container, using window scroll');
            // Use window scroll as last resort
            data.article.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            
            // Highlight after scroll
            setTimeout(() => {
                this.highlightHashtag(data.element, data.hashtag);
            }, 300);
            return;
        }
        
        // Calculate scroll position
        const articleRect = data.article.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        
        // Calculate the target scroll position
        const currentScroll = scrollContainer.scrollTop;
        const relativeTop = articleRect.top - containerRect.top;
        const targetScroll = currentScroll + relativeTop - this.scrollOffset;
        
        console.log('ScrollLess: Scrolling to hashtag', {
            hashtag: data.hashtag,
            currentScroll,
            targetScroll,
            container: scrollContainer.className
        });
        
        // Perform the scroll
        scrollContainer.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
        });
        
        // Highlight the hashtag after scrolling completes
        setTimeout(() => {
            this.highlightHashtag(data.element, data.hashtag);
        }, 500);
    }

    highlightHashtag(element, hashtag) {
        if (!element) return;
        
        // Create a temporary highlight effect
        const originalHTML = element.innerHTML;
        const highlightedHTML = originalHTML.replace(
            new RegExp(`(${hashtag})`, 'gi'),
            '<mark class="hashtag-highlight">$1</mark>'
        );
        
        element.innerHTML = highlightedHTML;
        
        // Remove highlight after 2 seconds
        setTimeout(() => {
            const marks = element.querySelectorAll('.hashtag-highlight');
            marks.forEach(mark => {
                const text = document.createTextNode(mark.textContent);
                mark.parentNode.replaceChild(text, mark);
            });
        }, 2000);
    }

    setupContentObserver() {
        // Find the main conversation container
        const mainContainer = document.querySelector('main');
        if (!mainContainer) return;
        
        // Disconnect existing observer if any
        if (this.observer) {
            this.observer.disconnect();
        }
        
        // Create a new observer
        this.observer = new MutationObserver((mutations) => {
            // Debounce the scanning
            clearTimeout(this.scanTimeout);
            this.scanTimeout = setTimeout(() => {
                this.scanForHashtags();
            }, 500);
        });
        
        // Start observing
        this.observer.observe(mainContainer, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    show() {
        if (this.navPanel) {
            this.navPanel.classList.add('visible');
            chrome.storage.local.set({ hashtagNavVisible: true });
        }
    }

    hide() {
        if (this.navPanel) {
            this.navPanel.classList.remove('visible');
            chrome.storage.local.set({ hashtagNavVisible: false });
        }
    }

    toggle() {
        if (this.navPanel) {
            if (this.navPanel.classList.contains('visible')) {
                this.hide();
            } else {
                this.show();
                // Only rescan if hashtags might have changed
                const currentCount = document.querySelectorAll('article[data-testid^="conversation-turn-"]').length;
                if (currentCount !== this.lastHashtagCount) {
                    this.scanForHashtags();
                    this.lastHashtagCount = currentCount;
                }
            }
        }
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        if (this.navPanel) {
            this.navPanel.remove();
        }
        this.hashtags.clear();
        this.isInitialized = false;
    }
}

// Import hashtag navigation functionality
let hashtagNavigator = null;

function showAllResponses(showAll) {
    const main = document.getElementsByTagName('main')[0];
    const articles = [...main.querySelectorAll('article')]
    const displayStyle = showAll ? "block" : "none";
    articles.map((article, index) => {
        if (index % 2 !== 0) {
            article.style.display = displayStyle;
        }
    })
}

function toggleDisplay() {
    chrome.storage.local.get(['onDisplay'])
    .then((res) => {
        chrome.storage.local.set({ onDisplay: !res.onDisplay })
        showAllResponses(!res.onDisplay)
    })
}

function toggleArticleDisplay(dialogId) {
    // console.log("toiggleArtDisplay -->", dialogId)
    if (dialogId % 2 === userDialogIdMod2){
        return
    }
    const article = document.querySelector(
        `[data-testid="conversation-turn-${dialogId}"]`
    );
    let displayStyle = article.style.display;
    article.style.display = displayStyle === 'none' ? 'block' : 'none'
}

function getTargetArticle(element) {
    while (element) {
        // console.log('tagName -->', element.tagName)
        if (element.tagName === 'ARTICLE') {
            return element;
        }
        element = element.parentElement;
    }
}

function getYoungestDivs(element) {
    const divs = element.querySelectorAll('div');
    return Array.from(divs).filter(div => !div.querySelector('div'));
}

function getTargetDiv(element) {
    while (element) {
        if (element.tagName === 'DIV') {
            return element;
        }
        element = element.parentElement;
    }
}

function handleClick(e) {
    const article = getTargetArticle(e.target);
    if (!article) return

    let dialogId = article.dataset.testid.split("-")[2]
    dialogId = parseInt(dialogId, 10);
    // console.log('dialogId -->', dialogId)

    let isUserDialog = dialogId % 2 == userDialogIdMod2
    if (!isUserDialog) return
    // console.log('isUserDialog -->', isUserDialog)

    const targetDiv = getTargetDiv(e.target)

    if (!getYoungestDivs(article).includes(targetDiv)) return
    if ([...targetDiv.classList].includes('grid')) return

    toggleArticleDisplay(dialogId + 1)
}

function waitForArticles(timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            const main = document.getElementsByTagName('main')[0];
            const articles = main ? main.querySelectorAll('article[data-testid^="conversation-turn-"]') : null;
            if (articles && articles.length > 0) {
                resolve(true);
            } else if (Date.now() - start > timeoutMs) {
                resolve(false);
            } else {
                setTimeout(check, 250);
            }
        };
        check();
    });
}

async function hideOnLoad() {
    try {
        const result = await chrome.storage.local.get(['hideOnLoad']);
        const isEnabled = result.hideOnLoad === true;
        if (!isEnabled) {
            // Keep onDisplay in sync with current setting
            chrome.storage.local.set({ onDisplay: true });
            return;
        }
        const ready = await waitForArticles();
        if (ready) {
            showAllResponses(false);
            chrome.storage.local.set({ onDisplay: false });
        }
    } catch (e) {
        console.warn('hideOnLoad failed:', e);
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleDisplay') {
        toggleDisplay();
    } else if (message.action === 'urlChanged') {
        // Re-apply hide on SPA or full navigations
        setTimeout(hideOnLoad, 1500);
        // Also reinitialize hashtag navigation
        if (window.location.href.includes('chatgpt.com')) {
            setTimeout(initHashtagNavigation, 800);
        }
    } else if (message.action === 'extractConversation') {
        try {
            const data = extractConversation();
            sendResponse({ ok: true, data });
        } catch (e) {
            console.warn('Failed to extract conversation', e);
            sendResponse({ ok: false, error: String(e) });
        }
        return true; // keep the channel open for async safety
    } else if (message.action === 'insertPrompt') {
        try {
            // ChatGPT uses a contenteditable div with ProseMirror, not a regular textarea
            // Try to find the main contenteditable div first
            let inputElement = document.querySelector('div#prompt-textarea[contenteditable="true"]');
            
            if (!inputElement) {
                // Fallback to ProseMirror class
                inputElement = document.querySelector('.ProseMirror[contenteditable="true"]');
            }
            
            if (!inputElement) {
                // Try the fallback textarea (usually hidden)
                const textarea = document.querySelector('textarea[name="prompt-textarea"]');
                if (textarea) {
                    textarea.value = message.prompt;
                    textarea.style.display = 'block';
                    textarea.focus();
                    const event = new Event('input', { bubbles: true });
                    textarea.dispatchEvent(event);
                    sendResponse({ success: true });
                    return;
                }
            }
            
            if (!inputElement) {
                console.error('Could not find ChatGPT input field');
                sendResponse({ success: false, error: 'Input field not found' });
                return;
            }
            
            // Clear existing content
            inputElement.innerHTML = '';
            
            // Create a paragraph element with the prompt text
            const p = document.createElement('p');
            p.textContent = message.prompt;
            inputElement.appendChild(p);
            
            // Focus the element
            inputElement.focus();
            
            // Move cursor to end of text
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(inputElement);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Trigger input event for ProseMirror
            const inputEvent = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: message.prompt
            });
            inputElement.dispatchEvent(inputEvent);
            
            // Also trigger a change event
            const changeEvent = new Event('change', { bubbles: true });
            inputElement.dispatchEvent(changeEvent);
            
            // Trigger a keyup event to ensure any listeners are notified
            const keyupEvent = new KeyboardEvent('keyup', {
                bubbles: true,
                cancelable: true,
                key: 'Enter',
                code: 'Enter'
            });
            inputElement.dispatchEvent(keyupEvent);
            
            sendResponse({ success: true });
        } catch (e) {
            console.error('Failed to insert prompt:', e);
            sendResponse({ success: false, error: String(e) });
        }
    }
});

function initHashtagNavigation() {
    // Load CSS for hashtag navigation
    if (!document.querySelector('#scrollless-hashtag-nav-styles')) {
        const link = document.createElement('link');
        link.id = 'scrollless-hashtag-nav-styles';
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL('hashtag-nav.css');
        document.head.appendChild(link);
    }

    // Initialize hashtag navigator
    if (!hashtagNavigator) {
        hashtagNavigator = new HashtagNavigator();
        hashtagNavigator.init();
        
        // Restore visibility state
        chrome.storage.local.get(['hashtagNavVisible'], (result) => {
            if (result.hashtagNavVisible) {
                hashtagNavigator.show();
            }
        });
        
        console.log('ScrollLess: Hashtag navigation initialized');
    } else {
        // Re-add toggle button if navigator exists but button is missing
        hashtagNavigator.addToggleButton();
        // Rescan for hashtags in the new conversation
        hashtagNavigator.scanForHashtags();
    }
}

function init() {
    document.addEventListener('click', handleClick);

    // Initialize hashtag navigation if on ChatGPT conversation page
    if (window.location.pathname.startsWith('/c/') || window.location.pathname === '/') {
        setTimeout(initHashtagNavigation, 1000);
    }

    // Watch for URL changes within SPA to re-apply hideOnLoad
    let lastUrl = location.href;
    setInterval(() => {
        const current = location.href;
        if (current !== lastUrl) {
            lastUrl = current;
            setTimeout(hideOnLoad, 1500);
            
            // Reinitialize hashtag navigation on navigation
            if (current.includes('chatgpt.com')) {
                // Shorter delay for navigation updates
                setTimeout(initHashtagNavigation, 800);
            }
        }
    }, 500); // Check more frequently for URL changes
}

setTimeout(init, 500);
setTimeout(hideOnLoad, 1500);

function extractConversation() {
    const main = document.getElementsByTagName('main')[0];
    if (!main) throw new Error('Main element not found');
    const articles = [...main.querySelectorAll('article[data-testid^="conversation-turn-"]')];

    function getConversationIdFromUrl(href) {
        try {
            const m = href.match(/\/c\/([a-f0-9\-]{36})/i);
            return m ? m[1] : null;
        } catch { return null; }
    }

    const items = articles.map((article) => {
        const testId = article.dataset.testid || '';
        let idNum = NaN;
        const m = testId.match(/conversation-turn-(\d+)/);
        if (m) idNum = parseInt(m[1], 10);
        const role = Number.isFinite(idNum) ? (idNum % 2 === userDialogIdMod2 ? 'user' : 'assistant') : undefined;

        // Capture textual content including hidden nodes
        const text = article.textContent?.trim() || '';
        // Try to capture any timestamp elements
        const timeEl = article.querySelector('time');
        const timeText = timeEl ? (timeEl.textContent || '').trim() : undefined;
        const timeISO = timeEl ? (timeEl.getAttribute('datetime') || undefined) : undefined;

        // Attempt to capture message id if present on descendants
        const possibleMsg = article.querySelector('[data-message-id]');
        const messageId = possibleMsg ? possibleMsg.getAttribute('data-message-id') : undefined;

        return {
            index: Number.isFinite(idNum) ? idNum : undefined,
            role,
            text,
            timestampText: timeText,
            timestampISO: timeISO,
            dataTestId: testId || undefined,
            messageId: messageId || undefined
        };
    });

    const data = {
        source: 'chatgpt.com',
        url: location.href,
        conversationId: getConversationIdFromUrl(location.href),
        title: document.title,
        capturedAt: new Date().toISOString(),
        counts: {
            totalTurns: items.length,
            userTurns: items.filter(x => x.role === 'user').length,
            assistantTurns: items.filter(x => x.role === 'assistant').length
        },
        items
    };

    return data;
}

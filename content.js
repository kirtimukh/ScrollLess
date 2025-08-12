const userDialogIdMod2 = 1


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
    } else if (message.action === 'extractConversation') {
        try {
            const data = extractConversation();
            sendResponse({ ok: true, data });
        } catch (e) {
            console.warn('Failed to extract conversation', e);
            sendResponse({ ok: false, error: String(e) });
        }
        return true; // keep the channel open for async safety
    }
});

function init() {
    document.addEventListener('click', handleClick);

    // Watch for URL changes within SPA to re-apply hideOnLoad
    let lastUrl = location.href;
    setInterval(() => {
        const current = location.href;
        if (current !== lastUrl) {
            lastUrl = current;
            setTimeout(hideOnLoad, 1500);
        }
    }, 1000);
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

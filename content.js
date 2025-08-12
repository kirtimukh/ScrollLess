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

function hideOnLoad() {
    chrome.storage.local.get(['hideOnLoad'], (result) => {
        const isEnabled = result.hideOnLoad === true;
        if (isEnabled) {
            showAllResponses(false);
        }
        chrome.storage.local.set({ onDisplay: !isEnabled });
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleDisplay') {
        toggleDisplay();
    } else if (message.action === 'urlChanged') {
        console.log("uurlChanged")
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

    const newDiv = document.createElement("div");
    newDiv.id = "newElement";
    newDiv.textContent = "This is the new element";

    // Append it to the target element
    const target = document.getElementsByTagName("main")[0];
    target.appendChild(newDiv);

    const nav = document.getElementsByTagName('nav')[0];
    if (nav) {
        nav.onclick = (e) => {
            console.log(109, 'hideonload')
            const parentNode = e.target.parentNode
            if (parentNode.tagName !== 'A') return
            const ahref = parentNode.href.substr(parentNode.href.length - 39)
            const pattern = /^\/c\/[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}$/;
            if (pattern.test(ahref)) {
                setTimeout(hideOnLoad, 5000)
        } else {console.log('false')}}
    }
}

setTimeout(init, 2000)
setTimeout(hideOnLoad, 2000)

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

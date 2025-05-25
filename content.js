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
    }
});

function init() {
    document.addEventListener('click', handleClick);
    const nav = document.getElementsByTagName('nav')[0];
    if (nav) {
        nav.onclick = (e) => {
            const parentNode = e.target.parentNode
            if (parentNode.tagName !== 'A') return
            const ahref = parentNode.href.substr(parentNode.href.length - 39)
            const pattern = /^\/c\/[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}$/;
            if (pattern.test(ahref)) {
                setTimeout(hideOnLoad, 2000)
        }}
    }
}

setTimeout(init, 2000)
setTimeout(hideOnLoad, 2000)

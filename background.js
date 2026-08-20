chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open_remover") {
    chrome.tabs.create({ url: chrome.runtime.getURL("remover/remover.html") });
  }
});

const RESTRICTED = /^(chrome|edge|brave|opera|vivaldi|about|chrome-extension|moz-extension|devtools|view-source|data):|^https?:\/\/(chrome\.google\.com\/webstore|chromewebstore\.google\.com)/i;

const UNINSTALL_PAGE = "https://jestemkox123.github.io/Draw-on-Page-Draw-it-Son/uninstall.html";

try {
  chrome.runtime.setUninstallURL(UNINSTALL_PAGE + "?v=" + chrome.runtime.getManifest().version);
} catch (e) {
  console.warn("Draw on Page: could not set uninstall URL:", e);
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id) return;
  if (tab.url && RESTRICTED.test(tab.url)) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["i18n.js", "content.js"]
    });
  } catch (e) {
    console.warn("Draw on Page: cannot run on this page:", e);
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "capture-tab") {
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" }, (dataUrl) => {
      sendResponse({ dataUrl: dataUrl || null, error: chrome.runtime.lastError ? chrome.runtime.lastError.message : null });
    });
    return true;
  }
  if (msg && msg.type === "open-settings") {
    chrome.runtime.openOptionsPage();
  }
});

let lang = "en";

function localize() {
  const dict = window.DRAW_ON_PAGE_I18N[lang] || window.DRAW_ON_PAGE_I18N.en;
  const en = window.DRAW_ON_PAGE_I18N.en;
  const t = (k) => dict[k] || en[k] || k;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll(".lang").forEach(b => {
    b.classList.toggle("active", b.dataset.lang === lang);
  });
}

document.querySelectorAll(".lang").forEach(b => {
  b.addEventListener("click", () => {
    lang = b.dataset.lang;
    chrome.storage.local.get("drawOnPage", (res) => {
      const s = (res && res.drawOnPage) || {};
      s.lang = lang;
      chrome.storage.local.set({ drawOnPage: s });
    });
    localize();
  });
});

document.getElementById("open-settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

chrome.storage.local.get("drawOnPage", (res) => {
  if (res && res.drawOnPage && res.drawOnPage.lang) lang = res.drawOnPage.lang;
  localize();
});

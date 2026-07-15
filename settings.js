const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfxYXDr5FtlULxvAiImaRsGT-uPf0AQRH5g9uUDM_7srHnO9Q/formResponse";
const FORM_ENTRY = "entry.2086043965";

const DEFAULT_KEYS = {
  cursor: "v", pen: "p", highlight: "h", rect: "r",
  ellipse: "e", arrow: "a", line: "l", text: "t",
  pin: "n", blur: "b", laser: "g",
  settings: "s", hidehud: "f", minimize: "m"
};

const DEFAULTS = {
  lang: "en",
  color: "#a78bfa",
  customColor: "",
  width: 8,
  opacity: 100,
  fontSize: 26,
  radius: 6,
  dash: false,
  fill: false,
  fillOpacity: 50,
  arrowHead: 100,
  arrowOutline: false,
  arrowOutlineColor: "#ffffff",
  blurStrength: 10,
  showHints: true,
  smoothPen: true,
  persist: true,
  keys: Object.assign({}, DEFAULT_KEYS)
};

let settings = JSON.parse(JSON.stringify(DEFAULTS));
let t = (k) => k;

function save() {
  chrome.storage.local.set({ drawOnPage: settings });
}

function localize() {
  const dict = window.DRAW_ON_PAGE_I18N[settings.lang] || window.DRAW_ON_PAGE_I18N.en;
  const en = window.DRAW_ON_PAGE_I18N.en;
  t = (k) => dict[k] || en[k] || k;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.title = t("opt_title");
  renderKeys();
}

const sliderRefreshers = [];
function bindSlider(id, key) {
  const input = document.getElementById(id);
  const out = document.getElementById(id + "-out");
  const show = () => { input.value = settings[key]; out.textContent = settings[key]; };
  show();
  sliderRefreshers.push(show);
  input.addEventListener("input", () => {
    settings[key] = +input.value;
    out.textContent = settings[key];
    save();
  });
}

function bindToggles() {
  document.querySelectorAll(".row.toggle").forEach(row => {
    const key = row.dataset.key;
    const sw = row.querySelector(".switch");
    const refresh = () => sw.classList.toggle("on", !!settings[key]);
    refresh();
    sw.addEventListener("click", () => {
      settings[key] = !settings[key];
      refresh();
      save();
    });
  });
}

const KEY_ACTIONS = [
  ["cursor", "tool_cursor"],
  ["pen", "tool_pen"],
  ["highlight", "tool_highlight"],
  ["rect", "tool_rect"],
  ["ellipse", "tool_ellipse"],
  ["arrow", "tool_arrow"],
  ["line", "tool_line"],
  ["text", "tool_text"],
  ["pin", "tool_pin"],
  ["blur", "tool_blur"],
  ["laser", "tool_laser"],
  ["settings", "key_settings"],
  ["hidehud", "key_hidehud"],
  ["minimize", "key_minimize"]
];

function renderKeys() {
  const wrap = document.getElementById("keys");
  wrap.replaceChildren();
  for (const [action, labelKey] of KEY_ACTIONS) {
    const row = document.createElement("div");
    row.className = "row";
    const lab = document.createElement("label");
    lab.textContent = t(labelKey);
    const btn = document.createElement("button");
    btn.className = "keybtn";
    btn.textContent = (settings.keys[action] || "").toUpperCase() || "—";
    btn.addEventListener("click", () => {
      btn.textContent = t("press_key");
      btn.classList.add("listening");
      const onKey = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.removeEventListener("keydown", onKey, true);
        btn.classList.remove("listening");
        if (e.key === "Escape") { renderKeys(); return; }
        const key = e.key.toLowerCase();
        if (!/^[a-z0-9]$/.test(key)) { renderKeys(); return; }
        for (const a in settings.keys) {
          if (settings.keys[a] === key && a !== action) settings.keys[a] = "";
        }
        settings.keys[action] = key;
        save();
        renderKeys();
      };
      window.addEventListener("keydown", onKey, true);
    });
    row.append(lab, btn);
    wrap.appendChild(row);
  }
}

document.getElementById("version").textContent = "v" + chrome.runtime.getManifest().version;

chrome.storage.local.get("drawOnPage", (res) => {
  if (res && res.drawOnPage) {
    const saved = res.drawOnPage;
    for (const k in DEFAULTS) {
      if (k === "keys") Object.assign(settings.keys, saved.keys || {});
      else if (saved[k] !== undefined) settings[k] = saved[k];
    }
  }
  localize();
  bindSlider("fontSize", "fontSize");
  bindSlider("radius", "radius");
  bindToggles();

  const langSel = document.getElementById("lang");
  langSel.value = settings.lang;
  langSel.addEventListener("change", () => {
    settings.lang = langSel.value;
    save();
    localize();
  });
});

const bugText = document.getElementById("bug-text");
const bugSend = document.getElementById("bug-send");
const bugStatus = document.getElementById("bug-status");

bugSend.addEventListener("click", async () => {
  const text = bugText.value.trim();
  if (!text) {
    bugStatus.textContent = t("bug_empty");
    bugStatus.className = "err";
    return;
  }
  bugSend.disabled = true;
  bugStatus.textContent = "…";
  bugStatus.className = "";
  const version = chrome.runtime.getManifest().version;
  const body = FORM_ENTRY + "=" + encodeURIComponent("[BUG v" + version + "] " + text);
  try {
    await fetch(FORM_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    bugText.disabled = true;
    bugStatus.textContent = t("bug_sent");
    bugStatus.className = "ok";
  } catch (e) {
    bugSend.disabled = false;
    bugStatus.textContent = t("bug_error");
    bugStatus.className = "err";
  }
});

document.getElementById("reset").addEventListener("click", () => {
  const lang = settings.lang;
  settings = JSON.parse(JSON.stringify(DEFAULTS));
  settings.lang = lang;
  save();
  localize();
  sliderRefreshers.forEach(f => f());
  document.querySelectorAll(".row.toggle").forEach(row => {
    row.querySelector(".switch").classList.toggle("on", !!settings[row.dataset.key]);
  });
  const status = document.getElementById("reset-status");
  status.textContent = t("reset_done");
  status.className = "ok";
  setTimeout(() => { status.textContent = ""; }, 2500);
});

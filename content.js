(() => {
  "use strict";

  if (window.__drawOnPage) {
    window.__drawOnPage.destroy();
    return;
  }
  const now = Date.now();
  if (window.__drawOnPageLoading && now - window.__drawOnPageLoading < 3000) return;
  window.__drawOnPageLoading = now;

  const MAX_Z = 2147483646;
  const COLORS = ["#a78bfa", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#111111", "#ffffff"];
  const COFFEE_URL = "https://buymeacoffee.com/romanzbudowy";

  const DEFAULT_KEYS = {
    cursor: "v", pen: "p", highlight: "h", rect: "r",
    ellipse: "e", arrow: "a", line: "l", text: "t",
    pin: "n", blur: "b", laser: "g",
    settings: "s", hidehud: "f", minimize: "m"
  };

  const DEFAULTS = {
    lang: "en",
    color: COLORS[0],
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

  const settings = JSON.parse(JSON.stringify(DEFAULTS));

  function start(res) {
    if (res && res.drawOnPage) {
      const saved = res.drawOnPage;
      for (const k in DEFAULTS) {
        if (k === "keys") Object.assign(settings.keys, saved.keys || {});
        else if (saved[k] !== undefined) settings[k] = saved[k];
      }
    }
    delete window.__drawOnPageLoading;
    try {
      init();
    } catch (e) {
      console.warn("Draw on Page:init failed:", e);
      const h = document.getElementById("__draw_on_page_host");
      if (h) h.remove();
      delete window.__drawOnPage;
    }
  }

  try {
    chrome.storage.local.get("drawOnPage", start);
  } catch (e) {
    start(null);
  }

  function saveSettings() {
    try { chrome.storage.local.set({ drawOnPage: settings }); } catch (e) {}
  }

  function init() {
    const dict = (window.DRAW_ON_PAGE_I18N && window.DRAW_ON_PAGE_I18N[settings.lang]) || (window.DRAW_ON_PAGE_I18N && window.DRAW_ON_PAGE_I18N.en) || {};
    const dictEn = (window.DRAW_ON_PAGE_I18N && window.DRAW_ON_PAGE_I18N.en) || {};
    const t = (key) => dict[key] || dictEn[key] || key;
    const keys = settings.keys;
    const keyLabel = (action) => keys[action] ? " (" + keys[action].toUpperCase() + ")" : "";

    const state = {
      tool: "pen",
      drawing: false,
      startX: 0, startY: 0,
      lastX: 0, lastY: 0,
      currentEl: null,
      undoStack: [],
      redoStack: [],
      moved: 0,
      hudHidden: false
    };

    const host = document.createElement("div");
    host.id = "__draw_on_page_host";
    host.style.cssText = `all:initial; position:absolute; left:0; top:0; z-index:${MAX_Z};`;
    document.documentElement.appendChild(host);
    const root = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      * {
        box-sizing: border-box;
        font-family: "Inter", "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
      }

      .overlay {
        position: absolute; left: 0; top: 0;
        pointer-events: auto;
        touch-action: none;
      }
      .overlay.pass { pointer-events: none; }
      .overlay svg { position: absolute; left: 0; top: 0; overflow: visible; }

      .note {
        position: absolute;
        min-width: 20px; min-height: 1em;
        padding: 2px 4px;
        font-weight: 600; line-height: 1.25;
        white-space: pre-wrap;
        outline: none;
        background: transparent;
        text-shadow: 0 1px 2px rgba(0,0,0,.25);
        pointer-events: auto;
      }
      .note[contenteditable="true"] {
        outline: 1.5px dashed currentColor; border-radius: 4px;
        background: rgba(0,0,0,.06);
      }

      .toolbar {
        position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
        display: flex; align-items: center; gap: 3px;
        flex-wrap: wrap; justify-content: center;
        max-width: min(96vw, 760px);
        padding: 7px 9px;
        background: #1b1830;
        color: #e8e4f8;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 14px;
        box-shadow: 0 8px 24px rgba(0,0,0,.4);
        user-select: none; cursor: grab;
        pointer-events: auto;
        transition: opacity .18s ease;
      }
      .toolbar.dragging { cursor: grabbing; }
      .toolbar.hidden { opacity: 0; pointer-events: none; }
      .toolbar > * { flex: 0 0 auto; }

      .btn {
        display: flex; align-items: center; justify-content: center;
        width: 33px; height: 33px;
        border: none; border-radius: 9px;
        background: transparent; color: #b9b0d8;
        cursor: pointer; padding: 0;
        transition: background .12s, color .12s;
      }
      .btn:hover { background: rgba(255,255,255,.08); color: #fff; }
      .btn.active {
        background: linear-gradient(135deg, #7c5cff, #a855f7);
        color: #fff;
        box-shadow: 0 2px 10px rgba(124,92,255,.45);
      }
      .btn svg { width: 18px; height: 18px; display: block; }

      .sep { width: 1px; height: 22px; background: rgba(255,255,255,.1); margin: 0 4px; }

      .swatch {
        width: 21px; height: 21px; border-radius: 50%;
        border: 2px solid rgba(255,255,255,.22);
        cursor: pointer; padding: 0;
        transition: transform .12s, box-shadow .12s;
      }
      .swatch:hover { transform: scale(1.12); }
      .swatch.active {
        border-color: #fff;
        box-shadow: 0 0 0 2px #7c5cff, 0 2px 8px rgba(124,92,255,.5);
      }
      .swatch.custom { background: conic-gradient(#f87171, #facc15, #4ade80, #22d3ee, #818cf8, #e879f9, #f87171); }

      .panel {
        position: fixed;
        width: 250px;
        padding: 16px;
        background: #1b1830;
        color: #e8e4f8;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 14px;
        box-shadow: 0 12px 28px rgba(0,0,0,.45);
        pointer-events: auto;
        display: none;
        user-select: none;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        scrollbar-color: rgba(167,139,250,.45) transparent;
      }
      .panel::-webkit-scrollbar { width: 8px; }
      .panel::-webkit-scrollbar-track { background: transparent; }
      .panel::-webkit-scrollbar-thumb {
        background: rgba(167,139,250,.4);
        border-radius: 999px;
        border: 2px solid transparent;
        background-clip: padding-box;
      }
      .panel::-webkit-scrollbar-thumb:hover { background: rgba(167,139,250,.65); background-clip: padding-box; }
      .panel.open { display: block; }
      .panel h3 {
        margin: 0 0 14px; font-size: 11px; font-weight: 700; color: #8f86b3;
        text-transform: uppercase; letter-spacing: 1.2px;
      }
      .ctl { margin-bottom: 13px; }
      .ctl .top {
        display: flex; align-items: center; justify-content: space-between;
        font-size: 13px; color: #cfc8e8; margin-bottom: 6px;
      }
      .ctl .top output {
        color: #a78bfa; font-size: 11.5px; font-weight: 600;
        background: rgba(124,92,255,.14); border-radius: 6px; padding: 1px 7px;
      }
      .ctl input[type="range"] {
        appearance: none; -webkit-appearance: none;
        width: 100%; height: 5px; border-radius: 99px;
        background: rgba(255,255,255,.12);
        cursor: pointer; margin: 4px 0 0; display: block; outline: none;
      }
      .ctl input[type="range"]::-webkit-slider-thumb {
        appearance: none; -webkit-appearance: none;
        width: 15px; height: 15px; border-radius: 50%;
        background: linear-gradient(135deg, #a78bfa, #7c5cff);
        border: 2px solid #fff;
        box-shadow: 0 1px 6px rgba(0,0,0,.4);
      }
      .trow {
        display: flex; align-items: center; justify-content: space-between;
        font-size: 13px; color: #cfc8e8; margin-bottom: 11px;
      }
      .switch {
        position: relative; width: 36px; height: 20px; border-radius: 99px;
        background: rgba(255,255,255,.14); transition: background .15s; flex: 0 0 auto;
        cursor: pointer;
      }
      .switch::after {
        content: ""; position: absolute; top: 2px; left: 2px;
        width: 16px; height: 16px; border-radius: 50%; background: #cfc8e8;
        transition: left .15s, background .15s;
        box-shadow: 0 1px 3px rgba(0,0,0,.3);
      }
      .switch.on { background: linear-gradient(135deg, #7c5cff, #a855f7); }
      .switch.on::after { left: 18px; background: #fff; }

      .cswatch {
        width: 21px; height: 21px; border-radius: 50%;
        border: 2px solid rgba(255,255,255,.3);
        cursor: pointer; padding: 0; flex: 0 0 auto;
        position: relative; overflow: hidden;
      }
      .cswatch:hover { border-color: #fff; }
      .cswatch input, .swatch.custom input {
        position: absolute; inset: -8px;
        opacity: 0; cursor: pointer;
        padding: 0; border: none;
      }

      .foot {
        display: flex; flex-direction: column; gap: 8px;
        margin-top: 13px; padding-top: 13px; border-top: 1px solid rgba(255,255,255,.09);
        font-size: 13px;
      }
      .foot a, .foot button {
        color: #a78bfa; text-decoration: none; background: none; border: none;
        padding: 0; font-size: 13px; cursor: pointer; text-align: left;
        font-family: inherit;
      }
      .foot a:hover, .foot button:hover { color: #c4b5fd; }

      .bubble {
        position: fixed; top: 14px; right: 14px;
        width: 42px; height: 42px; border-radius: 50%;
        background: linear-gradient(135deg, #7c5cff, #a855f7);
        color: #fff;
        display: none; align-items: center; justify-content: center;
        border: none; cursor: pointer;
        box-shadow: 0 6px 20px rgba(124,92,255,.5);
        pointer-events: auto;
        transition: transform .12s;
      }
      .bubble svg { width: 20px; height: 20px; }
      .bubble:hover { transform: scale(1.08); }
      .bubble.show { display: flex; }

      .hint {
        position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%);
        background: #1b1830;
        border: 1px solid rgba(255,255,255,.08);
        color: #a79dcc;
        font-size: 12px; padding: 6px 14px; border-radius: 99px;
        pointer-events: none;
        transition: opacity .18s ease;
      }
      .hint.hidden { opacity: 0; }

      .blur {
        position: absolute;
        backdrop-filter: blur(var(--blur, 10px));
        -webkit-backdrop-filter: blur(var(--blur, 10px));
        border-radius: 4px;
        pointer-events: none;
      }
      .laser {
        position: absolute;
        border-radius: 50%;
        pointer-events: none;
        animation: strzLaser .6s ease-out forwards;
      }
      @keyframes strzLaser {
        from { opacity: .9; transform: scale(1); }
        to { opacity: 0; transform: scale(.35); }
      }
    `;
    root.appendChild(style);

    const overlay = document.createElement("div");
    overlay.className = "overlay";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    overlay.appendChild(svg);
    root.appendChild(overlay);

    function sizeOverlay() {
      const w = Math.max(document.documentElement.scrollWidth, document.documentElement.clientWidth);
      const h = Math.max(document.documentElement.scrollHeight, document.documentElement.clientHeight);
      overlay.style.width = w + "px";
      overlay.style.height = h + "px";
      svg.setAttribute("width", w);
      svg.setAttribute("height", h);
    }
    sizeOverlay();
    const resizeObs = new ResizeObserver(sizeOverlay);
    resizeObs.observe(document.documentElement);
    function onWindowResize() {
      sizeOverlay();
      positionPanel();
    }
    window.addEventListener("resize", onWindowResize);

    const icons = {
      cursor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3l14 8-6.5 1.5L9 19z"/></svg>',
      pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l4 4L8 20l-5 1 1-5z"/></svg>',
      highlight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 15l-4 4 1-5L16 4l4 4z"/><path d="M3 21h9" stroke-width="4" opacity=".5"/></svg>',
      rect: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="6" width="16" height="12" rx="3"/></svg>',
      ellipse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="12" rx="8" ry="6"/></svg>',
      arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19L19 5M19 5h-7M19 5v7"/></svg>',
      line: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 19L19 5"/></svg>',
      text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 6V4h14v2M12 4v16M9 20h6"/></svg>',
      pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
      blur: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="8" r="1.2"/><circle cx="12" cy="8" r="1.2"/><circle cx="16" cy="8" r="1.2"/><circle cx="8" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="16" cy="12" r="1.2"/><circle cx="8" cy="16" r="1.2"/><circle cx="12" cy="16" r="1.2"/><circle cx="16" cy="16" r="1.2"/></svg>',
      laser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
      dropper: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 7l6 6M4 20l1-4L15 6l3 3L8 19l-4 1zM15 6l2-2a2.1 2.1 0 013 3l-2 2"/></svg>',
      copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>',
      exportfull: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 12l3 3 3-3M12 7v8"/></svg>',
      undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/></svg>',
      redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/></svg>',
      trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
      camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7l1.5-3h3L15 7"/><circle cx="12" cy="13" r="3.5"/></svg>',
      gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h.01a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
      eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/></svg>',
      minimize: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
      close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
    };

    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    root.appendChild(toolbar);

    const toolNames = ["cursor", "pen", "highlight", "rect", "ellipse", "arrow", "line", "text", "pin", "blur", "laser"];
    const toolButtons = {};
    for (const name of toolNames) {
      const b = document.createElement("button");
      b.className = "btn";
      b.innerHTML = icons[name];
      b.addEventListener("click", () => setTool(name));
      toolbar.appendChild(b);
      toolButtons[name] = b;
    }

    toolbar.appendChild(sep());

    const swatches = [];
    function selectSwatch(el) {
      swatches.forEach(x => x.classList.toggle("active", x === el));
      syncCustomInput();
    }
    for (const c of COLORS) {
      const s = document.createElement("button");
      s.className = "swatch";
      s.style.background = c;
      s.title = t("color");
      s.addEventListener("click", () => {
        settings.color = c;
        selectSwatch(s);
        saveSettings();
      });
      toolbar.appendChild(s);
      swatches.push(s);
    }

    const customSwatch = document.createElement("button");
    customSwatch.className = "swatch custom";
    customSwatch.title = t("custom_color");
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    customSwatch.appendChild(colorInput);
    toolbar.appendChild(customSwatch);
    swatches.push(customSwatch);

    function syncCustomInput() {
      colorInput.style.pointerEvents =
        (customSwatch.classList.contains("active") || !settings.customColor) ? "auto" : "none";
    }

    function applyCustomColor(value) {
      settings.color = value;
      settings.customColor = value;
      colorInput.value = value;
      customSwatch.style.background = value;
      selectSwatch(customSwatch);
      syncCustomInput();
      saveSettings();
    }

    customSwatch.addEventListener("click", () => {
      if (settings.customColor && !customSwatch.classList.contains("active")) {
        applyCustomColor(settings.customColor);
      }
    });
    colorInput.addEventListener("input", () => applyCustomColor(colorInput.value));
    colorInput.addEventListener("click", (e) => e.stopPropagation());

    if (window.EyeDropper) {
      const dropBtn = document.createElement("button");
      dropBtn.className = "btn";
      dropBtn.title = t("eyedropper");
      dropBtn.innerHTML = icons.dropper;
      dropBtn.addEventListener("click", async () => {
        try {
          const result = await new window.EyeDropper().open();
          if (result && result.sRGBHex) applyCustomColor(result.sRGBHex);
        } catch (e) {}
      });
      toolbar.appendChild(dropBtn);
    }

    toolbar.appendChild(sep());
    const gearBtn = actionBtn(icons.gear, "", () => togglePanel());
    actionBtn(icons.undo, t("undo"), undo);
    actionBtn(icons.redo, t("redo"), redo);
    actionBtn(icons.trash, t("clear"), clearAll);
    actionBtn(icons.camera, t("screenshot"), screenshot);
    actionBtn(icons.copy, t("copy_clip"), copyToClipboard);
    actionBtn(icons.exportfull, t("export_full"), exportFullPage);
    toolbar.appendChild(sep());
    const eyeBtn = actionBtn(icons.eye, "", toggleHud);
    const minBtn = actionBtn(icons.minimize, "", minimize);
    actionBtn(icons.close, t("close"), () => api.destroy());

    function updateTitles() {
      for (const name of toolNames) toolButtons[name].title = t("tool_" + name) + keyLabel(name);
      gearBtn.title = t("settings") + keyLabel("settings");
      eyeBtn.title = t("hide_hud") + keyLabel("hidehud");
      minBtn.title = t("minimize") + keyLabel("minimize");
    }
    updateTitles();

    const bubble = document.createElement("button");
    bubble.className = "bubble";
    bubble.title = t("expand");
    bubble.innerHTML = icons.pen;
    bubble.addEventListener("click", restore);
    root.appendChild(bubble);

    const hint = document.createElement("div");
    hint.className = "hint";
    root.appendChild(hint);

    const panel = document.createElement("div");
    panel.className = "panel";
    const panelTitle = document.createElement("h3");
    panelTitle.textContent = t("settings");
    panel.appendChild(panelTitle);
    root.appendChild(panel);

    const refreshers = [];

    function sliderRow(labelKey, key, min, max, unit) {
      const ctl = document.createElement("div");
      ctl.className = "ctl";
      const top = document.createElement("div");
      top.className = "top";
      const lab = document.createElement("span");
      lab.textContent = t(labelKey);
      const out = document.createElement("output");
      top.append(lab, out);
      const input = document.createElement("input");
      input.type = "range";
      input.min = min;
      input.max = max;
      const refresh = () => {
        input.value = settings[key];
        out.textContent = settings[key] + unit;
      };
      refresh();
      refreshers.push(refresh);
      input.addEventListener("input", () => {
        settings[key] = +input.value;
        out.textContent = settings[key] + unit;
        saveSettings();
      });
      ctl.append(top, input);
      panel.appendChild(ctl);
    }

    function toggleRow(labelKey, key, onChange) {
      const row = document.createElement("div");
      row.className = "trow";
      const lab = document.createElement("span");
      lab.textContent = t(labelKey);
      if (key === "fill") lab.title = t("fill_hint");
      const sw = document.createElement("div");
      sw.className = "switch";
      const refresh = () => sw.classList.toggle("on", !!settings[key]);
      refresh();
      refreshers.push(refresh);
      sw.addEventListener("click", () => {
        settings[key] = !settings[key];
        refresh();
        saveSettings();
        if (onChange) onChange();
      });
      row.append(lab, sw);
      panel.appendChild(row);
    }

    function colorRow(labelKey, key) {
      const row = document.createElement("div");
      row.className = "trow";
      const lab = document.createElement("span");
      lab.textContent = t(labelKey);
      const sw = document.createElement("button");
      sw.className = "cswatch";
      const input = document.createElement("input");
      input.type = "color";
      sw.appendChild(input);
      const refresh = () => {
        sw.style.background = settings[key];
        input.value = /^#[0-9a-f]{6}$/i.test(settings[key]) ? settings[key] : "#ffffff";
      };
      refresh();
      refreshers.push(refresh);
      input.addEventListener("input", () => {
        settings[key] = input.value;
        sw.style.background = input.value;
        saveSettings();
      });
      input.addEventListener("click", (e) => e.stopPropagation());
      row.append(lab, sw);
      panel.appendChild(row);
    }

    sliderRow("width", "width", 1, 20, "");
    sliderRow("opacity", "opacity", 10, 100, "%");
    sliderRow("text_size", "fontSize", 12, 64, "");
    sliderRow("radius", "radius", 0, 24, "");
    sliderRow("fill_opacity", "fillOpacity", 10, 100, "%");
    sliderRow("arrow_head", "arrowHead", 50, 200, "%");
    sliderRow("blur_strength", "blurStrength", 2, 30, "");
    toggleRow("dashed", "dash");
    toggleRow("fill", "fill");
    toggleRow("arrow_outline", "arrowOutline");
    colorRow("arrow_outline_color", "arrowOutlineColor");
    toggleRow("persist", "persist", () => {
      if (settings.persist) saveDrawings();
      else clearStoredDrawings();
    });

    const foot = document.createElement("div");
    foot.className = "foot";
    const resetBtn = document.createElement("button");
    resetBtn.textContent = "↺ " + t("reset");
    resetBtn.addEventListener("click", resetSettings);
    const allBtn = document.createElement("button");
    allBtn.textContent = "⚙ " + t("all_settings");
    allBtn.addEventListener("click", () => {
      try { chrome.runtime.sendMessage({ type: "open-settings" }); } catch (e) {}
    });
    const coffee = document.createElement("a");
    coffee.href = COFFEE_URL;
    coffee.target = "_blank";
    coffee.rel = "noopener";
    coffee.textContent = "☕ " + t("coffee");
    foot.append(resetBtn, allBtn, coffee);
    panel.appendChild(foot);

    function resetSettings() {
      const lang = settings.lang;
      const fresh = JSON.parse(JSON.stringify(DEFAULTS));
      for (const k in fresh) {
        if (k === "keys") Object.assign(settings.keys, DEFAULT_KEYS);
        else settings[k] = fresh[k];
      }
      settings.lang = lang;
      saveSettings();
      refreshers.forEach(f => f());
      selectSwatch(swatches[0]);
      customSwatch.style.background = "";
      colorInput.value = DEFAULTS.color;
      applyHintVisibility();
      updateTitles();
      hint.textContent = t("reset_done");
    }

    function positionPanel() {
      if (!panel.classList.contains("open")) return;
      const gap = 8;
      const r = toolbar.getBoundingClientRect();

      let left = r.left;
      if (left + 250 > window.innerWidth - gap) left = window.innerWidth - 250 - gap;
      panel.style.left = Math.round(Math.max(gap, left)) + "px";

      const below = window.innerHeight - r.bottom - gap * 2;
      const above = r.top - gap * 2;
      panel.style.maxHeight = "none";
      const wanted = panel.offsetHeight;
      const openUp = wanted > below && above > below;
      const room = Math.max(120, openUp ? above : below);
      panel.style.maxHeight = room + "px";
      const h = Math.min(wanted, room);
      panel.style.top = Math.round(openUp ? Math.max(gap, r.top - gap - h) : r.bottom + gap) + "px";
    }

    function togglePanel(open) {
      const willOpen = open === undefined ? !panel.classList.contains("open") : open;
      panel.classList.toggle("open", willOpen);
      gearBtn.classList.toggle("active", willOpen);
      if (willOpen) {
        refreshers.forEach(f => f());
        positionPanel();
      }
    }
    function closePanel() {
      togglePanel(false);
    }

    function minimize() {
      closePanel();
      toolbar.classList.add("hidden");
      hint.classList.add("hidden");
      bubble.classList.add("show");
      overlay.classList.add("pass");
    }
    function restore() {
      bubble.classList.remove("show");
      toolbar.classList.remove("hidden");
      hint.classList.remove("hidden");
      setTool(state.tool);
    }

    function toggleHud() {
      state.hudHidden = !state.hudHidden;
      closePanel();
      toolbar.classList.toggle("hidden", state.hudHidden);
      if (state.hudHidden) {
        hint.style.display = "";
        hint.classList.remove("hidden");
        hint.textContent = t("hint_hud_hidden").replace("{key}", (keys.hidehud || "f").toUpperCase());
        setTimeout(() => { if (state.hudHidden) applyHintVisibility(); }, 2500);
      } else {
        applyHintVisibility();
        setTool(state.tool);
      }
    }

    function applyHintVisibility() {
      hint.style.display = settings.showHints && !state.hudHidden ? "" : "none";
    }

    function sep() {
      const d = document.createElement("div");
      d.className = "sep";
      return d;
    }
    function actionBtn(icon, title, fn) {
      const b = document.createElement("button");
      b.className = "btn";
      b.title = title;
      b.innerHTML = icon;
      b.addEventListener("click", fn);
      toolbar.appendChild(b);
      return b;
    }

    (() => {
      let sx, sy, ox, oy, drag = false;
      toolbar.addEventListener("pointerdown", (e) => {
        if (e.target.closest("button")) return;
        drag = true; toolbar.classList.add("dragging");
        const r = toolbar.getBoundingClientRect();
        sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
        toolbar.setPointerCapture(e.pointerId);
      });
      toolbar.addEventListener("pointermove", (e) => {
        if (!drag) return;
        toolbar.style.left = (ox + e.clientX - sx) + "px";
        toolbar.style.top = Math.max(4, oy + e.clientY - sy) + "px";
        toolbar.style.transform = "none";
        closePanel();
      });
      toolbar.addEventListener("pointerup", () => { drag = false; toolbar.classList.remove("dragging"); });
    })();

    function setTool(name) {
      state.tool = name;
      for (const k in toolButtons) toolButtons[k].classList.toggle("active", k === name);
      overlay.classList.toggle("pass", name === "cursor");
      overlay.style.cursor = name === "cursor" ? "" : (name === "text" ? "text" : "crosshair");
      hint.textContent = t("hint_" + name);
    }

    const SVGNS = "http://www.w3.org/2000/svg";
    function svgEl(tag, attrs) {
      const el = document.createElementNS(SVGNS, tag);
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      return el;
    }

    function pagePoint(e) {
      return { x: e.clientX + window.scrollX, y: e.clientY + window.scrollY };
    }

    function snap45(x0, y0, x1, y1) {
      const dx = x1 - x0, dy = y1 - y0;
      const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
      const len = Math.hypot(dx, dy);
      return { x: x0 + len * Math.cos(ang), y: y0 + len * Math.sin(ang) };
    }

    function strokeAttrs(sw) {
      const a = {
        stroke: settings.color,
        "stroke-width": sw,
        opacity: String(settings.opacity / 100)
      };
      if (settings.dash) a["stroke-dasharray"] = `${sw * 3} ${sw * 2}`;
      return a;
    }
    function fillAttrs() {
      return settings.fill
        ? { fill: settings.color, "fill-opacity": String(settings.fillOpacity / 100) }
        : { fill: "none" };
    }

    overlay.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || state.tool === "cursor") return;
      if (e.target.classList && e.target.classList.contains("note")) return;

      closePanel();
      commitOpenNote();
      const p = pagePoint(e);

      if (state.tool === "text") {
        createNote(p.x, p.y);
        e.preventDefault();
        return;
      }

      if (state.tool === "pin") {
        createPin(p.x, p.y);
        e.preventDefault();
        return;
      }

      state.drawing = true;
      state.startX = p.x; state.startY = p.y;
      state.lastX = p.x; state.lastY = p.y;
      state.moved = 0;
      overlay.setPointerCapture(e.pointerId);

      if (state.tool === "blur") {
        const b = document.createElement("div");
        b.className = "blur";
        b.style.left = p.x + "px";
        b.style.top = p.y + "px";
        b.style.width = "0px";
        b.style.height = "0px";
        b.style.setProperty("--blur", settings.blurStrength + "px");
        overlay.appendChild(b);
        state.currentEl = b;
        e.preventDefault();
        return;
      }

      const sw = state.tool === "highlight" ? settings.width * 4 : settings.width;

      switch (state.tool) {
        case "pen":
        case "highlight": {
          const attrs = strokeAttrs(sw);
          if (state.tool === "highlight") attrs.opacity = String(0.45 * settings.opacity / 100);
          state.currentEl = svgEl("path", Object.assign({
            d: `M ${p.x} ${p.y}`,
            fill: "none",
            "stroke-linecap": "round", "stroke-linejoin": "round"
          }, attrs));
          break;
        }
        case "rect":
          state.currentEl = svgEl("rect", Object.assign({
            x: p.x, y: p.y, width: 0, height: 0, rx: settings.radius
          }, fillAttrs(), strokeAttrs(sw)));
          break;
        case "ellipse":
          state.currentEl = svgEl("ellipse", Object.assign({
            cx: p.x, cy: p.y, rx: 0, ry: 0
          }, fillAttrs(), strokeAttrs(sw)));
          break;
        case "line":
          state.currentEl = svgEl("line", Object.assign({
            x1: p.x, y1: p.y, x2: p.x, y2: p.y,
            "stroke-linecap": "round"
          }, strokeAttrs(sw)));
          break;
        case "arrow": {
          const g = svgEl("g", {
            "stroke-linecap": "round",
            opacity: String(settings.opacity / 100)
          });
          const dashAttr = settings.dash ? { "stroke-dasharray": `${sw * 3} ${sw * 2}` } : {};
          if (settings.arrowOutline) {
            const oc = settings.arrowOutlineColor;
            const ow = Math.max(2, sw * 0.6);
            g.appendChild(svgEl("line", Object.assign({
              x1: p.x, y1: p.y, x2: p.x, y2: p.y,
              stroke: oc, "stroke-width": sw + ow * 2
            }, dashAttr)));
            g.appendChild(svgEl("polygon", {
              points: "", fill: oc, stroke: oc,
              "stroke-width": ow * 2, "stroke-linejoin": "round"
            }));
          }
          g.appendChild(svgEl("line", Object.assign({
            x1: p.x, y1: p.y, x2: p.x, y2: p.y,
            stroke: settings.color, "stroke-width": sw
          }, dashAttr)));
          g.appendChild(svgEl("polygon", { points: "", fill: settings.color, stroke: "none" }));
          state.currentEl = g;
          break;
        }
      }
      if (state.currentEl) svg.appendChild(state.currentEl);
      e.preventDefault();
    });

    overlay.addEventListener("pointermove", (e) => {
      if (state.tool === "laser") { spawnLaser(pagePoint(e)); return; }
      if (!state.drawing || !state.currentEl) return;
      let p = pagePoint(e);
      const el = state.currentEl;
      state.moved = Math.max(state.moved, Math.hypot(p.x - state.startX, p.y - state.startY));

      if (state.tool === "blur") {
        const x = Math.min(state.startX, p.x), y = Math.min(state.startY, p.y);
        el.style.left = x + "px";
        el.style.top = y + "px";
        el.style.width = Math.abs(p.x - state.startX) + "px";
        el.style.height = Math.abs(p.y - state.startY) + "px";
        return;
      }

      switch (state.tool) {
        case "pen":
        case "highlight": {
          if (settings.smoothPen) {
            const mx = (state.lastX + p.x) / 2, my = (state.lastY + p.y) / 2;
            el.setAttribute("d", el.getAttribute("d") + ` Q ${state.lastX} ${state.lastY} ${mx} ${my}`);
          } else {
            el.setAttribute("d", el.getAttribute("d") + ` L ${p.x} ${p.y}`);
          }
          state.lastX = p.x; state.lastY = p.y;
          break;
        }
        case "rect": {
          let w = p.x - state.startX, h = p.y - state.startY;
          if (e.shiftKey) { const s = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * s; h = Math.sign(h || 1) * s; }
          el.setAttribute("x", Math.min(state.startX, state.startX + w));
          el.setAttribute("y", Math.min(state.startY, state.startY + h));
          el.setAttribute("width", Math.abs(w));
          el.setAttribute("height", Math.abs(h));
          break;
        }
        case "ellipse": {
          let rx = Math.abs(p.x - state.startX) / 2, ry = Math.abs(p.y - state.startY) / 2;
          if (e.shiftKey) rx = ry = Math.max(rx, ry);
          el.setAttribute("cx", (state.startX + p.x) / 2);
          el.setAttribute("cy", (state.startY + p.y) / 2);
          el.setAttribute("rx", rx);
          el.setAttribute("ry", ry);
          break;
        }
        case "line": {
          if (e.shiftKey) p = snap45(state.startX, state.startY, p.x, p.y);
          el.setAttribute("x2", p.x);
          el.setAttribute("y2", p.y);
          break;
        }
        case "arrow": {
          if (e.shiftKey) p = snap45(state.startX, state.startY, p.x, p.y);
          const kids = el.children;
          const line = kids[kids.length - 2], head = kids[kids.length - 1];
          const dx = p.x - state.startX, dy = p.y - state.startY;
          const len = Math.hypot(dx, dy) || 1;
          const sw = parseFloat(line.getAttribute("stroke-width"));
          const base = Math.max(14, sw * 4) * (settings.arrowHead / 100);
          const hl = Math.min(base, len * 0.6);
          const ux = dx / len, uy = dy / len;
          const backX = p.x - ux * hl, backY = p.y - uy * hl;
          const notchX = p.x - ux * hl * 0.72, notchY = p.y - uy * hl * 0.72;
          const wx = -uy * hl * 0.48, wy = ux * hl * 0.48;
          const points =
            `${p.x},${p.y} ${backX + wx},${backY + wy} ${notchX},${notchY} ${backX - wx},${backY - wy}`;
          line.setAttribute("x2", notchX);
          line.setAttribute("y2", notchY);
          head.setAttribute("points", points);
          if (kids.length === 4) {
            kids[0].setAttribute("x2", notchX);
            kids[0].setAttribute("y2", notchY);
            kids[1].setAttribute("points", points);
          }
          break;
        }
      }
    });

    function endStroke() {
      if (!state.drawing) return;
      state.drawing = false;
      const el = state.currentEl;
      state.currentEl = null;
      if (!el) return;
      if (state.tool !== "pen" && state.tool !== "highlight" && state.moved < 3) {
        el.remove();
        return;
      }
      pushUndo(el);
    }
    overlay.addEventListener("pointerup", endStroke);
    overlay.addEventListener("pointercancel", endStroke);

    let openNote = null;
    function createNote(x, y) {
      const note = document.createElement("div");
      note.className = "note";
      note.contentEditable = "true";
      note.style.left = x + "px";
      note.style.top = (y - settings.fontSize * 0.7) + "px";
      note.style.color = settings.color;
      note.style.fontSize = settings.fontSize + "px";
      note.style.opacity = String(settings.opacity / 100);
      overlay.appendChild(note);
      openNote = note;
      setTimeout(() => note.focus(), 0);

      note.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text/plain");
        document.execCommand("insertText", false, text);
      });
      note.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Escape") { e.preventDefault(); commitOpenNote(); }
      });
      note.addEventListener("blur", () => commitOpenNote());
      note.addEventListener("pointerdown", (e) => e.stopPropagation());
    }
    function commitOpenNote() {
      if (!openNote) return;
      const n = openNote;
      openNote = null;
      if (!n.textContent.trim()) { n.remove(); return; }
      n.contentEditable = "false";
      pushUndo(n);
    }

    function pushUndo(el) {
      state.undoStack.push(el);
      state.redoStack.length = 0;
      scheduleSave();
    }
    function undo() {
      const el = state.undoStack.pop();
      if (!el) return;
      el.remove();
      state.redoStack.push(el);
      scheduleSave();
    }
    function redo() {
      const el = state.redoStack.pop();
      if (!el) return;
      (el instanceof SVGElement ? svg : overlay).appendChild(el);
      state.undoStack.push(el);
      scheduleSave();
    }
    function clearAll() {
      commitOpenNote();
      svg.replaceChildren();
      overlay.querySelectorAll(".note, .blur").forEach(n => n.remove());
      state.undoStack.length = 0;
      state.redoStack.length = 0;
      scheduleSave();
    }

    function pinTextColor(hex) {
      const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
      if (!m) return "#ffffff";
      const n = parseInt(m[1], 16);
      const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum > 0.6 ? "#111111" : "#ffffff";
    }
    function createPin(x, y) {
      const n = svg.querySelectorAll("[data-pin]").length + 1;
      const r = Math.max(13, settings.width * 2.2);
      const g = svgEl("g", { "data-pin": "1", opacity: String(settings.opacity / 100) });
      g.appendChild(svgEl("circle", {
        cx: x, cy: y, r,
        fill: settings.color, stroke: "#ffffff", "stroke-width": Math.max(2, r * 0.16)
      }));
      const txt = svgEl("text", {
        x, y, "text-anchor": "middle", "dominant-baseline": "central",
        "font-size": r * 1.05, "font-weight": "700",
        "font-family": "system-ui, sans-serif",
        fill: pinTextColor(settings.color), "pointer-events": "none"
      });
      txt.textContent = String(n);
      g.appendChild(txt);
      svg.appendChild(g);
      pushUndo(g);
    }

    let laserLast = 0;
    function spawnLaser(p) {
      const now = performance.now();
      if (now - laserLast < 14) return;
      laserLast = now;
      const size = Math.max(12, settings.width * 2.4);
      const dot = document.createElement("div");
      dot.className = "laser";
      dot.style.left = (p.x - size / 2) + "px";
      dot.style.top = (p.y - size / 2) + "px";
      dot.style.width = size + "px";
      dot.style.height = size + "px";
      dot.style.background = `radial-gradient(circle, ${settings.color} 0%, ${settings.color} 35%, transparent 72%)`;
      dot.style.boxShadow = `0 0 ${size}px ${settings.color}`;
      overlay.appendChild(dot);
      dot.addEventListener("animationend", () => dot.remove());
    }

    const pageKey = "draw:" + location.origin + location.pathname;
    let saveTimer = null;
    function scheduleSave() {
      if (!settings.persist) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveDrawings, 400);
    }
    function saveDrawings() {
      if (!settings.persist) return;
      try {
        const els = [];
        overlay.querySelectorAll(".note, .blur").forEach(el => els.push(el.outerHTML));
        const svgHTML = svg.innerHTML;
        if (!svgHTML && els.length === 0) { chrome.storage.local.remove(pageKey); return; }
        chrome.storage.local.set({ [pageKey]: { svg: svgHTML, overlay: els, ts: Date.now() } });
      } catch (e) {}
    }
    function clearStoredDrawings() {
      try { chrome.storage.local.remove(pageKey); } catch (e) {}
    }
    function loadDrawings() {
      if (!settings.persist) return;
      try {
        chrome.storage.local.get(pageKey, (res) => {
          const data = res && res[pageKey];
          if (!data) return;
          if (data.svg) svg.innerHTML = data.svg;
          if (data.overlay && data.overlay.length) {
            const tmp = document.createElement("div");
            data.overlay.forEach(html => {
              tmp.innerHTML = html;
              const el = tmp.firstElementChild;
              if (!el) return;
              if (!el.classList.contains("note") && !el.classList.contains("blur")) return;
              if (el.classList.contains("note")) {
                el.contentEditable = "false";
                el.textContent = el.textContent;
              }
              el.querySelectorAll("script, iframe, object, embed").forEach(n => n.remove());
              overlay.appendChild(el);
            });
          }
          state.undoStack = [];
          svg.querySelectorAll(":scope > *").forEach(el => state.undoStack.push(el));
          overlay.querySelectorAll(".note, .blur").forEach(el => state.undoStack.push(el));
        });
      } catch (e) {}
    }

    let hintTimer = null;
    function flashHint(text, ms) {
      clearTimeout(hintTimer);
      hint.style.display = "";
      hint.classList.remove("hidden");
      hint.textContent = text;
      hintTimer = setTimeout(() => { setTool(state.tool); applyHintVisibility(); }, ms || 1800);
    }
    function hideUI() {
      toolbar.style.visibility = "hidden";
      hint.style.visibility = "hidden";
      bubble.style.visibility = "hidden";
    }
    function showUI() {
      toolbar.style.visibility = "";
      hint.style.visibility = "";
      bubble.style.visibility = "";
    }
    const raf2 = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const loadImage = (src) => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });

    async function screenshot() {
      commitOpenNote();
      closePanel();
      hideUI();
      await raf2();
      try {
        const res = await chrome.runtime.sendMessage({ type: "capture-tab" });
        if (res && res.dataUrl) {
          const a = document.createElement("a");
          a.href = res.dataUrl;
          a.download = "draw-on-page-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".png";
          a.click();
        }
      } catch (e) {
        console.warn("Draw on Page:screenshot failed:", e);
      } finally {
        showUI();
      }
    }

    async function copyToClipboard() {
      commitOpenNote();
      closePanel();
      hideUI();
      await raf2();
      let ok = false;
      try {
        const res = await chrome.runtime.sendMessage({ type: "capture-tab" });
        if (res && res.dataUrl) {
          const blob = await (await fetch(res.dataUrl)).blob();
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          ok = true;
        }
      } catch (e) {
        console.warn("Draw on Page:clipboard failed:", e);
      } finally {
        showUI();
      }
      if (ok) flashHint(t("copied"));
    }

    let exporting = false;
    async function exportFullPage() {
      if (exporting) return;
      exporting = true;
      commitOpenNote();
      closePanel();
      hideUI();
      const docEl = document.documentElement;
      const dpr = window.devicePixelRatio || 1;
      const fullH = Math.max(docEl.scrollHeight, docEl.clientHeight);
      const fullW = docEl.clientWidth;
      const vpH = window.innerHeight;
      const origScroll = window.scrollY;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(fullW * dpr);
      canvas.height = Math.round(fullH * dpr);
      const ctx = canvas.getContext("2d");
      let ok = false;
      try {
        let y = 0;
        while (y < fullH) {
          window.scrollTo(0, y);
          await new Promise(r => setTimeout(r, 650));
          const res = await chrome.runtime.sendMessage({ type: "capture-tab" });
          if (!res || !res.dataUrl) throw new Error(res && res.error ? res.error : "capture failed");
          const img = await loadImage(res.dataUrl);
          ctx.drawImage(img, 0, Math.round(window.scrollY * dpr), img.width, img.height);
          if (window.scrollY + vpH >= fullH) break;
          y += vpH;
        }
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = "draw-on-page-full-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".png";
        a.click();
        ok = true;
      } catch (e) {
        console.warn("Draw on Page:full-page export failed:", e);
      } finally {
        window.scrollTo(0, origScroll);
        showUI();
        exporting = false;
      }
      if (!ok) flashHint(t("export_failed"), 2500);
    }

    function consume(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }

    function onKeyDown(e) {
      if (openNote) return;
      const target = e.composedPath()[0];
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;

      if (e.key === "Escape") {
        consume(e);
        if (state.hudHidden) { toggleHud(); return; }
        if (panel.classList.contains("open")) { closePanel(); return; }
        api.destroy();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === "z" && !e.shiftKey) { consume(e); undo(); return; }
        if (k === "y" || (k === "z" && e.shiftKey)) { consume(e); redo(); return; }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      const action = Object.keys(keys).find(a => keys[a] === key);
      if (!action) return;
      consume(e);
      if (action === "settings") { togglePanel(); return; }
      if (action === "hidehud") { toggleHud(); return; }
      if (action === "minimize") {
        bubble.classList.contains("show") ? restore() : minimize();
        return;
      }
      setTool(action);
    }
    window.addEventListener("keydown", onKeyDown, true);

    function onStorageChanged(changes, area) {
      if (area !== "local" || !changes.drawOnPage || !changes.drawOnPage.newValue) return;
      const nv = changes.drawOnPage.newValue;
      for (const k in DEFAULTS) {
        if (k === "keys") {
          Object.assign(keys, DEFAULT_KEYS, nv.keys || {});
        } else if (nv[k] !== undefined) {
          settings[k] = nv[k];
        }
      }
      refreshers.forEach(f => f());
      applyHintVisibility();
      updateTitles();
    }
    try { chrome.storage.onChanged.addListener(onStorageChanged); } catch (e) {}

    const api = {
      destroy() {
        window.removeEventListener("keydown", onKeyDown, true);
        window.removeEventListener("resize", onWindowResize);
        try { chrome.storage.onChanged.removeListener(onStorageChanged); } catch (e) {}
        resizeObs.disconnect();
        host.style.transition = "opacity .15s ease";
        host.style.opacity = "0";
        setTimeout(() => host.remove(), 160);
        delete window.__drawOnPage;
        delete window.__drawOnPageLoading;
      }
    };
    window.__drawOnPage = api;

    const savedIdx = COLORS.indexOf(settings.color);
    if (savedIdx >= 0) {
      selectSwatch(swatches[savedIdx]);
    } else if (settings.customColor) {
      customSwatch.style.background = settings.customColor;
      colorInput.value = settings.customColor;
      selectSwatch(customSwatch);
    } else {
      settings.color = DEFAULTS.color;
      selectSwatch(swatches[0]);
    }
    if (settings.customColor && savedIdx >= 0) {
      customSwatch.style.background = settings.customColor;
      colorInput.value = settings.customColor;
    }
    applyHintVisibility();
    setTool("pen");
    loadDrawings();

    requestAnimationFrame(() => {
      const r = toolbar.getBoundingClientRect();
      toolbar.style.left = Math.round(r.left) + "px";
      toolbar.style.top = Math.round(r.top) + "px";
      toolbar.style.transform = "none";
    });
  }
})();

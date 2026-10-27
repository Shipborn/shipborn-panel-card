/*!
 * Shipborn Panel Card
 * Console-style control panels (buttons with status LEDs, emergency stops,
 * throttle levers, knobs, embedded screens) for Home Assistant dashboards.
 */
const VERSION = "0.1.0";

const LED_COLORS = {
  green: "#35d07f",
  red: "#ff3b3b",
  amber: "#ffb020",
  yellow: "#ffe14d",
  blue: "#3fa9ff",
  white: "#ffffff",
};

// Panel outlines as fractions of width/height
const SHAPES = {
  rect: [[0, 0], [1, 0], [1, 1], [0, 1]],
  "wedge-left": [[0, 0], [1, 0], [1, 0.52], [0.055, 1]],
  "wedge-right": [[0, 0], [1, 0], [0.945, 1], [0, 0.52]],
};

const ON_STATES = ["on", "open", "opening", "unlocked", "home", "active", "running", "playing", "true"];

const STYLE = `
  :host { display: block; }
  .outer { position: relative; width: 100%; overflow: hidden; }
  .panel {
    position: absolute; top: 0; left: 0; transform-origin: 0 0;
    font-family: "Arial Narrow", "Roboto Condensed", Roboto, Arial, sans-serif;
    color: #fff; -webkit-font-smoothing: antialiased;
  }
  .shape { position: absolute; inset: 0; overflow: visible; }
  .item { position: absolute; box-sizing: border-box; }

  /* Groups */
  .group-title {
    display: flex; align-items: center; justify-content: center; gap: 5px;
    height: 10px; font-size: 7.5px; font-weight: 700; letter-spacing: .2px;
    white-space: nowrap; text-transform: uppercase;
  }
  .group-title.line::before, .group-title.line::after {
    content: ""; flex: 1; height: 1px; background: #d8d8d8;
  }
  .group-title.serif { font-family: Georgia, "Times New Roman", serif; font-size: 6.5px; }
  .grid { display: grid; justify-content: center; }

  /* Buttons */
  .btn-wrap { position: relative; }
  .btn {
    box-sizing: border-box; width: var(--bw); height: var(--bh);
    background-color: #141414; border: 1px solid #e6e6e6; border-radius: 2.5px;
    color: #fff; font-family: inherit; font-size: var(--bfs, 5px); font-weight: 700;
    line-height: 1.15; text-transform: uppercase; white-space: pre-line;
    padding: 1px; margin: 0; display: flex; align-items: center; justify-content: center;
    text-align: center; cursor: pointer; user-select: none; -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent; touch-action: manipulation;
    transition: background-color .1s, box-shadow .15s;
  }
  .btn.wide { border-color: #3a3a3a; background-color: #0c0c0c; font-weight: 400; text-transform: none; }
  .btn:hover { background-color: #1d1d1d; }
  .btn:active, .btn.pressed { background-color: #333; }
  .btn.active { box-shadow: inset 0 0 0 1px rgba(255,255,255,.25); }
  .btn.dashed {
    --c: #e6e6e6; border: none;
    background-image:
      linear-gradient(var(--c),var(--c)), linear-gradient(var(--c),var(--c)),
      linear-gradient(var(--c),var(--c)), linear-gradient(var(--c),var(--c)),
      linear-gradient(var(--c),var(--c)), linear-gradient(var(--c),var(--c)),
      linear-gradient(var(--c),var(--c)), linear-gradient(var(--c),var(--c));
    background-size: 8px 1px, 1px 8px, 8px 1px, 1px 8px, 8px 1px, 1px 8px, 8px 1px, 1px 8px;
    background-position: 0 0, 0 0, 100% 0, 100% 0, 0 100%, 0 100%, 100% 100%, 100% 100%;
    background-repeat: no-repeat;
  }
  .btn.unavailable { opacity: .35; cursor: not-allowed; }
  .led {
    position: absolute; top: 2px; right: -7.5px; width: 4.5px; height: 4.5px;
    border-radius: 50%; background: var(--led); opacity: .2; pointer-events: none;
  }
  .led.on { opacity: 1; box-shadow: 0 0 2px var(--led), 0 0 6px var(--led); }
  .led.on.blink { animation: blink 1s steps(2, start) infinite; }
  @keyframes blink { to { opacity: .15; box-shadow: none; } }

  /* Emergency stop */
  .estop { cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .estop svg { width: 100%; height: 100%; display: block; overflow: visible; }
  .estop:active .es-red { filter: brightness(.8); }
  .estop.active .es-red { animation: estop 0.8s ease-in-out infinite alternate; }
  @keyframes estop { from { fill: #d6262b; } to { fill: #ff5a5a; } }
  .estop.unavailable { opacity: .5; }

  /* Throttle */
  .throttle { background: #111; border-radius: 3px; padding: 6px; }
  .th-bg {
    width: 100%; height: 100%; background: #8c8c8c; border-radius: 2px;
    display: flex; justify-content: space-around; box-sizing: border-box; padding: 4px;
  }
  .lever { position: relative; flex: 0 0 auto; height: 100%; touch-action: none; cursor: ns-resize; }
  .ladder {
    position: absolute; top: 0; bottom: 0; width: 17px; background: #0d0d0d;
    border-radius: 2px; display: flex; flex-direction: column; justify-content: space-between;
    padding: 3px 0; box-sizing: border-box;
  }
  .ladder.l { left: 0; } .ladder.r { right: 0; }
  .seg { display: flex; align-items: center; justify-content: center; gap: 1px; height: 4px; font-size: 3.2px; color: #555; }
  .seg i { display: block; width: 3px; height: 1.2px; background: #333; }
  .seg.g.lit { color: #35d07f; } .seg.g.lit i { background: #35d07f; }
  .seg.r.lit { color: #ff3b3b; } .seg.r.lit i { background: #ff3b3b; }
  .seg.z { color: #ddd; } .seg.z i { background: #ddd; }
  .handle {
    position: absolute; left: -2px; right: -2px; height: 15px; margin-top: -7.5px;
    background: linear-gradient(#b8b8b8, #9a9a9a); border: 1px solid #6d6d6d; border-radius: 1.5px;
    box-sizing: border-box; display: flex; align-items: center; justify-content: center;
    font-size: 5px; font-weight: 700; color: #222; pointer-events: none;
  }

  /* Knob / joystick */
  .rot { cursor: pointer; touch-action: none; -webkit-tap-highlight-color: transparent; }
  .rot svg { width: 100%; height: 100%; display: block; overflow: visible; }

  /* Screen */
  .screen { background: #0e0e0e; border-radius: 6px; border: 1px solid #2a2a2a; }
  .screen-inner { position: absolute; overflow: hidden; background: #0b5aa0; }
  .screen-inner > * { height: 100%; }
  .screen-label { position: absolute; left: 0; right: 0; text-align: center; font-size: 7px; font-weight: 700; letter-spacing: .5px; color: #fff; }

  .box { border-radius: 4px; background: #0b0b0b; border: 1px solid #262626; }
  .box.inset { background: #161616; border-color: #222; }
  .label { white-space: pre-line; font-weight: 700; text-transform: uppercase; }
  img.item { object-fit: contain; }
`;

const fire = (node, type, detail) =>
  node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));

const h = (tag, cls, style) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (style) Object.assign(n.style, style);
  return n;
};

const svgNS = "http://www.w3.org/2000/svg";
const isOn = (stateObj, onStates) =>
  !!stateObj &&
  (onStates ? [].concat(onStates).map(String).includes(stateObj.state) : ON_STATES.includes(stateObj.state));
const unavailable = (stateObj) => !stateObj || stateObj.state === "unavailable";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const capture = (node, ev) => {
  try {
    node.setPointerCapture(ev.pointerId);
  } catch (e) {
    // pointer already released
  }
};

class ShipbornPanelCard extends HTMLElement {
  static getStubConfig() {
    return {
      shape: "rect",
      width: 300,
      height: 160,
      items: [{ type: "group", title: "General", x: 20, y: 20, width: 120, columns: 2, buttons: [{ label: "On / Off", led: "green" }] }],
    };
  }

  setConfig(config) {
    if (!config || !Array.isArray(config.items)) throw new Error("shipborn-panel-card: 'items' (list) is required");
    this._config = config;
    this._build();
    if (this._hass) this.hass = this._hass;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._updaters) return;
    for (const u of this._updaters) u(hass);
    for (const c of this._childCards) c.hass = hass;
  }

  getCardSize() {
    return Math.ceil((this._config?.height || 340) / 50);
  }

  getGridOptions() {
    return { columns: "full" };
  }

  connectedCallback() {
    if (this._outer && !this._ro) {
      this._ro = new ResizeObserver(() => this._fit());
      this._ro.observe(this._outer);
    }
  }

  disconnectedCallback() {
    this._ro?.disconnect();
    this._ro = null;
  }

  // ---------- layout ----------

  _build() {
    const c = this._config;
    const W = c.width || 650;
    const H = c.height || 340;
    this._W = W;
    this._H = H;
    this._updaters = [];
    this._childCards = [];

    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const root = this.shadowRoot;
    root.innerHTML = `<style>${STYLE}</style>`;
    this._outer = h("div", "outer");
    this._panel = h("div", "panel", { width: W + "px", height: H + "px" });
    this._outer.appendChild(this._panel);
    root.appendChild(this._outer);

    this._panel.appendChild(this._shapeSvg(W, H));
    for (const item of c.items) {
      const node = this._renderItem(item);
      if (node) this._panel.appendChild(node);
    }

    this._ro?.disconnect();
    this._ro = null;
    if (this.isConnected) this.connectedCallback();
  }

  _fit() {
    const w = this._outer.clientWidth;
    if (!w) return;
    const s = Math.min(w / this._W, this._config.max_scale || 4);
    this._panel.style.transform = `scale(${s})`;
    this._panel.style.left = `${Math.max(0, (w - this._W * s) / 2)}px`;
    this._outer.style.height = `${this._H * s}px`;
  }

  _shapeSvg(W, H) {
    const c = this._config;
    const pts = c.shape_points || SHAPES[c.shape || "rect"] || SHAPES.rect;
    const r = c.corner_radius ?? 8;
    const d =
      pts.map(([px, py], i) => `${i ? "L" : "M"}${r + px * (W - 2 * r)},${r + py * (H - 2 * r)}`).join(" ") + " Z";
    const bg = c.background || "#1b1b1b";
    const border = c.border || "#0c0c0c";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "shape");
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.innerHTML =
      `<path d="${d}" fill="${border}" stroke="${border}" stroke-width="${2 * r}" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="${bg}" stroke="${bg}" stroke-width="${Math.max(0, 2 * r - 2)}" stroke-linejoin="round"/>`;
    return svg;
  }

  _place(node, item, defW, defH) {
    node.classList.add("item");
    node.style.left = (item.x || 0) + "px";
    node.style.top = (item.y || 0) + "px";
    const w = item.width ?? item.size ?? defW;
    const hh = item.height ?? item.size ?? defH;
    if (w != null) node.style.width = w + "px";
    if (hh != null) node.style.height = hh + "px";
    return node;
  }

  _renderItem(item) {
    switch (item.type || "group") {
      case "group": return this._group(item);
      case "estop": return this._estop(item);
      case "throttle": return this._throttle(item);
      case "knob": return this._knob(item);
      case "joystick": return this._joystick(item);
      case "screen": return this._screen(item);
      case "box": {
        const n = h("div", "box" + (item.inset ? " inset" : ""));
        if (item.color) n.style.background = item.color;
        return this._place(n, item);
      }
      case "label": {
        const n = h("div", "label", { fontSize: (item.font_size || 7.5) + "px", color: item.color || "#fff" });
        n.textContent = item.text || "";
        return this._place(n, item);
      }
      case "image": {
        const n = h("img");
        n.src = item.image;
        n.alt = "";
        n.onerror = () => (n.style.display = "none");
        return this._place(n, item);
      }
      default:
        console.warn("shipborn-panel-card: unknown item type", item.type);
        return null;
    }
  }

  // ---------- group of buttons ----------

  _group(g) {
    const node = this._place(h("div", "group"), g, null, null);
    node.style.height = "";
    const titleStyle = g.title_style || "line";
    if (g.title && titleStyle !== "none") {
      const t = h("div", "group-title " + titleStyle);
      t.textContent = g.title;
      node.appendChild(t);
    }
    const bw = g.button_width || g.button_size || 30;
    const bh = g.button_height || g.button_size || 30;
    const [gx, gy] = Array.isArray(g.gap) ? g.gap : [g.gap ?? 15, g.gap ?? 15];
    const grid = h("div", "grid", {
      gridTemplateColumns: `repeat(${g.columns || (g.buttons || []).length || 1}, ${bw}px)`,
      columnGap: gx + "px",
      rowGap: gy + "px",
      marginTop: (g.title && titleStyle !== "none" ? g.title_gap ?? 5 : 0) + "px",
    });
    grid.style.setProperty("--bw", bw + "px");
    grid.style.setProperty("--bh", bh + "px");
    if (g.font_size) grid.style.setProperty("--bfs", g.font_size + "px");
    for (const b of g.buttons || []) grid.appendChild(b && !b.spacer ? this._button(b, g) : h("div"));
    node.appendChild(grid);
    return node;
  }

  _button(b, g) {
    const wrap = h("div", "btn-wrap");
    const btn = h("button", "btn");
    if (b.style === "dashed" || b.dashed) btn.classList.add("dashed");
    if ((b.style || g.button_style) === "wide") btn.classList.add("wide");
    btn.textContent = b.label ?? "";
    if (b.font_size) btn.style.setProperty("--bfs", b.font_size + "px");
    wrap.appendChild(btn);

    let led = null;
    if (b.led) {
      led = h("span", "led" + (b.led_blink ? " blink" : ""));
      led.style.setProperty("--led", LED_COLORS[b.led] || (b.led === true ? LED_COLORS.green : b.led));
      wrap.appendChild(led);
    }

    if (b.mode === "momentary") this._momentary(btn, b);
    else btn.addEventListener("click", () => this._handleAction(b, b.tap_action, btn));

    this._updaters.push((hass) => {
      const so = b.entity ? hass.states[b.entity] : null;
      btn.classList.toggle("unavailable", !!b.entity && unavailable(so));
      btn.classList.toggle("active", !!b.entity && isOn(so, b.state_on));
      if (led) {
        const ledEnt = b.led_entity || b.entity;
        led.classList.toggle("on", !!ledEnt && isOn(hass.states[ledEnt], b.led_state));
      }
    });
    return wrap;
  }

  // Hold-to-run: on while pressed, off on release.
  _momentary(btn, b) {
    let down = false;
    const start = (ev) => {
      ev.preventDefault();
      if (down || !b.entity || unavailable(this._hass?.states[b.entity])) return;
      down = true;
      capture(btn, ev);
      btn.classList.add("pressed");
      fire(this, "haptic", "light");
      this._turn(b.entity, true);
    };
    const stop = () => {
      if (!down) return;
      down = false;
      btn.classList.remove("pressed");
      this._turn(b.entity, false);
    };
    btn.addEventListener("pointerdown", start);
    btn.addEventListener("pointerup", stop);
    btn.addEventListener("pointercancel", stop);
    btn.addEventListener("lostpointercapture", stop);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("blur", stop);
  }

  // ---------- emergency stop ----------

  _estop(item) {
    const node = this._place(h("div", "estop"), item, 46, 62);
    const lines = String(item.label ?? "EMERGENCY\nSTOP").split("\n");
    const ty = 31 - ((lines.length - 1) * 4.2) / 2 + 1.3;
    node.innerHTML = `
      <svg viewBox="0 0 46 62">
        <rect x="8" y="0.5" width="30" height="61" rx="7" fill="#8f959b" stroke="#5c6166"/>
        <rect x="12" y="3" width="22" height="6" rx="2" fill="#a9aeb3"/>
        <rect x="15" y="54" width="16" height="5" rx="2" fill="#6d7277"/>
        <circle cx="23" cy="31" r="21" fill="#2f7fc0" stroke="#1b4f7a" stroke-width="1"/>
        <circle cx="23" cy="31" r="17.5" fill="none" stroke="#7fb6e3" stroke-width=".6"/>
        <circle class="es-red" cx="23" cy="31" r="15" fill="#c8202a" stroke="#7d1016" stroke-width="1"/>
        <text x="23" y="${ty}" fill="#fff" font-size="3.6" font-weight="700" text-anchor="middle"
          font-family="Arial Narrow, Arial, sans-serif">
          ${lines.map((l, i) => `<tspan x="23" dy="${i ? 4.2 : 0}">${l.replace(/[<&]/g, "")}</tspan>`).join("")}
        </text>
      </svg>`;
    const action = item.tap_action || { action: "default", confirmation: item.confirmation ?? true };
    node.addEventListener("click", () => this._handleAction(item, action, node));
    this._updaters.push((hass) => {
      const so = item.entity ? hass.states[item.entity] : null;
      node.classList.toggle("active", isOn(so, item.state_on));
      node.classList.toggle("unavailable", !!item.entity && unavailable(so));
    });
    return node;
  }

  // ---------- throttle ----------

  _throttle(item) {
    const node = this._place(h("div", "throttle"), item, 145, 145);
    const bg = h("div", "th-bg");
    node.appendChild(bg);
    const steps = item.steps || 5;
    const leverW = item.lever_width || 52;
    for (const lv of item.levers || []) bg.appendChild(this._lever(lv, steps, leverW));
    return node;
  }

  _lever(lv, steps, leverW) {
    const node = h("div", "lever", { width: leverW + "px" });
    const ladders = [h("div", "ladder l"), h("div", "ladder r")];
    const segs = [];
    for (const lad of ladders) {
      for (let i = steps; i >= -steps; i--) {
        const s = h("div", "seg " + (i > 0 ? "g" : i < 0 ? "r" : "z"));
        const n = h("span");
        n.textContent = i === 0 ? "0" : String(Math.abs(i) * Math.round(10 / steps) || Math.abs(i));
        s.append(h("i"), n, h("i"));
        s.dataset.i = i;
        lad.appendChild(s);
        segs.push(s);
      }
      node.appendChild(lad);
    }
    const handle = h("div", "handle");
    node.appendChild(handle);

    let dragging = false;
    let value = 0;
    const range = () => {
      const a = this._hass?.states[lv.entity]?.attributes || {};
      return [lv.min ?? a.min ?? -100, lv.max ?? a.max ?? 100, lv.step ?? a.step ?? 1];
    };
    const show = (v) => {
      const [min, max] = range();
      const f = (v - min) / (max - min || 1);
      handle.style.top = `${(1 - f) * 100}%`;
      const unit = v > 0 ? v / max : v < 0 ? -v / min : 0;
      const lit = Math.round(unit * steps) * Math.sign(v);
      for (const s of segs) {
        const i = +s.dataset.i;
        s.classList.toggle("lit", (lit > 0 && i > 0 && i <= lit) || (lit < 0 && i < 0 && i >= lit));
      }
      handle.textContent = lv.show_value === false ? "" : `${Math.round(v)}${lv.unit ?? "%"}`;
    };
    const fromY = (clientY) => {
      const rect = node.getBoundingClientRect();
      const [min, max, step] = range();
      const f = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
      let v = min + f * (max - min);
      v = Math.round(v / step) * step;
      const snap = lv.snap_zero ?? (max - min) * 0.04;
      if (min < 0 && Math.abs(v) <= snap) v = 0;
      return clamp(v, min, max);
    };
    node.addEventListener("pointerdown", (ev) => {
      if (!lv.entity || unavailable(this._hass?.states[lv.entity])) return;
      dragging = true;
      capture(node, ev);
      value = fromY(ev.clientY);
      show(value);
    });
    node.addEventListener("pointermove", (ev) => {
      if (!dragging) return;
      value = fromY(ev.clientY);
      show(value);
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      this._setValue(lv.entity, value);
    };
    node.addEventListener("pointerup", end);
    node.addEventListener("pointercancel", end);
    node.addEventListener("dblclick", () => lv.entity && this._setValue(lv.entity, 0));

    this._updaters.push((hass) => {
      if (dragging) return;
      const so = lv.entity ? hass.states[lv.entity] : null;
      value = so && !isNaN(parseFloat(so.state)) ? parseFloat(so.state) : 0;
      show(value);
    });
    show(0);
    return node;
  }

  // ---------- knob (value) ----------

  _knob(item) {
    const node = this._place(h("div", "rot"), item, 72, 72);
    node.innerHTML = `
      <svg viewBox="0 0 100 100">
        <defs><radialGradient id="kg" cx="40%" cy="35%" r="70%">
          <stop offset="0" stop-color="#2c2c2c"/><stop offset="1" stop-color="#050505"/></radialGradient></defs>
        ${item.arc === false ? "" : `<path d="M18,22 A48,48 0 0 1 82,22" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`}
        <circle cx="50" cy="56" r="34" fill="url(#kg)" stroke="#000" stroke-width="1.5"/>
        <g class="ind"><circle cx="50" cy="35" r="5" fill="#cfcfcf"/></g>
      </svg>`;
    const ind = node.querySelector(".ind");
    const sweep = item.sweep ?? 270;
    let value = null;
    let drag = null;
    const range = () => {
      const a = this._hass?.states[item.entity]?.attributes || {};
      return [item.min ?? a.min ?? 0, item.max ?? a.max ?? 100, item.step ?? a.step ?? 1];
    };
    const show = (v) => {
      let ang = 0;
      if (v != null) {
        const [min, max] = range();
        ang = ((v - min) / (max - min || 1) - 0.5) * sweep;
      }
      ind.setAttribute("transform", `rotate(${ang} 50 56)`);
    };
    node.addEventListener("pointerdown", (ev) => {
      drag = { y: ev.clientY, v: value ?? 0, moved: false };
      capture(node, ev);
    });
    node.addEventListener("pointermove", (ev) => {
      if (!drag || !item.entity) return;
      const dy = drag.y - ev.clientY;
      if (Math.abs(dy) > 4) drag.moved = true;
      if (!drag.moved) return;
      const [min, max, step] = range();
      const v = clamp(Math.round((drag.v + (dy / 120) * (max - min)) / step) * step, min, max);
      value = v;
      show(v);
    });
    node.addEventListener("pointerup", () => {
      if (!drag) return;
      const moved = drag.moved;
      drag = null;
      if (moved) this._setValue(item.entity, value);
      else this._handleAction(item, item.tap_action || { action: "more-info" }, node);
    });
    node.addEventListener("pointercancel", () => (drag = null));
    this._updaters.push((hass) => {
      if (drag) return;
      const so = item.entity ? hass.states[item.entity] : null;
      value = so && !isNaN(parseFloat(so.state)) ? parseFloat(so.state) : null;
      show(value);
    });
    show(null);
    return node;
  }

  // ---------- joystick / thruster dial (decorative, tap = action) ----------

  _joystick(item) {
    const node = this._place(h("div", "rot"), item, 96, 96);
    node.innerHTML =
      item.style === "ring"
        ? `<svg viewBox="0 0 100 100">
             <circle cx="50" cy="50" r="48" fill="#1e1e1e" stroke="#3a3a3a" stroke-width="1.5"/>
             <circle cx="50" cy="50" r="40" fill="#262626" stroke="#111" stroke-width="2"/>
             <circle cx="50" cy="50" r="26" fill="#050505"/>
           </svg>`
        : `<svg viewBox="0 0 100 100">
             <circle cx="50" cy="50" r="48" fill="#2a2a2a" stroke="#bdbdbd" stroke-width="2.2"/>
             <circle cx="50" cy="50" r="40" fill="#121212"/>
             <circle cx="50" cy="50" r="29" fill="#000" stroke="#8a8a8a" stroke-width="2"/>
             <circle cx="50" cy="50" r="22" fill="#151515"/>
             <rect x="48.4" y="31" width="3.2" height="12" rx="1.6" fill="#fff"/>
           </svg>`;
    const action = item.tap_action || (item.entity ? { action: "more-info" } : { action: "none" });
    node.addEventListener("click", () => this._handleAction(item, action, node));
    return node;
  }

  // ---------- screen with embedded HA card ----------

  _screen(item) {
    const node = this._place(h("div", "screen"), item, 400, 313);
    const pad = item.bezel ?? 6;
    const bottom = item.label ? 22 : pad;
    const inner = h("div", "screen-inner", { left: pad + "px", right: pad + "px", top: pad + "px", bottom: bottom + "px" });
    if (item.screen_color) inner.style.background = item.screen_color;
    node.appendChild(inner);
    if (item.label) {
      const l = h("div", "screen-label", { bottom: "7px" });
      l.textContent = item.label;
      node.appendChild(l);
    }
    if (item.card) {
      (async () => {
        const helpers = await window.loadCardHelpers?.();
        if (!helpers) return;
        const card = helpers.createCardElement(item.card);
        if (this._hass) card.hass = this._hass;
        this._childCards.push(card);
        inner.appendChild(card);
      })();
    }
    return node;
  }

  // ---------- actions ----------

  _handleAction(cfg, action, node) {
    const hass = this._hass;
    if (!hass) return;
    const a = action || { action: "default" };
    const entity = a.entity || cfg.entity;
    if (a.action === "none") return;
    if (a.confirmation) {
      const text = a.confirmation.text || `${String(cfg.label || entity || "").replace(/\n/g, " ")}?`;
      if (!window.confirm(text)) return;
    }
    fire(this, "haptic", "light");
    switch (a.action) {
      case "more-info":
        if (entity) fire(this, "hass-more-info", { entityId: entity });
        return;
      case "navigate":
        history.pushState(null, "", a.navigation_path);
        fire(window, "location-changed", { replace: false });
        return;
      case "url":
        window.open(a.url_path, "_blank");
        return;
      case "call-service":
      case "perform-action": {
        const [domain, service] = (a.perform_action || a.service || "").split(".");
        hass.callService(domain, service, { ...(a.data || a.service_data || {}) }, a.target);
        return;
      }
      default:
        if (entity) this._toggle(entity);
    }
  }

  _toggle(entityId) {
    const domain = entityId.split(".")[0];
    const state = this._hass.states[entityId]?.state;
    const call = (d, s) => this._hass.callService(d, s, { entity_id: entityId });
    switch (domain) {
      case "button":
      case "input_button":
        return call(domain, "press");
      case "script":
      case "scene":
        return call(domain, "turn_on");
      case "lock":
        return call("lock", state === "locked" ? "unlock" : "lock");
      case "cover":
        return call("cover", "toggle");
      default:
        return call("homeassistant", "toggle");
    }
  }

  _turn(entityId, on) {
    const domain = entityId.split(".")[0];
    if (domain === "button" || domain === "input_button") {
      if (on) this._hass.callService(domain, "press", { entity_id: entityId });
      return;
    }
    this._hass.callService("homeassistant", on ? "turn_on" : "turn_off", { entity_id: entityId });
  }

  _setValue(entityId, value) {
    const domain = entityId.split(".")[0];
    this._hass.callService(domain === "input_number" ? "input_number" : "number", "set_value", {
      entity_id: entityId,
      value,
    });
  }
}

customElements.define("shipborn-panel-card", ShipbornPanelCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "shipborn-panel-card",
  name: "Shipborn Panel Card",
  description: "Console-style control panel with buttons, LEDs, emergency stops and throttles.",
});

console.info(`%c SHIPBORN-PANEL-CARD %c v${VERSION} `, "background:#1b1b1b;color:#fff", "background:#35d07f;color:#000");

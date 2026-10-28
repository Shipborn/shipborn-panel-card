/*!
 * Shipborn Panel Card
 * Console-style control panels (buttons with status LEDs, emergency stops,
 * throttle levers, knobs, embedded screens) for Home Assistant dashboards.
 */
const VERSION = "0.4.10";

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

  /* Screen-page items (dark console design: gauges, bars, tanks, values) */
  .d { font-family: "Barlow Condensed", "Roboto Condensed", "Arial Narrow", sans-serif; color: #ecebe6; }
  .d-num, .d-valbox { font-family: "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace; font-weight: 600; color: #ecebe6; }
  .d-lbl { font-size: 13px; letter-spacing: .1em; text-transform: uppercase; color: #8f8e88; }
  .d-ph {
    display: flex; align-items: center; gap: 10px; white-space: nowrap;
    font-size: 15px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #a3a29c;
  }
  .d-led { width: 10px; height: 10px; border-radius: 50%; flex: none; background: #3a3a3a; }
  .d-led.on { background: var(--c, #34d27b); box-shadow: 0 0 8px var(--c, #34d27b); }
  .d-led.on.blink { animation: blink 1s steps(2, start) infinite; }
  .d-panel { background: #1b1b1b; border: 1px solid #2c2c2c; border-radius: 10px; }
  .d-panel > .d-ph { position: absolute; left: 18px; top: 14px; }
  .d-valbox {
    box-sizing: border-box; min-width: 70px; padding: 6px 12px; font-size: 18px; text-align: right; white-space: nowrap;
    background: #121212; border: 1px solid #2c2c2c; border-radius: 6px;
  }
  .d-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .d-col { display: flex; flex-direction: column; gap: 4px; }
  .d-gauge svg { width: 100%; height: auto; display: block; overflow: visible; }
  .d-track { position: relative; box-sizing: border-box; overflow: hidden; background: #121212; border: 1px solid #2c2c2c; }
  .d-fill { position: absolute; transition: height .4s, width .4s, left .4s; }
  .d-zero { position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; background: #6b6a66; }
  .d-mark { position: absolute; left: 0; right: 0; border-top: 2px dashed #ecebe6; }
  .d-scale { display: flex; flex-direction: column; justify-content: space-between; }
  .d-box {
    box-sizing: border-box; display: flex; align-items: center; justify-content: center; text-align: center;
    background: #121212; border: 1px solid #4a4a4a; border-radius: 6px;
    font-size: 16px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #cfcec8;
  }
  .d-btn {
    box-sizing: border-box; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; gap: 12px;
    padding: 0 16px; border-radius: 8px; border: 1px solid #3a3a3a; background: #232323; color: #ecebe6;
    font-family: inherit; font-size: var(--fs, 19px); font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  }
  .d-btn:hover { background: #2a2a2a; }
  .d-btn:active, .d-btn.pressed { background: #333; }
  .d-btn.left { justify-content: flex-start; }
  .d-btn.stop { background: #3a1512; border-color: #ff5b4f; color: #ffd9d6; }
  .d-btn.active { border-color: #f5a524; color: #f5a524; background: #261f12; }
  .d-btn.static { cursor: default; color: #a3a29c; font-size: var(--fs, 15px); }
  .d-btn.static.active { color: #f5a524; }
  .d-btn.unavailable { opacity: .4; cursor: not-allowed; }
  .d-nav { display: flex; gap: 4px; }
  .d-nav.side { flex-direction: column; gap: 10px; }
  .d-tab {
    display: flex; align-items: center; height: 44px; padding: 0 18px; border: 0; border-radius: 6px; background: none;
    color: #a3a29c; font-family: inherit; font-size: 17px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
    cursor: pointer; -webkit-tap-highlight-color: transparent;
  }
  .d-tab:hover { color: #ecebe6; background: #1f1f1f; }
  .d-tab.on { color: #0d0e10; background: #f5a524; }
  .d-tab[disabled] { color: #5f5e5a; background: none; cursor: default; }
  .side .d-tab { height: 52px; padding: 0 16px; border: 1px solid #3a3a3a; border-radius: 8px; background: #232323; color: #cfcec8; font-size: 18px; font-weight: 700; }
  .side .d-tab.on { border-color: #f5a524; color: #f5a524; background: #261f12; }
  .side .d-tab[disabled] { color: #5f5e5a; border-style: dashed; background: #232323; }
  .d-alarm {
    box-sizing: border-box; display: flex; align-items: center; gap: 12px; padding: 0 24px; cursor: pointer;
    background: #141516; border-top: 1px solid #2c2c2c; border-bottom: 1px solid #2c2c2c;
    color: #8f8e88; font-size: 17px; letter-spacing: .04em; white-space: nowrap; overflow: hidden;
  }
  .d-alarm.on { background: #3a1512; border-color: #ff5b4f; color: #ffd9d6; }
  .d-alarm .d-num { font-size: 14px; font-weight: 400; color: inherit; }
  .d-block { display: flex; flex-direction: column; }
  .d-block > div { box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid #3a3a3a; }
  .d-block .hd { height: 30px; border-radius: 6px 6px 0 0; background: #232323; font-size: 17px; font-weight: 700; letter-spacing: .1em; }
  .d-block .bd { height: 62px; border-top: 0; border-bottom: 0; background: #121212; color: #a3a29c; font-family: "JetBrains Mono", monospace; font-size: 15px; }
  .d-block .ft { height: 34px; border-radius: 0 0 6px 6px; background: #1b1b1b; font-family: "JetBrains Mono", monospace; font-weight: 600; font-size: 16px; }
  .d-block .rt { position: absolute; top: -30px; left: 0; right: 0; border: 0; color: #a3a29c; font-family: "JetBrains Mono", monospace; font-size: 14px; }
  .d-block.alarm > div:not(.rt) { border-color: #ff5b4f; }
  .d-block.alarm .hd { background: #3a1512; color: #ffd9d6; }
  .d-block.active > div:not(.rt) { border-color: #34d27b; }
  .d-block.active .hd { background: #12261a; color: #34d27b; }
  .d-box.active { border-color: #34d27b; color: #34d27b; background: #12261a; box-shadow: 0 0 12px rgba(52, 210, 123, .25); }
  .d-box.alarm { border-color: #ff5b4f; color: #ffd9d6; background: #3a1512; }
  svg.d-pipe { overflow: visible; pointer-events: none; }
  .d-pipe .bs { transition: stroke-opacity .4s; }
  .d-hull { pointer-events: none; }
  .d-sym { cursor: default; }
  .d-sym.click { cursor: pointer; }
  .d-sym > svg { width: 100%; height: 100%; display: block; overflow: visible; }
  .d-sym .bd, .d-sym .ac { fill: #121212; stroke: #8f8e88; stroke-width: 2; stroke-linejoin: round; transition: fill .3s, stroke .3s; }
  .d-sym .ln { fill: none; stroke: #8f8e88; stroke-width: 2; stroke-linecap: round; }
  .d-sym.on .bd, .d-sym.on .ac, .d-sym.on .ln { stroke: var(--c); }
  .d-sym.on .ac { fill: var(--c); }
  .d-sym.on > svg { filter: drop-shadow(0 0 5px var(--c)); }
  .d-sym .lb {
    position: absolute; left: 50%; transform: translateX(-50%); white-space: pre; text-align: center; line-height: 1.1;
    font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: #a3a29c;
  }
  .d-sym .blades { transform-box: fill-box; transform-origin: center; }
  .d-sym.on .blades { animation: prop var(--dur, .5s) linear infinite alternate; }
  .d-sym .puff { opacity: 0; fill: #8f8e88; transform-box: fill-box; transform-origin: center; }
  .d-sym.on .puff { animation: puff 2.4s ease-out infinite; }
  .d-sym .gl { fill: #8f8e88; font: 600 14px "JetBrains Mono", monospace; transition: fill .3s; }
  .d-sym.on .gl { fill: var(--c); }
  .d-sym .rotor { transform-box: fill-box; transform-origin: center; }
  .d-sym.on .rotor { animation: spin var(--dur, 1s) linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .d-sym.on .puff:nth-child(2) { animation-delay: .8s; }
  .d-sym.on .puff:nth-child(3) { animation-delay: 1.6s; }
  @keyframes prop { from { transform: scaleY(1); } to { transform: scaleY(-1); } }
  @keyframes puff {
    0% { opacity: .7; transform: translate(0, 0) scale(.4); }
    100% { opacity: 0; transform: translate(-40px, -6px) scale(1.6); }
  }
`;

const SYMBOLS = [
  "pump", "valve", "hx", "filter", "strainer", "propeller", "outlet", "smoke", "engine", "generator", "converter", "battery", "fan",
  "gate_valve", "ball_valve", "globe_valve", "butterfly_valve", "check_valve", "three_way_valve", "motor_valve", "solenoid_valve",
  "relief_valve", "instrument", "vessel", "compressor", "heater", "sight_glass", "reducer", "motor",
];
const DESIGN_TYPES = ["panel", "gauge", "bar", "tank", "value", "indicator", "pushbutton", "nav", "alarm", "block", "line", "text", "pipe", "hull", ...SYMBOLS];
// Pipe colours, loosely after ISO 14726 (sea water green-blue, fresh water blue, fuel brown, oil yellow).
const MEDIA = {
  seawater: "#3cc7d6",
  freshwater: "#4aa3ff",
  coolant: "#4aa3ff",
  fuel: "#c0803f",
  oil: "#e8c547",
  grease: "#d9772b",
  exhaust: "#7d7c78",
  air: "#a6d84a",
  hydraulic: "#f5a524",
  shaft: "#2f8f5b",
  bilge: "#6b6a66",
  glycol: "#b57be0",
  glycol_return: "#e06666",
  hotwater: "#e0453a",
  wastewater: "#9a7b5a",
  power: "#ff9f1c",
};
const DESIGN_FONTS =
  "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=JetBrains+Mono:wght@400;600&display=swap";
const DESIGN_COLORS = { amber: "#f5a524", blue: "#4aa3ff", green: "#34d27b", red: "#ff5b4f" };

// Web fonts can't be declared inside a shadow root, so they go in the document head (once).
const ensureFonts = () => {
  if (document.getElementById("sb-design-fonts")) return;
  const l = document.createElement("link");
  l.id = "sb-design-fonts";
  l.rel = "stylesheet";
  l.href = DESIGN_FONTS;
  document.head.appendChild(l);
};

const fire = (node, type, detail) =>
  node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));

const h = (tag, cls, style) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (style) Object.assign(n.style, style);
  return n;
};

// Built-in images, usable as `image: <name>` so HA needs no extra file.
const IMAGES = {
  "shipborn-joal": "data:image/webp;base64,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",
};

const svgNS = "http://www.w3.org/2000/svg";
const isOn = (stateObj, onStates) =>
  !!stateObj &&
  (onStates ? [].concat(onStates).map(String).includes(stateObj.state) : ON_STATES.includes(stateObj.state));
const unavailable = (stateObj) => !stateObj || stateObj.state === "unavailable";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// `factor` converts raw values, e.g. 0.00001 for a Wago level of 7894954 → 78.9 %.
const num = (stateObj, factor = 1) =>
  stateObj && !isNaN(parseFloat(stateObj.state)) ? parseFloat(stateObj.state) * factor : null;
const fmt = (v, decimals, hass) =>
  v == null
    ? "—"
    : v.toLocaleString(hass?.locale?.language || "nl", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const unitOf = (item, stateObj) => item.unit ?? stateObj?.attributes?.unit_of_measurement ?? "";
const color = (c, fallback) => DESIGN_COLORS[c] || LED_COLORS[c] || c || fallback;
// True when any of the entities is on (or in `<key>_state`), or its value is above/below
// `<key>_above` / `<key>_below` (with `<key>_abs: true` the sign is ignored, e.g. for reverse rpm).
const activeOf = (hass, ids, cfg = {}, key = "active") =>
  [].concat(ids || []).some((id) => {
    const so = hass.states[id];
    const above = cfg[key + "_above"];
    const below = cfg[key + "_below"];
    if (above == null && below == null) return isOn(so, cfg[key + "_state"]);
    let v = num(so);
    if (v == null) return isOn(so, cfg[key + "_state"]); // on/off entity mixed into a list with limits
    if (cfg[key + "_abs"]) v = Math.abs(v);
    return (above == null || v > above) && (below == null || v < below);
  });
// SVG path through points with rounded corners.
const roundedPath = (pts, r) => {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const l1 = Math.hypot(cx - px, cy - py);
    const l2 = Math.hypot(nx - cx, ny - cy);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    if (!rr) {
      d += ` L${cx},${cy}`;
      continue;
    }
    d += ` L${cx + ((px - cx) * rr) / l1},${cy + ((py - cy) * rr) / l1}`;
    d += ` Q${cx},${cy} ${cx + ((nx - cx) * rr) / l2},${cy + ((ny - cy) * rr) / l2}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return d + ` L${lx},${ly}`;
};
// A path without a leading slash is a view of the current dashboard: "sys-diesel" → "/<dashboard>/sys-diesel".
const viewPath = (p) => (!p || p.startsWith("/") ? p : `/${location.pathname.split("/")[1]}/${p}`);
const pad2 = (n) => String(n).padStart(2, "0");
const stamp = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};
const capture = (node, ev) => {
  try {
    node.setPointerCapture(ev.pointerId);
  } catch (e) {
    // pointer already released
  }
};

class ShipbornPanelCard extends HTMLElement {
  // Colour tables and symbol names, for the layout editor.
  static get palettes() {
    return { design: DESIGN_COLORS, led: LED_COLORS, media: MEDIA, symbols: SYMBOLS };
  }

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
    if (this._config?.kiosk && !this._kiosk) setTimeout(() => this.isConnected && !this._kiosk && this._kioskOn());
  }

  disconnectedCallback() {
    this._ro?.disconnect();
    this._ro = null;
    this._kioskOff();
  }

  // ---------- kiosk: hide HA's top bar and sidebar ----------

  // With `kiosk: true` the HA header and sidebar are hidden while this card is shown. Resting the
  // pointer (or a finger) on the top or left screen edge for `kiosk_delay` ms shows them again;
  // going back onto the card hides them. Not in edit mode or the card editor.
  _kioskOn() {
    const hosts = [];
    for (let n = this.getRootNode().host; n; n = n.getRootNode().host) hosts.push(n);
    const root = hosts.find((n) => n.localName === "hui-root");
    const main = hosts.find((n) => n.localName === "home-assistant-main");
    const editing = root?.lovelace?.editMode || hosts.some((n) => /^hui-(card-options|card-edit-mode|dialog-edit-card)$|^hui-card-preview$/.test(n.localName));
    if (!root || !main || editing) return;
    const drawer = main.shadowRoot.querySelector("ha-drawer")?.shadowRoot;
    const css = [
      [root.shadowRoot, `:host { --header-height: 0px !important; }
        .header, app-header, app-toolbar { display: none !important; }
        #view, hui-view-container { padding-top: env(safe-area-inset-top) !important; min-height: 100vh !important; }`],
      [main.shadowRoot, `:host { --mdc-drawer-width: 0px !important; } ha-sidebar { display: none !important; }`],
      [drawer, `.mdc-drawer { display: none !important; } .mdc-drawer-app-content { margin-left: 0 !important; }`],
    ].filter(([sr]) => sr);
    // The page around the card (beside or below it on a screen with another aspect ratio) gets the
    // card's background instead of the theme's, for as long as this view is open.
    const bg = this._config.page_background ?? this._config.background ?? "#1b1b1b";
    const page = document.createElement("style");
    page.textContent = `:host { --lovelace-background: ${bg} !important; --primary-background-color: ${bg} !important; }
      #view, hui-view-container, hui-view, hui-view-background { background: ${bg} !important; }`;
    root.shadowRoot.appendChild(page);
    const styles = css.map(([sr, text]) => {
      const s = document.createElement("style");
      s.textContent = text;
      return [sr, s];
    });
    const delay = this._config.kiosk_delay ?? 800;
    let timer;
    const hidden = () => styles[0][1].isConnected;
    const hide = () => {
      for (const [sr, s] of styles) sr.appendChild(s);
      for (const z of zones) z.style.pointerEvents = "auto";
    };
    const show = () => {
      for (const [, s] of styles) s.remove();
      for (const z of zones) z.style.pointerEvents = "none";
    };
    const later = (fn) => {
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
    const cancel = () => clearTimeout(timer);
    // Edge strips that reveal the bars; they only catch the pointer while the bars are hidden.
    const zones = [
      { top: 0, left: 0, right: 0, height: "8px" },
      { top: 0, left: 0, bottom: 0, width: "8px" },
    ].map((pos) => {
      const z = document.createElement("div");
      Object.assign(z.style, { position: "fixed", zIndex: 9999, ...Object.fromEntries(Object.entries(pos).map(([k, v]) => [k, typeof v === "number" ? v + "px" : v])) });
      z.addEventListener("pointerenter", () => later(show));
      z.addEventListener("pointerdown", () => later(show));
      z.addEventListener("pointerleave", cancel);
      z.addEventListener("pointercancel", cancel);
      document.body.appendChild(z);
      return z;
    });
    const onEnter = (e) => {
      if (hidden()) return;
      if (e.pointerType === "touch") hide();
      else later(hide);
    };
    const onLeave = () => !hidden() && cancel();
    this.addEventListener("pointerenter", onEnter);
    this.addEventListener("pointerdown", onEnter);
    this.addEventListener("pointerleave", onLeave);
    hide();
    this._kiosk = () => {
      cancel();
      show();
      page.remove();
      for (const z of zones) z.remove();
      this.removeEventListener("pointerenter", onEnter);
      this.removeEventListener("pointerdown", onEnter);
      this.removeEventListener("pointerleave", onLeave);
    };
  }

  _kioskOff() {
    this._kiosk?.();
    this._kiosk = null;
  }

  // Pipe colours per medium; `media_colors: { seawater: "#…" }` on the card overrides them.
  _media() {
    return { ...MEDIA, ...this._config.media_colors };
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

    if (c.fonts !== false && c.items.some((i) => DESIGN_TYPES.includes(i.type))) ensureFonts();
    this._panel.appendChild(this._shapeSvg(W, H));
    c.items.forEach((item, i) => {
      const node = this._renderItem(item);
      if (!node) return;
      node.dataset.i = i; // lets the layout editor (demo/editor.html) find an item's node
      this._panel.appendChild(node);
    });

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
    // YAML 1.1 (HA's YAML-mode dashboards) reads the key `y` as boolean true, so it arrives as "true".
    node.style.top = (item.y ?? item.true ?? 0) + "px";
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
        n.src = IMAGES[item.image] || item.image;
        n.alt = "";
        n.onerror = () => (n.style.display = "none");
        return this._place(n, item);
      }
      case "panel": return this._dPanel(item);
      case "gauge": return this._dGauge(item);
      case "bar": return this._dBar(item);
      case "tank": return this._dTank(item);
      case "value": return this._dValue(item);
      case "indicator": return this._dIndicator(item);
      case "pushbutton": return this._dButton(item);
      case "nav": return this._dNav(item);
      case "alarm": return this._dAlarm(item);
      case "block": return this._dBlock(item);
      case "line": return this._dLine(item);
      case "text": return this._dText(item);
      case "pipe": return this._dPipe(item);
      case "hull": return this._dHull(item);
      default:
        if (SYMBOLS.includes(item.type)) return this._dSymbol(item);
        console.warn("shipborn-panel-card: unknown item type", item.type);
        // Visible, so a type from a newer card version doesn't vanish without a trace.
        const n = this._place(h("div", "unknown", {
          border: "1px dashed #ff5b4f", color: "#ff5b4f", font: "10px/1.2 sans-serif",
          padding: "2px", boxSizing: "border-box", overflow: "hidden",
        }), item, 90, 34);
        n.textContent = `? ${item.type} (v${VERSION})`;
        return n;
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

  // ---------- screen-page items ----------

  _dLed(entity, ledColor, onStates, blink) {
    const led = h("span", "d-led" + (blink ? " blink" : ""));
    led.style.setProperty("--c", color(ledColor, DESIGN_COLORS.green));
    this._updaters.push((hass) => led.classList.toggle("on", !!entity && isOn(hass.states[entity], onStates)));
    return led;
  }

  _dTitle(item, cls = "d-ph") {
    const t = h("div", cls);
    if (item.led_entity) t.appendChild(this._dLed(item.led_entity, item.led, item.led_state, item.led_blink));
    t.append(item.title ?? item.label ?? "");
    return t;
  }

  _dPanel(item) {
    const n = this._place(h("div", "d d-panel"), item);
    if (item.title) n.appendChild(this._dTitle(item));
    return n;
  }

  // Half-circle gauge; the arc grows from 0 when the range crosses zero (e.g. -4000..4000).
  _dGauge(g) {
    const n = this._place(h("div", "d d-gauge d-col"), g, 300, null);
    n.style.height = "";
    n.style.alignItems = "center";
    const min = g.min ?? 0;
    const max = g.max ?? 100;
    const base = color(g.color, min < 0 ? DESIGN_COLORS.blue : DESIGN_COLORS.amber);
    let box = null;
    if (g.label) {
      const row = h("div", "d-row", { alignSelf: "stretch" });
      box = h("span", "d-valbox");
      row.append(this._dTitle(g), box);
      n.appendChild(row);
    }
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 200 118");
    svg.setAttribute("aria-hidden", "true");
    const arcD = "M20 100 A80 80 0 0 1 180 100";
    svg.innerHTML = `
      <path d="${arcD}" fill="none" stroke="#2a2a2a" stroke-width="14" pathLength="1000"/>
      <path class="arc" d="${arcD}" fill="none" stroke="${base}" stroke-width="14" pathLength="1000" stroke-dasharray="0 2000"/>
      <line class="ndl" x1="100" y1="100" x2="100" y2="34" stroke="#ecebe6" stroke-width="3" stroke-linecap="round"/>
      <circle cx="100" cy="100" r="6" fill="#ecebe6"/>
      <g fill="#8f8e88" font-size="10" text-anchor="middle" font-family="JetBrains Mono, monospace">
        <text x="20" y="116">${min}</text><text x="100" y="12">${g.mid ?? (min + max) / 2}</text><text x="180" y="116">${max}</text>
      </g>`;
    n.appendChild(svg);
    const arc = svg.querySelector(".arc");
    const ndl = svg.querySelector(".ndl");
    let big = null;
    let bigUnit = null;
    if (!box) {
      const row = h("div", "d-row", { justifyContent: "center", alignItems: "baseline", gap: "6px" });
      big = h("span", "d-num", { fontSize: (g.font_size || 40) + "px" });
      bigUnit = h("span", "d-lbl");
      row.append(big, bigUnit);
      n.appendChild(row);
    }
    this._updaters.push((hass) => {
      const so = g.entity ? hass.states[g.entity] : null;
      const v = num(so, g.factor);
      const z = min < 0 ? -min / (max - min) : 0;
      const f = v == null ? z : clamp((v - min) / (max - min || 1), 0, 1);
      arc.setAttribute("stroke-dasharray", `0 ${(Math.min(f, z) * 1000).toFixed(0)} ${(Math.abs(f - z) * 1000).toFixed(0)} 2000`);
      ndl.setAttribute("transform", `rotate(${(-90 + f * 180).toFixed(1)} 100 100)`);
      const warn = v != null && ((g.warn_above != null && v >= g.warn_above) || (g.warn_below != null && v <= g.warn_below));
      arc.setAttribute("stroke", warn ? DESIGN_COLORS.red : base);
      const txt = fmt(v, g.decimals ?? 0, hass);
      const unit = unitOf(g, so);
      if (box) box.textContent = unit ? `${txt} ${unit}` : txt;
      else {
        big.textContent = txt;
        bigUnit.textContent = unit;
      }
    });
    return n;
  }

  // Horizontal bar; filled from 0 when the range crosses zero.
  _dBar(b) {
    const n = this._place(h("div", "d d-col"), b, 400, null);
    n.style.height = "";
    const min = b.min ?? 0;
    const max = b.max ?? 100;
    const val = h("span", "d-num", { fontSize: "16px" });
    if (b.label) {
      const row = h("div", "d-row", { alignItems: "baseline" });
      const t = this._dTitle(b);
      t.style.fontSize = "14px";
      row.append(t, val);
      n.appendChild(row);
    }
    const th = b.thickness || 14;
    const track = h("div", "d-track", { height: th + "px", borderRadius: th / 2 + "px" });
    const fill = h("div", "d-fill", { top: 0, bottom: 0, background: color(b.color, DESIGN_COLORS.blue) });
    track.appendChild(fill);
    if (min < 0) track.appendChild(h("div", "d-zero"));
    n.appendChild(track);
    const ticks = b.ticks || (min < 0 ? [min, 0, max] : [min, (min + max) / 2, max]);
    if (b.ticks !== false) {
      const row = h("div", "d-row");
      for (const t of ticks) {
        const s = h("span", "d-lbl");
        s.textContent = t;
        row.appendChild(s);
      }
      n.appendChild(row);
    }
    this._updaters.push((hass) => {
      const so = b.entity ? hass.states[b.entity] : null;
      const v = num(so, b.factor);
      const z = min < 0 ? -min / (max - min) : 0;
      const f = v == null ? z : clamp((v - min) / (max - min || 1), 0, 1);
      fill.style.left = Math.min(f, z) * 100 + "%";
      fill.style.width = Math.abs(f - z) * 100 + "%";
      const unit = unitOf(b, so);
      val.textContent = fmt(v, b.decimals ?? 1, hass) + (unit ? ` ${unit}` : "");
    });
    return n;
  }

  // Vertical level (tank or SoC), optional dashed marker line and scale.
  _dTank(t) {
    const framed = t.frame !== false;
    const n = this._place(h("div", "d d-col" + (framed ? " d-panel" : "")), t, 140, 500);
    Object.assign(n.style, { gap: "10px", padding: framed ? "14px" : "0" });
    const fillColor = color(t.color, DESIGN_COLORS.blue);
    let led = null;
    if (t.label) {
      const head = h("div", "d-ph", { fontSize: "15px", letterSpacing: ".08em", color: "#cfcec8", whiteSpace: "normal", lineHeight: "1.1", minHeight: "36px" });
      led = h("span", "d-led");
      head.append(led, t.label);
      n.appendChild(head);
    }
    const body = h("div", "d-row", { flex: "1", minHeight: "0", alignItems: "stretch", gap: "6px" });
    const track = h("div", "d-track", { flex: "1", borderRadius: "8px" });
    const fill = h("div", "d-fill", { left: 0, right: 0, bottom: 0, background: fillColor });
    track.appendChild(fill);
    const mark = t.marker != null || t.marker_entity ? h("div", "d-mark") : null;
    if (mark) track.appendChild(mark);
    body.appendChild(track);
    if (t.scale !== false) {
      const sc = h("div", "d-scale d-lbl");
      for (const s of t.scale || [100, 80, 60, 40, 20, 0]) {
        const e = h("span");
        e.textContent = s;
        sc.appendChild(e);
      }
      body.appendChild(sc);
    }
    n.appendChild(body);
    const vRow = h("div", "d-row", { justifyContent: "flex-start", alignItems: "baseline", gap: "4px" });
    const v = h("span", "d-num", { fontSize: (t.font_size || 32) + "px", lineHeight: "1" });
    const u = h("span", "d-lbl", { fontSize: "16px" });
    vRow.append(v, u);
    n.appendChild(vRow);
    if (t.kind) {
      const k = h("span", "d-lbl");
      k.textContent = t.kind;
      n.appendChild(k);
    }
    this._updaters.push((hass) => {
      const so = t.entity ? hass.states[t.entity] : null;
      const val = num(so, t.factor);
      const max = t.max ?? 100;
      fill.style.height = (val == null ? 0 : clamp(val / max, 0, 1) * 100) + "%";
      v.textContent = fmt(val, t.decimals ?? 0, hass);
      u.textContent = t.unit ?? "%";
      if (mark) {
        const m = t.marker_entity ? num(hass.states[t.marker_entity]) : t.marker;
        mark.style.display = m == null ? "none" : "";
        mark.style.bottom = clamp((m ?? 0) / max, 0, 1) * 100 + "%";
      }
      if (led) {
        const warn = val != null && ((t.low != null && val <= t.low) || (t.high != null && val >= t.high));
        led.classList.toggle("on", val != null);
        led.style.setProperty("--c", warn ? DESIGN_COLORS.amber : DESIGN_COLORS.green);
      }
    });
    return n;
  }

  // Label + value box (style: row) or small label over a large number (style: tile).
  _dValue(item) {
    const tile = item.style === "tile";
    const n = this._place(h("div", "d " + (tile ? "d-col d-panel" : "d-row")), item, 260, tile ? 80 : 40);
    if (tile) Object.assign(n.style, { padding: "12px 16px", background: "#121212", boxSizing: "border-box" });
    const l = h("span", tile ? "d-lbl" : null, tile ? {} : { fontSize: (item.font_size || 17) + "px", color: "#cfcec8" });
    l.textContent = item.label ?? "";
    const v = h(
      "span",
      tile ? "d-num" : "d-valbox",
      tile ? { fontSize: (item.value_size || 30) + "px" } : { width: (item.box_width || 110) + "px" }
    );
    n.append(l, v);
    if (item.entity) n.addEventListener("click", () => this._handleAction(item, item.tap_action || { action: "more-info" }, n));
    this._updaters.push((hass) => {
      const so = item.entity ? hass.states[item.entity] : null;
      const val = num(so, item.factor);
      const unit = unitOf(item, so);
      const txt = val == null && so && !unavailable(so) ? so.state : fmt(val, item.decimals ?? 1, hass);
      v.textContent = unit ? `${txt} ${unit}` : txt;
    });
    return n;
  }

  _dIndicator(item) {
    const n = this._place(h("div", "d d-row"), item, null, null);
    Object.assign(n.style, { justifyContent: "flex-start", fontSize: (item.font_size || 17) + "px", color: "#cfcec8", whiteSpace: "nowrap" });
    const led = this._dLed(item.entity, item.color || item.led, item.state_on, item.blink);
    const s = item.led_size || 14;
    Object.assign(led.style, { width: s + "px", height: s + "px" });
    n.append(led, item.label ?? "");
    return n;
  }

  _dButton(b) {
    const n = this._place(h("div", "d"), b, 200, 56);
    const btn = h(
      "button",
      "d-btn" + (b.variant === "stop" ? " stop" : "") + (b.align === "left" ? " left" : "") + (b.tap_action?.action === "none" ? " static" : "")
    );
    if (b.font_size) btn.style.setProperty("--fs", b.font_size + "px");
    if (b.led) btn.appendChild(this._dLed(b.led_entity || b.entity, b.led, b.led_state, b.led_blink));
    btn.append(b.label ?? "");
    n.appendChild(btn);
    if (b.mode === "momentary") this._momentary(btn, b);
    else btn.addEventListener("click", () => this._handleAction(b, b.tap_action, btn));
    this._updaters.push((hass) => {
      const so = b.entity ? hass.states[b.entity] : null;
      btn.classList.toggle("unavailable", !!b.entity && unavailable(so));
      if (b.active_entity) btn.classList.toggle("active", isOn(hass.states[b.active_entity], b.active_state));
    });
    return n;
  }

  // Tabs; the tab whose path matches the current URL is highlighted.
  _dNav(item) {
    const side = item.style === "side";
    const n = this._place(h("div", "d d-nav" + (side ? " side" : "")), item, side ? 200 : null, null);
    n.style.height = "";
    const tabs = (item.tabs || []).map((t) => {
      const b = h("button", "d-tab");
      b.textContent = t.label;
      if (item.font_size) Object.assign(b.style, { fontSize: item.font_size + "px", height: (item.tab_height || 36) + "px", padding: "0 12px" });
      if (!t.path) b.disabled = true;
      else b.addEventListener("click", () => this._handleAction(t, { action: "navigate", navigation_path: t.path }, b));
      n.appendChild(b);
      return [t, b];
    });
    this._updaters.push(() => {
      const here = location.pathname;
      for (const [t, b] of tabs)
        b.classList.toggle("on", !!t.path && (here === viewPath(t.path) || [].concat(t.match || []).map(viewPath).includes(here) || item.active === t.label));
    });
    return n;
  }

  // Alarm banner: red with time + message while active, quiet otherwise.
  _dAlarm(a) {
    const n = this._place(h("div", "d d-alarm"), a, this._W, 40);
    const led = h("span", "d-led");
    led.style.setProperty("--c", DESIGN_COLORS.red);
    const time = h("span", "d-num");
    const msg = h("span");
    n.append(led, time, msg);
    n.addEventListener("click", () => this._handleAction(a, a.tap_action || { action: "more-info" }, n));
    const quiet = ["", "unknown", "unavailable", "none", "ok", "off", "0", "false"];
    this._updaters.push((hass) => {
      const so = a.entity ? hass.states[a.entity] : null;
      const text = so ? String(so.state) : "";
      const active = a.active_entity ? isOn(hass.states[a.active_entity]) : !quiet.includes(text.trim().toLowerCase());
      n.classList.toggle("on", active);
      led.classList.toggle("on", active);
      time.textContent = active && so ? stamp(so.last_changed) : "";
      msg.textContent = active ? a.text || text : a.ok_text ?? "Geen actieve alarmen";
    });
    return n;
  }

  // PMS converter block: name, type, power; red on alarm, green when active.
  _dBlock(bk) {
    const n = this._place(h("div", "d d-block"), bk, 120, null);
    n.style.height = "";
    if (bk.rating) {
      const r = h("div", "rt");
      r.textContent = bk.rating;
      n.appendChild(r);
    }
    const hd = h("div", "hd");
    const led = h("span", "d-led");
    hd.append(led, bk.name ?? "");
    const bd = h("div", "bd");
    bd.textContent = bk.kind ?? "";
    const ft = h("div", "ft");
    n.append(hd, bd, ft);
    if (bk.entity) n.addEventListener("click", () => this._handleAction(bk, bk.tap_action || { action: "more-info" }, n));
    this._updaters.push((hass) => {
      const alarm = !!bk.alarm_entity && isOn(hass.states[bk.alarm_entity]);
      const active = !alarm && !!bk.active_entity && isOn(hass.states[bk.active_entity]);
      n.classList.toggle("alarm", alarm);
      n.classList.toggle("active", active);
      led.classList.toggle("on", alarm || active);
      led.style.setProperty("--c", alarm ? DESIGN_COLORS.red : DESIGN_COLORS.green);
      const so = bk.entity ? hass.states[bk.entity] : null;
      ft.textContent = `${fmt(num(so, bk.factor), bk.decimals ?? 1, hass)} ${unitOf({ unit: bk.unit }, so) || "kW"}`;
    });
    return n;
  }

  // Plain rectangle for wiring lines, dividers and backgrounds; can light up from an entity.
  _dLine(item) {
    const n = this._place(h("div", "d"), item, 3, 3);
    const off = item.color || "#4a4a4a";
    Object.assign(n.style, { background: off, borderRadius: (item.radius ?? 0) + (typeof item.radius === "string" ? "" : "px") });
    if (item.border) n.style.border = item.border;
    if (item.active_entity) {
      this._updaters.push((hass) => {
        n.style.background = isOn(hass.states[item.active_entity], item.active_state) ? color(item.active_color, DESIGN_COLORS.amber) : off;
      });
    }
    return n;
  }

  // Free text (or an entity value) in the screen font; boxed: true draws a labelled box.
  _dText(item) {
    const n = this._place(h("div", "d" + (item.boxed ? " d-box" : "")), item, null, null);
    const s = n.style;
    if (item.font_size) s.fontSize = item.font_size + "px";
    if (item.color) s.color = item.color;
    if (item.weight) s.fontWeight = item.weight;
    if (item.uppercase) Object.assign(s, { textTransform: "uppercase", letterSpacing: ".12em" });
    if (item.mono) n.classList.add("d-num");
    s.whiteSpace = "pre-line";
    if (item.active_entity || item.alarm_entity) {
      this._updaters.push((hass) => {
        const alarm = activeOf(hass, item.alarm_entity);
        n.classList.toggle("alarm", alarm);
        n.classList.toggle("active", !alarm && activeOf(hass, item.active_entity, item));
      });
    }
    if (item.tap_action || item.active_entity) {
      n.style.cursor = "pointer";
      n.addEventListener("click", () =>
        this._handleAction(item, item.tap_action || { action: "more-info", entity: item.entity || [].concat(item.active_entity)[0] }, n)
      );
    }
    if (!item.entity) {
      n.textContent = item.text ?? "";
      return n;
    }
    this._updaters.push((hass) => {
      const so = hass.states[item.entity];
      const val = num(so, item.factor);
      const unit = unitOf(item, so);
      const txt = val == null ? (so?.state ?? "—") : fmt(val, item.decimals ?? 0, hass);
      n.textContent = `${item.text ? item.text + " " : ""}${txt}${unit ? " " + unit : ""}`;
    });
    return n;
  }

  // ---------- schematic items ----------

  // Pipe through absolute points. While the medium flows, dashes run along it in point order.
  _dPipe(p) {
    const pts = p.points || [];
    if (pts.length < 2) return null;
    const t = p.thickness ?? 8;
    const pad = t * 2 + 4;
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    const x0 = Math.min(...xs) - pad;
    const y0 = Math.min(...ys) - pad;
    const local = pts.map(([x, y]) => [x - x0, y - y0]);
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "item d-pipe");
    svg.setAttribute("width", Math.max(...xs) - x0 + pad);
    svg.setAttribute("height", Math.max(...ys) - y0 + pad);
    Object.assign(svg.style, { left: x0 + "px", top: y0 + "px" });
    const media = this._media();
    const col = color(p.color || media[p.medium], media.seawater);
    const d = roundedPath(local, p.radius ?? t * 2);
    const dash = p.dash || [t * 1.2, t * 1.8];
    const period = dash[0] + dash[1];
    let arrow = "";
    if (p.arrow) {
      const [ax, ay] = local[local.length - 1];
      const [bx, by] = local[local.length - 2];
      const a = Math.atan2(ay - by, ax - bx);
      const L = t * 2.2;
      const W = t * 1.4;
      const pt = (dx, dy) => `${ax + dx * Math.cos(a) - dy * Math.sin(a)},${ay + dx * Math.sin(a) + dy * Math.cos(a)}`;
      arrow = `<polygon class="bs" points="${pt(L * 0.6, 0)} ${pt(-L * 0.4, -W)} ${pt(-L * 0.4, W)}" fill="${col}"/>`;
    }
    svg.innerHTML =
      `<path d="${d}" fill="none" stroke="${p.casing || "#0a0b0c"}" stroke-width="${t + 4}" stroke-linejoin="round" stroke-linecap="${p.cap || "butt"}"/>` +
      `<path class="bs" d="${d}" fill="none" stroke="${col}" stroke-width="${t}" stroke-linejoin="round" stroke-linecap="${p.cap || "butt"}"/>` +
      `<path class="fl" d="${d}" fill="none" stroke="${p.flow_color || "rgba(255,255,255,.75)"}" stroke-width="${Math.max(1.5, t * 0.45)}"` +
      ` stroke-linecap="round" stroke-dasharray="${dash.join(" ")}" visibility="hidden"/>` +
      arrow;
    const base = svg.querySelectorAll(".bs");
    const flow = svg.querySelector(".fl");
    const dir = p.reverse ? 1 : -1;
    const anim = flow.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: dir * period }], {
      duration: (period / (p.speed || 40)) * 1000,
      iterations: Infinity,
    });
    anim.pause();
    const idle = p.idle_opacity ?? 0.3;
    this._updaters.push((hass) => {
      const on = p.flow_entity ? activeOf(hass, p.flow_entity, p, "flow") : p.flow === true;
      base.forEach((b) => b.setAttribute(b.tagName === "path" ? "stroke-opacity" : "fill-opacity", on ? 1 : idle));
      flow.setAttribute("visibility", on ? "visible" : "hidden");
      if (on) anim.play();
      else anim.pause();
    });
    return svg;
  }

  // Ship outline seen from above, bow to the right (bow: left to flip).
  _dHull(item) {
    const n = this._place(h("div", "d d-hull"), item, 1200, 360);
    const fill = item.color || "#141516";
    const line = item.border || "#3a3a3a";
    n.innerHTML =
      `<svg viewBox="0 0 1000 300" preserveAspectRatio="none" width="100%" height="100%" style="display:block;overflow:visible${item.bow === "left" ? ";transform:scaleX(-1)" : ""}">` +
      `<path d="M14,34 C300,6 640,8 790,34 C900,56 975,110 996,150 C975,190 900,244 790,266 C640,292 300,294 14,266 Q4,150 14,34 Z"` +
      ` fill="${fill}" stroke="${line}" stroke-width="2" vector-effect="non-scaling-stroke"/>` +
      `<path d="M34,52 C300,26 630,28 775,52 C875,72 940,115 958,150 C940,185 875,228 775,248 C630,272 300,274 34,248 Q26,150 34,52 Z"` +
      ` fill="none" stroke="${line}" stroke-width="1" stroke-dasharray="6 6" vector-effect="non-scaling-stroke" opacity=".6"/>` +
      `</svg>`;
    return n;
  }

  // P&ID-style symbols. They light up (colour `color`, default green) from active_entity / entity.
  _dSymbol(s) {
    const kind = s.type;
    const [dw, dh] = {
      pump: [48, 48], valve: [44, 26], hx: [100, 48], filter: [36, 48], strainer: [44, 70],
      propeller: [40, 130], outlet: [80, 30], smoke: [70, 40],
      engine: [100, 70], generator: [48, 48], converter: [48, 48], battery: [80, 44], fan: [70, 70],
      gate_valve: [44, 26], ball_valve: [44, 26], globe_valve: [44, 26], butterfly_valve: [30, 34], check_valve: [40, 26],
      three_way_valve: [44, 44], motor_valve: [44, 50], solenoid_valve: [44, 50], relief_valve: [36, 50], instrument: [40, 40],
      vessel: [50, 100], compressor: [48, 48], heater: [70, 40], sight_glass: [40, 28], reducer: [30, 30], motor: [48, 48],
    }[kind];
    const n = this._place(h("div", "d d-sym"), s, dw, dh);
    const W = s.width ?? s.size ?? dw;
    const H = s.height ?? s.size ?? dh;
    const m = Math.min(W, H);
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    if (s.rotation) svg.style.transform = `rotate(${s.rotation}deg)`;
    const cx = W / 2;
    const cy = H / 2;
    // Valve body (two triangles meeting in the middle) between heights y0 and y1.
    const bow = (y0, y1) => `M2,${y0} L${cx},${(y0 + y1) / 2} L2,${y1} Z M${W - 2},${y0} L${cx},${(y0 + y1) / 2} L${W - 2},${y1} Z`;
    // Valve with an actuator box on top (letter M = motor, S = solenoid).
    const actuated = (letter) => {
      const y0 = H * 0.48;
      const yc = (y0 + H - 2) / 2;
      return `<path class="ac" d="${bow(y0, H - 2)}"/><line class="ln" x1="${cx}" y1="${yc}" x2="${cx}" y2="${H * 0.36}"/>` +
        `<rect class="bd" x="${W * 0.2}" y="1" width="${W * 0.6}" height="${H * 0.36 - 1}" rx="2"/>` +
        `<text class="gl" x="${cx}" y="${H * 0.18 + 1}" text-anchor="middle" dominant-baseline="central" style="font-size:${H * 0.26}px">${letter}</text>`;
    };
    const zig = Array.from({ length: 9 }, (_, i) => `${10 + (i * (W - 20)) / 8},${i % 2 ? H * 0.25 : H * 0.75}`).join(" ");
    svg.innerHTML = {
      pump:
        `<circle class="bd" cx="${cx}" cy="${cy}" r="${m / 2 - 2}"/>` +
        `<polygon class="ac" points="${cx - m * 0.18},${cy - m * 0.3} ${cx - m * 0.18},${cy + m * 0.3} ${cx + m * 0.34},${cy}"/>`,
      valve: `<path class="ac" d="${bow(2, H - 2)}"/>`,
      gate_valve: `<path class="ac" d="${bow(2, H - 2)}"/>`,
      ball_valve: `<path class="ac" d="${bow(2, H - 2)}"/><circle class="bd" cx="${cx}" cy="${cy}" r="${m * 0.3}"/>`,
      globe_valve: `<path class="ac" d="${bow(2, H - 2)}"/><circle class="ac" cx="${cx}" cy="${cy}" r="${m * 0.2}"/>`,
      butterfly_valve:
        `<line class="ln" x1="3" y1="2" x2="3" y2="${H - 2}"/><line class="ln" x1="${W - 3}" y1="2" x2="${W - 3}" y2="${H - 2}"/>` +
        `<ellipse class="ac" cx="${cx}" cy="${cy}" rx="${W * 0.14}" ry="${H * 0.42}" transform="rotate(35 ${cx} ${cy})"/>` +
        `<circle class="bd" cx="${cx}" cy="${cy}" r="${m * 0.08}"/>`,
      check_valve: `<path class="ac" d="M2,2 L${W - 7},${cy} L2,${H - 2} Z"/><line class="ln" x1="${W - 4}" y1="2" x2="${W - 4}" y2="${H - 2}"/>`,
      three_way_valve:
        `<path class="ac" d="${bow(2, H * 0.6)} M${cx},${H * 0.31} L${cx - H * 0.3},${H - 2} L${cx + H * 0.3},${H - 2} Z"/>`,
      motor_valve: actuated("M"),
      solenoid_valve: actuated("S"),
      // Inlet from below, outlet to the side, spring on top.
      relief_valve: (() => {
        const yb = H * 0.66;
        const r = H - 2 - yb;
        const top = yb - r - 3;
        const spring = [0, 1, 2, 3, 4].map((i) => `${cx + (i % 2 ? -1 : 1) * W * 0.16},${top - (i * (top - 3)) / 4}`);
        return `<path class="ac" d="M${cx - r},${H - 2} L${cx + r},${H - 2} L${cx},${yb} Z M${W - 2},${yb - r} L${W - 2},${yb + r} L${cx},${yb} Z"/>` +
          `<polyline class="ln" points="${cx},${yb} ${cx},${top} ${spring.join(" ")}"/>`;
      })(),
      instrument:
        `<circle class="bd" cx="${cx}" cy="${cy}" r="${m / 2 - 2}"/>` +
        `<text class="gl" x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" style="font-size:${m * 0.3}px">${s.letter || "PI"}</text>`,
      vessel: `<rect class="bd" x="1" y="1" width="${W - 2}" height="${H - 2}" rx="${W / 2 - 1}" ry="${Math.min(W / 2, H / 4)}"/>`,
      compressor:
        `<circle class="bd" cx="${cx}" cy="${cy}" r="${m / 2 - 2}"/>` +
        `<path class="ln" d="M${cx - m * 0.3},${cy - m * 0.4} L${cx + m * 0.36},${cy - m * 0.17} M${cx - m * 0.3},${cy + m * 0.4} L${cx + m * 0.36},${cy + m * 0.17}"/>`,
      heater:
        `<rect class="bd" x="1" y="1" width="${W - 2}" height="${H - 2}" rx="4"/>` +
        `<polyline class="ln" points="${[[6, cy], [W * 0.22, cy], ...Array.from({ length: 7 }, (_, i) => [W * 0.22 + ((i + 1) * W * 0.56) / 8, i % 2 ? cy + H * 0.2 : cy - H * 0.2]), [W * 0.78, cy], [W - 6, cy]].map((p) => p.join(",")).join(" ")}"/>`,
      sight_glass:
        `<line class="ln" x1="3" y1="2" x2="3" y2="${H - 2}"/><line class="ln" x1="${W - 3}" y1="2" x2="${W - 3}" y2="${H - 2}"/>` +
        `<line class="ln" x1="3" y1="${cy}" x2="${cx - m * 0.4}" y2="${cy}"/><line class="ln" x1="${cx + m * 0.4}" y1="${cy}" x2="${W - 3}" y2="${cy}"/>` +
        `<circle class="bd" cx="${cx}" cy="${cy}" r="${m * 0.4}"/><circle class="ac" cx="${cx}" cy="${cy}" r="${m * 0.18}"/>`,
      reducer: `<path class="bd" d="M2,2 L${W - 2},${H * 0.28} L${W - 2},${H * 0.72} L2,${H - 2} Z"/>`,
      hx: `<rect class="bd" x="1" y="1" width="${W - 2}" height="${H - 2}" rx="6"/><polyline class="ln" points="${zig}"/>`,
      filter:
        `<polygon class="bd" points="${cx},2 ${W - 2},${cy} ${cx},${H - 2} 2,${cy}"/>` +
        `<line class="ln" x1="${cx}" y1="6" x2="${cx}" y2="${H - 6}" stroke-dasharray="4 4"/>`,
      strainer:
        `<rect class="bd" x="2" y="2" width="${W - 4}" height="${H * 0.45}" rx="${W * 0.2}"/>` +
        [0.3, 0.5, 0.7].map((f) => `<line class="ln" x1="${W * f}" y1="${H * 0.1}" x2="${W * f}" y2="${H * 0.4}"/>`).join("") +
        `<rect class="bd" x="${W * 0.22}" y="${H * 0.47}" width="${W * 0.56}" height="${H * 0.5}" rx="4"/>` +
        `<path class="ac" d="M${W * 0.33},${H * 0.66} L${W * 0.5},${H * 0.6} L${W * 0.67},${H * 0.66} L${W * 0.5},${H * 0.88} Z"/>`,
      propeller:
        `<g class="blades"><ellipse class="ac" cx="${cx}" cy="${H * 0.26}" rx="${W * 0.32}" ry="${H * 0.23}"/>` +
        `<ellipse class="ac" cx="${cx}" cy="${H * 0.74}" rx="${W * 0.32}" ry="${H * 0.23}"/></g>` +
        `<circle class="bd" cx="${cx}" cy="${cy}" r="${W * 0.18}"/>`,
      outlet: `<path class="ln" d="M2,${H * 0.4} q${W / 8},${H * 0.6} ${W / 4},0 t${W / 4},0 t${W / 4},0 t${W / 4},0"/>`,
      smoke: [0, 1, 2].map(() => `<circle class="puff" cx="${W - 12}" cy="${cy}" r="${H * 0.3}"/>`).join(""),
      // Engine outline drawn in a 100×70 box and stretched to the item size.
      engine:
        `<g transform="scale(${W / 100},${H / 70})"><path class="ln" vector-effect="non-scaling-stroke" stroke-width="3"` +
        ` d="M6,18 V58 M6,38 H18 M18,22 H38 V12 H30 V6 H54 V12 H46 V22 H68 V30 H80 V22 H94 V60 H80 V52 H68 V64 H32 L18,52 Z"/></g>`,
      generator:
        `<circle class="bd" cx="${cx}" cy="${cy}" r="${m / 2 - 2}"/>` +
        `<text class="gl" x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" style="font-size:${m * 0.4}px">${s.letter || "G"}</text>`,
      motor:
        `<circle class="bd" cx="${cx}" cy="${cy}" r="${m / 2 - 2}"/>` +
        `<text class="gl" x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" style="font-size:${m * 0.4}px">${s.letter || "M"}</text>`,
      converter:
        `<rect class="bd" x="1" y="1" width="${W - 2}" height="${H - 2}" rx="3"/>` +
        `<line class="ln" x1="${W - 4}" y1="4" x2="4" y2="${H - 4}"/>` +
        `<text class="gl" x="${W * 0.28}" y="${H * 0.3}" text-anchor="middle" dominant-baseline="central">${(s.glyphs || ["~", "="])[0]}</text>` +
        `<text class="gl" x="${W * 0.72}" y="${H * 0.72}" text-anchor="middle" dominant-baseline="central">${(s.glyphs || ["~", "="])[1]}</text>`,
      battery:
        `<rect class="bd" x="${W * 0.15}" y="0" width="${W * 0.14}" height="${H * 0.18}"/>` +
        `<rect class="bd" x="${W * 0.71}" y="0" width="${W * 0.14}" height="${H * 0.18}"/>` +
        `<rect class="bd" x="1" y="${H * 0.18}" width="${W - 2}" height="${H * 0.82 - 1}" rx="3"/>` +
        `<text class="gl" x="${W * 0.22}" y="${H * 0.55}" text-anchor="middle" dominant-baseline="central">+</text>` +
        `<text class="gl" x="${W * 0.78}" y="${H * 0.55}" text-anchor="middle" dominant-baseline="central">−</text>`,
      fan:
        `<rect class="bd" x="1" y="1" width="${W - 2}" height="${H - 2}" rx="4"/>` +
        `<g class="rotor">${[0, 90, 180, 270]
          .map((a) => `<ellipse class="ln" cx="${cx}" cy="${cy - m * 0.22}" rx="${m * 0.09}" ry="${m * 0.2}" transform="rotate(${a} ${cx} ${cy})"/>`)
          .join("")}<circle class="ac" cx="${cx}" cy="${cy}" r="${m * 0.08}"/></g>`,
    }[kind];
    n.appendChild(svg);
    if (s.label) {
      const lb = h("div", "lb");
      lb.textContent = s.label;
      if (s.label_position === "above") lb.style.bottom = "calc(100% + 4px)";
      else lb.style.top = "calc(100% + 4px)";
      // label_offset: [dx, dy] moves the label away from its default spot.
      const [lx, ly] = s.label_offset || [0, 0];
      if (lx || ly) lb.style.translate = `${lx}px ${ly}px`;
      n.appendChild(lb);
    }
    const stateIds = s.active_entity || s.entity;
    if (s.entity || s.tap_action) {
      n.classList.add("click");
      n.addEventListener("click", () => this._handleAction(s, s.tap_action || { action: "more-info" }, n));
    }
    if (s.speed) n.style.setProperty("--dur", s.speed + "s");
    const on = s.color ? color(s.color) : kind === "propeller" ? this._media().shaft : DESIGN_COLORS.green;
    this._updaters.push((hass) => {
      const alarm = activeOf(hass, s.alarm_entity);
      const active = stateIds ? activeOf(hass, stateIds, s) : s.active === true;
      n.classList.toggle("on", alarm || active);
      n.style.setProperty("--c", alarm ? DESIGN_COLORS.red : on);
    });
    return n;
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
        history.pushState(null, "", viewPath(a.navigation_path));
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

/*!
 * Shipborn Panel Card
 * Console-style control panels (buttons with status LEDs, emergency stops,
 * throttle levers, knobs, embedded screens) for Home Assistant dashboards.
 */
const VERSION = "0.5.6";

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
  .d { font-family: "Barlow Condensed", "Roboto Condensed", "Arial Narrow", sans-serif; color: var(--ink, #ecebe6); }
  .d-num, .d-valbox { font-family: "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace; font-weight: 600; color: var(--ink, #ecebe6); }
  .d-lbl { font-size: 13px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-muted, #8f8e88); }
  .d-ph {
    display: flex; align-items: center; gap: 10px; white-space: nowrap;
    font-size: 15px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-muted, #a3a29c);
  }
  .d-led { width: 10px; height: 10px; border-radius: 50%; flex: none; background: var(--line-strong, #3a3a3a); }
  .d-led.on { background: var(--c, var(--ok, #34d27b)); box-shadow: 0 0 8px var(--c, var(--ok, #34d27b)); }
  .d-led.on.blink { animation: blink 1s steps(2, start) infinite; }
  .d-panel { background: var(--surface, #1b1b1b); border: 1px solid var(--line, #2c2c2c); border-radius: 10px; }
  .d-panel > .d-ph { position: absolute; left: 18px; top: 14px; }
  .d-valbox {
    box-sizing: border-box; min-width: 70px; padding: 6px 12px; font-size: 18px; text-align: right; white-space: nowrap;
    background: var(--surface-raised, #121212); border: 1px solid var(--line, #2c2c2c); border-radius: 6px;
  }
  .d-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .d-col { display: flex; flex-direction: column; gap: 4px; }
  .d-gauge svg { width: 100%; height: auto; display: block; overflow: visible; }
  .d-track { position: relative; box-sizing: border-box; overflow: hidden; background: var(--surface-raised, #121212); border: 1px solid var(--line, #2c2c2c); }
  .d-fill { position: absolute; transition: height .4s, width .4s, left .4s; }
  .d-zero { position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; background: var(--line-strong, #6b6a66); }
  .d-mark { position: absolute; left: 0; right: 0; border-top: 2px dashed var(--ink, #ecebe6); }
  .d-scale { display: flex; flex-direction: column; justify-content: space-between; }
  .d-box {
    box-sizing: border-box; display: flex; align-items: center; justify-content: center; text-align: center;
    background: var(--surface-raised, #121212); border: 1px solid var(--line-strong, #4a4a4a); border-radius: 6px;
    font-size: 16px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--ink, #cfcec8);
  }
  .d-btn {
    box-sizing: border-box; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; gap: 12px;
    padding: 0 16px; border-radius: 8px; border: 1px solid var(--line-strong, #3a3a3a); background: var(--surface, #232323); color: var(--ink, #ecebe6);
    font-family: inherit; font-size: var(--fs, 19px); font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  }
  .d-btn:hover { background: var(--surface-raised, #2a2a2a); }
  .d-dlg { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, .6); }
  .d-dlg > div {
    width: min(420px, calc(100vw - 32px)); box-sizing: border-box; padding: 22px; display: flex; flex-direction: column; gap: 18px;
    background: var(--surface, #1b1b1b); border: 1px solid var(--line-strong, #3a3a3a); border-radius: 12px; box-shadow: 0 12px 40px rgba(0, 0, 0, .6);
  }
  .d-dlg .d-ph { white-space: normal; }
  .d-dlg p { margin: 0; font-size: 22px; font-weight: 600; line-height: 1.3; color: var(--ink, #ecebe6); white-space: pre-line; }
  .d-dlg .row { display: flex; gap: 12px; }
  .d-dlg .d-btn { height: 52px; }
  .d-dlg .d-btn.yes { border-color: var(--ok, #34d27b); color: var(--ok, #34d27b); background: var(--ok-soft, #12261a); }
  .d-zone {
    box-sizing: border-box; border: 2px dashed rgba(20, 21, 22, .35); border-radius: 8px; cursor: pointer;
    transition: background .3s, border-color .3s; -webkit-tap-highlight-color: transparent;
  }
  .d-zone:hover { background: rgba(20, 21, 22, .06); }
  .d-zone.on { border: 2px solid var(--accent, #f5a524); background: rgba(245, 165, 36, .16); }
  .d-zone.alarm { border: 2px solid var(--alarm, #ff5b4f); background: rgba(255, 91, 79, .3); animation: zalarm 1s steps(2, start) infinite; }
  @keyframes zalarm { to { background: rgba(255, 91, 79, .08); } }
  .d-zone .chip {
    position: absolute; left: 6px; top: 6px; display: flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 5px;
    background: var(--surface, #141516); color: var(--ink, #ecebe6); font-size: 13px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap;
  }
  .d-zone .chip .d-led { width: 8px; height: 8px; }
  .d-zone .chip .v { font-family: "JetBrains Mono", monospace; letter-spacing: 0; color: var(--ink, #cfcec8); }
  .d-pop { position: fixed; inset: 0; z-index: 10000; display: none; align-items: center; justify-content: center; background: rgba(0, 0, 0, .6); }
  .d-pop.open { display: flex; }
  .d-pop > .box { background: var(--surface, #1b1b1b); border: 1px solid var(--line-strong, #3a3a3a); border-radius: 12px; box-shadow: 0 12px 40px rgba(0, 0, 0, .6); overflow: hidden; }
  .d-pop .hd { display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 6px 0 20px; border-bottom: 1px solid var(--line, #2c2c2c); }
  .d-pop .hd .d-ph { font-size: 17px; color: var(--ink, #ecebe6); }
  .d-pop .x { width: 44px; height: 44px; border: 0; border-radius: 8px; background: none; color: var(--ink-muted, #a3a29c); font-size: 22px; cursor: pointer; }
  .d-pop .x:hover { background: var(--surface-raised, #2a2a2a); color: var(--ink, #ecebe6); }
  .d-pop .body { position: relative; }
  .d-zoom { display: none; z-index: 50; background: rgba(13, 14, 16, 0); transition: background .45s; }
  .d-zoom.in { background: var(--bg, #0d0e10); }
  .d-zoom .zv { position: absolute; inset: 0; overflow: hidden; transition: clip-path .45s ease; }
  .d-zoom .zi { position: absolute; left: 0; transform-origin: 0 0; transition: transform .45s ease; }
  .d-zoom .zm { position: absolute; box-sizing: border-box; border: 3px solid var(--accent, #f5a524); border-radius: 8px; }
  .d-zoom .zp {
    position: absolute; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden;
    opacity: 0; transform: translateX(40px); transition: opacity .35s .1s, transform .35s .1s;
  }
  .d-zoom.in .zp { opacity: 1; transform: none; }
  .d-zoom .zh { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 10px 10px 18px; border-bottom: 1px solid var(--line, #2c2c2c); }
  .d-zoom .zh .d-ph { font-size: 17px; color: var(--ink, #ecebe6); }
  .d-zoom .zh .d-btn { width: auto; height: 44px; font-size: 15px; }
  .d-zoom .zb { flex: 1; overflow-y: auto; overscroll-behavior: contain; }
  .d-zoom .zc { position: relative; }
  .d-btn:active, .d-btn.pressed { background: #333; }
  .d-btn.left { justify-content: flex-start; }
  .d-btn.stop { background: var(--alarm-soft, #3a1512); border-color: var(--alarm, #ff5b4f); color: var(--ink, #ffd9d6); }
  .d-btn.active { border-color: var(--accent, #f5a524); color: var(--accent, #f5a524); background: var(--accent-soft, #261f12); }
  .d-btn.static { cursor: default; color: var(--ink-muted, #a3a29c); font-size: var(--fs, 15px); }
  .d-btn.static.active { color: var(--accent, #f5a524); }
  .d-btn.unavailable { opacity: .4; cursor: not-allowed; }
  .d-nav { display: flex; gap: 4px; }
  .d-nav.side { flex-direction: column; gap: 10px; }
  .d-tab {
    display: flex; align-items: center; height: 44px; padding: 0 18px; border: 0; border-radius: 6px; background: none;
    color: var(--ink-muted, #a3a29c); font-family: inherit; font-size: 17px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
    cursor: pointer; -webkit-tap-highlight-color: transparent;
  }
  .d-tab:hover { color: var(--ink, #ecebe6); background: #1f1f1f; }
  .d-tab.on { color: var(--bg, #0d0e10); background: var(--accent, #f5a524); }
  .d-tab[disabled] { color: var(--ink-muted, #5f5e5a); background: none; cursor: default; }
  .side .d-tab { height: 52px; padding: 0 16px; border: 1px solid var(--line-strong, #3a3a3a); border-radius: 8px; background: var(--surface, #232323); color: var(--ink, #cfcec8); font-size: 18px; font-weight: 700; }
  .side .d-tab.on { border-color: var(--accent, #f5a524); color: var(--accent, #f5a524); background: var(--accent-soft, #261f12); }
  .side .d-tab[disabled] { color: var(--ink-muted, #5f5e5a); border-style: dashed; background: var(--surface, #232323); }
  .d-alarm {
    box-sizing: border-box; display: flex; align-items: center; gap: 12px; padding: 0 24px; cursor: pointer;
    background: var(--surface, #141516); border-top: 1px solid var(--line, #2c2c2c); border-bottom: 1px solid var(--line, #2c2c2c);
    color: var(--ink-muted, #8f8e88); font-size: 17px; letter-spacing: .04em; white-space: nowrap; overflow: hidden;
  }
  .d-alarm.on { background: var(--alarm-soft, #3a1512); border-color: var(--alarm, #ff5b4f); color: var(--ink, #ffd9d6); }
  .d-alarm .d-num { font-size: 14px; font-weight: 400; color: inherit; }
  .d-block { display: flex; flex-direction: column; }
  .d-block > div { box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid var(--line-strong, #3a3a3a); }
  .d-block .hd { height: 30px; border-radius: 6px 6px 0 0; background: var(--surface, #232323); font-size: 17px; font-weight: 700; letter-spacing: .1em; }
  .d-block .bd { height: 62px; border-top: 0; border-bottom: 0; background: var(--surface-raised, #121212); color: var(--ink-muted, #a3a29c); font-family: "JetBrains Mono", monospace; font-size: 15px; }
  .d-block .ft { height: 34px; border-radius: 0 0 6px 6px; background: var(--surface, #1b1b1b); font-family: "JetBrains Mono", monospace; font-weight: 600; font-size: 16px; }
  .d-block .rt { position: absolute; top: -30px; left: 0; right: 0; border: 0; color: var(--ink-muted, #a3a29c); font-family: "JetBrains Mono", monospace; font-size: 14px; }
  .d-block.alarm > div:not(.rt) { border-color: var(--alarm, #ff5b4f); }
  .d-block.alarm .hd { background: var(--alarm-soft, #3a1512); color: var(--ink, #ffd9d6); }
  .d-block.active > div:not(.rt) { border-color: var(--ok, #34d27b); }
  .d-block.active .hd { background: var(--ok-soft, #12261a); color: var(--ok, #34d27b); }
  .d-box.active { border-color: var(--ok, #34d27b); color: var(--ok, #34d27b); background: var(--ok-soft, #12261a); box-shadow: 0 0 12px rgba(52, 210, 123, .25); }
  .d-box.alarm { border-color: var(--alarm, #ff5b4f); color: var(--ink, #ffd9d6); background: var(--alarm-soft, #3a1512); }
  svg.d-pipe { overflow: visible; pointer-events: none; }
  .d-pipe .bs { transition: stroke-opacity .4s; }
  .d-hull { pointer-events: none; }
  .d-sym { cursor: default; }
  .d-sym.click { cursor: pointer; }
  .d-sym > svg { width: 100%; height: 100%; display: block; overflow: visible; }
  .d-sym .bd, .d-sym .ac { fill: var(--surface-raised, #121212); stroke: var(--ink-muted, #8f8e88); stroke-width: 2; stroke-linejoin: round; transition: fill .3s, stroke .3s; }
  .d-sym .ln { fill: none; stroke: var(--ink-muted, #8f8e88); stroke-width: 2; stroke-linecap: round; }
  .d-sym.on .bd, .d-sym.on .ac, .d-sym.on .ln { stroke: var(--c); }
  .d-sym.on .ac { fill: var(--c); }
  .d-sym.on > svg { filter: drop-shadow(0 0 5px var(--c)); }
  .d-sym .lb {
    position: absolute; left: 50%; transform: translateX(-50%); white-space: pre; text-align: center; line-height: 1.1;
    font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-muted, #a3a29c);
  }
  .d-sym .blades { transform-box: fill-box; transform-origin: center; }
  .d-sym.on .blades { animation: prop var(--dur, .5s) linear infinite alternate; }
  .d-sym .puff { opacity: 0; fill: var(--ink-muted, #8f8e88); transform-box: fill-box; transform-origin: center; }
  .d-sym.on .puff { animation: puff 2.4s ease-out infinite; }
  .d-sym .gl { fill: var(--ink-muted, #8f8e88); font: 600 14px "JetBrains Mono", monospace; transition: fill .3s; }
  .d-sym.on .gl { fill: var(--c); }
  .d-sym .rotor { transform-box: fill-box; transform-origin: center; }
  .d-sym.on .rotor { animation: spin var(--dur, 1s) linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .d-sym .shaft { stroke-dasharray: 6 3; }
  .d-sym.on .shaft { animation: shaft var(--dur, .5s) linear infinite; }
  @keyframes shaft { to { stroke-dashoffset: -9; } }
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
  "relief_valve", "instrument", "vessel", "compressor", "heater", "sight_glass", "reducer", "motor", "jet_thruster",
];
const DESIGN_TYPES = ["panel", "gauge", "bar", "tank", "value", "indicator", "pushbutton", "nav", "alarm", "block", "line", "text", "pipe", "hull", "zone", ...SYMBOLS];
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
  "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&family=JetBrains+Mono:wght@400;600&display=swap";
const DESIGN_COLORS = { amber: "#f5a524", blue: "#4aa3ff", green: "#34d27b", red: "#ff5b4f", grey: "#8f8e88" };

// Web fonts can't be declared inside a shadow root, so they go in the document head (once).
const ensureFonts = () => {
  if (document.getElementById("sb-design-fonts")) return;
  const l = document.createElement("link");
  l.id = "sb-design-fonts";
  l.rel = "stylesheet";
  l.href = DESIGN_FONTS;
  document.head.appendChild(l);
};

// ---------- TC90 JOAL design (card option design: tc90) ----------
// Colours per theme, generated from tokens.json of the design system "TC90 JOAL Bediening".
const TC_THEMES = {
  nacht: {
    "bg": "#16191c", "surface": "#202428", "surface-raised": "#2a2f34", "ink": "#eef1f3",
    "ink-muted": "#a3acb4", "line": "#3b4249", "line-strong": "#77818b", "accent": "#22aee8",
    "on-accent": "#04131b", "accent-soft": "#103a4d", "ok": "#3ccf7e", "ok-soft": "#143523",
    "warn": "#f5a524", "warn-soft": "#3f2e0d", "alarm": "#ff6e63", "on-alarm": "#1a0503",
    "alarm-soft": "#4a1b18", "scrim": "#000000b3", "brand-blue": "#099fdc", "brand-gold": "#c9a14a",
    "media-seawater": "#3cc7d6", "media-freshwater": "#4aa3ff", "media-hotwater": "#e0453a", "media-fuel": "#c0803f",
    "media-oil": "#e8c547", "media-hydraulic": "#f5a524", "media-exhaust": "#8f8e88", "media-wastewater": "#a58763",
    "media-glycol": "#b57be0", "media-power": "#ff9f1c", "shadow-dialog": "0 16px 48px #000000a6",
  },
  dag: {
    "bg": "#e9edf0", "surface": "#ffffff", "surface-raised": "#f4f6f8", "ink": "#11171c",
    "ink-muted": "#505b65", "line": "#d3d9de", "line-strong": "#7d8893", "accent": "#0472a3",
    "on-accent": "#ffffff", "accent-soft": "#e2f2fa", "ok": "#126f33", "ok-soft": "#dcf1e3",
    "warn": "#9a5b00", "warn-soft": "#fbecd2", "alarm": "#c62a1f", "on-alarm": "#ffffff",
    "alarm-soft": "#fbe1de", "scrim": "#11171c80", "brand-blue": "#099fdc", "brand-gold": "#c9a14a",
    "media-seawater": "#13909e", "media-freshwater": "#1f6fc8", "media-hotwater": "#b8301f", "media-fuel": "#94591f",
    "media-oil": "#8f7408", "media-hydraulic": "#a86605", "media-exhaust": "#6b6a66", "media-wastewater": "#7a5c3c",
    "media-glycol": "#7d45b3", "media-power": "#b25e00", "shadow-dialog": "0 16px 48px #11171c40",
  },
  rood: {
    "bg": "#000000", "surface": "#0f0302", "surface-raised": "#1a0504", "ink": "#ff5a45",
    "ink-muted": "#de4a34", "line": "#3a0c08", "line-strong": "#b8361f", "accent": "#ff3b2b",
    "on-accent": "#000000", "accent-soft": "#3a0a06", "ok": "#de4a34", "ok-soft": "#1a0504",
    "warn": "#ff7a3c", "warn-soft": "#220801", "alarm": "#ff2414", "on-alarm": "#000000",
    "alarm-soft": "#250302", "scrim": "#000000cc", "brand-blue": "#099fdc", "brand-gold": "#c9a14a",
    "media-seawater": "#de4a34", "media-freshwater": "#de4a34", "media-hotwater": "#de4a34", "media-fuel": "#de4a34",
    "media-oil": "#de4a34", "media-hydraulic": "#de4a34", "media-exhaust": "#de4a34", "media-wastewater": "#de4a34",
    "media-glycol": "#de4a34", "media-power": "#de4a34", "shadow-dialog": "none",
  },
};
const TC_THEME_ORDER = ["nacht", "dag", "rood"];
const TC_THEME_NAMES = { nacht: "Nacht", dag: "Dag", rood: "Rood nacht" };
const TC_THEME_KEY = "shipborn-tc-theme";
// Line icons on a 24 grid (design system icon set), drawn in currentColor.
const TC_ICONS = {
  schip: "M12 3v14M12 4l7 11h-7M11 6.5 5 15h6M3 18h18l-2.5 3h-13z",
  energie: "M13 2 4 14h7l-1 8 9-12h-7z",
  motor: "M4 9h3l2-2h6v3h2l2-2h1v8h-1l-2-2h-2v3H9l-2-2H4zM2 11v4",
  water: "M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z",
  klimaat: "M10 14V4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0zM12 10v7",
  verlichting: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.8.6 1.5 1.6 1.5 2.6V17h4v-.5c0-1 .7-2 1.5-2.6A6 6 0 0 0 12 3z",
  bilge: "M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0",
  alarm: "M12 3 22 21H2zM12 10v5M12 18v.5",
  anker: "M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 6v15M8 10h8M4 14a8 8 0 0 0 16 0M2.5 14H5M19 14h2.5",
  diesel: "M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M7 8h4M14 10h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3",
  accu: "M3 7h16v10H3zM21 10v4M6.5 10v4M10 10v4",
  walstroom: "M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5",
  ventilator: "M12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM12 10.5C11 6 13 3 16 3.5s1.5 6-2.6 7.6M13.3 12.8c3.4 2.9 4.2 6.3 1.6 7.8s-5.1-3.2-3.6-6.5M10.7 12.8C6.4 14.2 3.2 13 3.5 10s5.5-3.2 7.6.3",
  pomp: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9.5 8l7 4-7 4z",
  klep: "M3 7v10l9-5zM21 7v10l-9-5zM12 12V5M9 4.5h6",
  generator: "M3 7h18v10H3zM7 17v3M17 17v3M8 12h1.5l1.5-2.5 2 5 1.5-2.5H16",
  verwarming: "M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-3 2-4 2.5-6.5 1 1.3 2 2 2.5 2.5V3z",
  navlicht: "M12 3v3M8 6h8l-1 4H9zM9 10l-1 11h8l-1-11M6 21h12",
  interieur: "M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6",
  instellingen: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1",
  zon: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5",
  maan: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  lifebeat: "M2 12h4l2.5-6 4.5 12 2.5-6H22",
  aan: "M12 3v8M6.3 6.3a8 8 0 1 0 11.4 0",
  pijl: "M9 6l6 6-6 6",
  vink: "M5 12.5l4.5 4.5L19 7.5",
  sluit: "M6 6l12 12M18 6 6 18",
  tank: "M6 3h12v18H6zM6 13h12M9 16h6"
};
const tcIcon = (name, size = 28) =>
  `<svg class="tc-icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${TC_ICONS[name] || TC_ICONS.alarm}"/></svg>`;
const tcStoredTheme = () => {
  try {
    return localStorage.getItem(TC_THEME_KEY);
  } catch (e) {
    return null;
  }
};
// Status words instead of raw HA states.
const TC_WORDS = { on: "AAN", off: "UIT", open: "OPEN", closed: "DICHT", opening: "OPENT", closing: "SLUIT", unavailable: "—", unknown: "—" };
const tcWord = (state, cfg = {}) => cfg.states?.[state] ?? TC_WORDS[state] ?? String(state).toUpperCase();
// Tone of a value: alarm/warn outside the alarm_*/warn_* limits, only while tone_entity is active (e.g. engine running).
const toneOf = (hass, cfg, v) => {
  if (v == null) return null;
  if (cfg.tone_entity && !activeOf(hass, cfg.tone_entity, cfg, "tone")) return null;
  if ((cfg.alarm_above != null && v > cfg.alarm_above) || (cfg.alarm_below != null && v < cfg.alarm_below)) return "alarm";
  if ((cfg.warn_above != null && v > cfg.warn_above) || (cfg.warn_below != null && v < cfg.warn_below)) return "warn";
  return null;
};
const TC_STYLE =
  Object.entries(TC_THEMES)
    .map(([t, v]) => `[data-tc-theme="${t}"] { ${Object.entries(v).map(([k, c]) => `--${k}: ${c};`).join(" ")} }`)
    .join("\n") +
  `
  .tc, .tc-dlg { --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px; --space-8: 32px; --radius-sm: 4px; --radius-md: 10px; --radius-lg: 18px; --radius-pill: 999px; --touch-min: 56px; --icon-sm: 20px; --icon-md: 28px; --icon-lg: 40px; --statusbar-h: 56px; --alarmbar-h: 40px; --navbar-h: 88px; --screen-w: 1280px; --screen-h: 800px; --stroke-icon: 1.75; --stroke-pipe: 6px;
    --font-sans: Barlow, "Segoe UI", system-ui, sans-serif; --font-cond: "Barlow Condensed", "Arial Narrow", sans-serif;
    --font-mono: "JetBrains Mono", ui-monospace, Menlo, monospace; font-family: var(--font-sans); color: var(--ink); }
  .tc { background: var(--bg); transition: background .3s; }
  .tc > .shape { display: none; }
  .tc .value-xl { font: 600 56px/56px var(--font-cond); letter-spacing: -.5px; }
  .tc .value-lg { font: 600 36px/40px var(--font-cond); }
  .tc .value-md { font: 600 26px/30px var(--font-cond); }
  .tc .title, .tc-dlg .title { font: 600 22px/28px var(--font-sans); }
  .tc .label, .tc-dlg .label { font: 500 16px/22px var(--font-sans); text-transform: none; white-space: nowrap; }
  .tc .body, .tc-dlg .body { font: 400 15px/22px var(--font-sans); }
  .tc .caption { font: 600 12px/16px var(--font-sans); letter-spacing: .8px; text-transform: uppercase; color: var(--ink-muted); }
  .tc .nav { font: 500 13px/16px var(--font-sans); }
  .tc .mono { font: 400 14px/20px var(--font-mono); }
  .tc-icon { fill: none; stroke: currentColor; stroke-width: var(--stroke-icon); stroke-linecap: round; stroke-linejoin: round; flex: none; }
  .tc-unit { color: var(--ink-muted); margin-left: var(--space-1); }
  [data-tc-theme="rood"] .tc-img, [data-tc-theme="rood"] img.item { filter: grayscale(1) brightness(.5) sepia(1) saturate(8) hue-rotate(-40deg) brightness(.5); }
  .tc button { font: inherit; color: inherit; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  .tc button:focus-visible, .tc-dlg button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

  /* existing screen items inside a TC90 card */
  .tc .d { color: var(--ink); font-family: var(--font-sans); }
  .tc .d-panel { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md); }
  .tc .d-panel > .d-ph { left: var(--space-4); top: var(--space-3); font: 600 12px/16px var(--font-sans); letter-spacing: .8px; color: var(--ink-muted); }
  .tc .d-row { gap: var(--space-3); }
  .tc .d-led { background: var(--line); }
  .tc .d-led.on { background: var(--c); box-shadow: none; }
  .tc .tc-ind-state { margin-left: auto; font: 600 12px/16px var(--font-sans); letter-spacing: .8px; color: var(--ink-muted); }
  .tc .tc-ind-state.on { color: var(--ok); }

  /* status bar */
  .tc-statusbar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 var(--space-6); background: var(--surface); border-bottom: 1px solid var(--line); }
  .tc-sb-ident { display: flex; align-items: center; min-width: 0; }
  .tc-sb-logo { height: 26px; width: auto; display: block; }
  .tc-sb-title { text-align: center; }
  .tc-sb-right { display: flex; align-items: center; justify-content: flex-end; gap: var(--space-4); color: var(--ink-muted); }
  .tc-sb-stat { display: inline-flex; align-items: center; gap: var(--space-1); cursor: pointer; }
  .tc-sb-statval { font: 600 18px/1 var(--font-cond); color: var(--ink); }
  .tc-sb-stat.tc-tone-ok { color: var(--ok); }
  .tc-sb-stat.tc-tone-warn, .tc-sb-stat.tc-tone-warn .tc-sb-statval { color: var(--warn); }
  .tc-sb-stat.tc-tone-alarm, .tc-sb-stat.tc-tone-alarm .tc-sb-statval { color: var(--alarm); }
  .tc-sb-stat.tc-tone-accent { color: var(--accent); }
  .tc-sb-time { color: var(--ink); }
  .tc-sb-theme { display: grid; place-items: center; width: 44px; height: 44px; margin-right: -8px; border: 0; border-radius: var(--radius-md); background: transparent; color: var(--ink); cursor: pointer; }
  .tc-sb-theme:active { background: var(--surface-raised); }

  /* alarm bar */
  .tc-alarmbar { display: flex; align-items: center; gap: var(--space-3); padding: 0 var(--space-6); border: 0; text-align: left; cursor: pointer; }
  .tc-alarmbar-none { background: var(--bg); color: var(--ink-muted); border-bottom: 1px solid var(--line); }
  .tc-alarmbar-none .tc-icon { color: var(--ok); }
  .tc-alarmbar-alarm { background: var(--alarm); color: var(--on-alarm); }
  .tc-ab-time { opacity: .9; }
  .tc-ab-text { flex: 1; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tc .tc-alarmbar-alarm .caption { color: inherit; }
  .tc-blink { animation: tc-blink 1s steps(2, jump-none) infinite; }
  @keyframes tc-blink { 50% { background: var(--alarm-soft); color: var(--alarm); } }
  @media (prefers-reduced-motion: reduce) { .tc-blink, .tc-switch.is-busy .tc-icon { animation: none; } }

  /* sub-page tabs in the status bar */
  .tc-sb-tabs { display: flex; gap: var(--space-1); padding: var(--space-1); background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius-md); }
  .tc-sb-tab { height: 38px; padding: 0 var(--space-4); border: 0; border-radius: 7px; background: transparent; color: var(--ink-muted); cursor: pointer; }
  .tc-sb-tab:active { background: var(--surface-raised); }
  .tc-sb-tab.is-active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }

  /* navigation bar, in a dock fixed to the bottom of the screen */
  .tc-dock { position: fixed; z-index: 4; overflow: hidden; background: var(--surface); }
  .tc-dock-top { top: var(--header-height, 0px); }
  .tc-dock-bottom { bottom: 0; }
  .tc-dock > * { transform-origin: 0 0; box-sizing: border-box; }
  .tc-navbar { display: flex; background: var(--surface); border-top: 1px solid var(--line); }
  .tc-nav-item { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-width: var(--touch-min); border: 0; background: transparent; color: var(--ink-muted); cursor: pointer; }
  .tc-nav-item.is-active { color: var(--accent); }
  .tc-nav-item.is-active::before { content: ""; position: absolute; top: -1px; left: 22%; right: 22%; height: 3px; border-radius: 0 0 var(--radius-sm) var(--radius-sm); background: var(--accent); }
  .tc-nav-item:active { background: var(--surface-raised); }
  .tc-nav-item:disabled { opacity: .45; cursor: default; }
  .tc-nav-icon { position: relative; display: inline-flex; }
  .tc-nav-badge { position: absolute; top: -6px; right: -14px; min-width: 20px; height: 20px; padding: 0 5px; box-sizing: border-box; border-radius: var(--radius-pill); background: var(--alarm); color: var(--on-alarm); font: 600 13px/20px var(--font-cond); text-align: center; }

  /* tile */
  .tc-tile { display: flex; flex-direction: column; gap: var(--space-2); padding: 14px var(--space-4); background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md); text-align: left; color: var(--ink); }
  button.tc-tile { cursor: pointer; }
  button.tc-tile:active { background: var(--surface-raised); }
  .tc-tile-head { display: flex; align-items: center; gap: var(--space-2); color: var(--ink-muted); }
  .tc-tile-flag { margin-left: auto; display: inline-flex; }
  .tc-tile-val { display: flex; align-items: baseline; margin-top: auto; white-space: nowrap; }
  .tc-tile-sub { color: var(--ink-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tc-tile.tc-tone-warn { background: var(--warn-soft); border-color: var(--warn); }
  .tc-tile.tc-tone-warn .tc-tile-head, .tc-tile.tc-tone-warn .tc-tile-head .caption, .tc-tile.tc-tone-warn .tc-tile-val { color: var(--warn); }
  .tc-tile.tc-tone-alarm { background: var(--alarm-soft); border-color: var(--alarm); }
  .tc-tile.tc-tone-alarm .tc-tile-head, .tc-tile.tc-tone-alarm .tc-tile-head .caption, .tc-tile.tc-tone-alarm .tc-tile-val { color: var(--alarm); }

  /* switch */
  .tc-switch { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-2); padding: var(--space-3); background: var(--surface); border: 1px solid var(--line-strong); border-radius: var(--radius-md); color: var(--ink-muted); cursor: pointer; text-align: center; }
  .tc-switch-label { color: var(--ink); line-height: 20px; }
  .tc-switch:active { background: var(--surface-raised); }
  .tc-switch.is-on { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
  .tc .tc-switch.is-on .tc-switch-state { color: var(--accent); }
  .tc-switch.is-busy { border-style: dashed; border-color: var(--accent); }
  .tc-switch.is-busy .tc-icon { animation: tc-pulse 1.2s ease-in-out infinite; color: var(--accent); }
  .tc-switch.is-fault { background: var(--alarm-soft); border-color: var(--alarm); color: var(--alarm); }
  .tc .tc-switch.is-fault .tc-switch-state { color: var(--alarm); }
  .tc-switch:disabled { opacity: .45; cursor: default; }
  @keyframes tc-pulse { 50% { opacity: .35; } }

  /* dial (270° gauge) */
  .tc-gauge { text-align: center; }
  .tc-gauge svg { display: block; width: 100%; height: auto; fill: none; stroke-linecap: round; }
  .tc-g-track { stroke: var(--line); stroke-width: 14; }
  .tc-g-zone { stroke: var(--warn); stroke-width: 4; }
  .tc-g-val { stroke: var(--accent); stroke-width: 14; transition: d .4s; }
  .tc-gauge.tc-tone-warn .tc-g-val { stroke: var(--warn); }
  .tc-gauge-center { position: absolute; left: 0; right: 0; display: flex; justify-content: center; align-items: baseline; }
  .tc-gauge-label { display: flex; justify-content: center; align-items: center; gap: var(--space-1); }
  .tc-gauge.tc-tone-warn .tc-gauge-label, .tc-gauge.tc-tone-warn .tc-gauge-center { color: var(--warn); }
  .tc-gauge-range { position: absolute; display: flex; justify-content: space-between; }

  /* hotspot */
  .tc-hotspot { display: flex; align-items: center; gap: var(--space-2); transform: translate(-7px, -50%); padding: 0; border: 0; background: transparent; cursor: pointer; color: var(--ink); z-index: 1; }
  .tc-hotspot.is-left { flex-direction: row-reverse; transform: translate(calc(-100% + 7px), -50%); }
  .tc-hs-dot { width: 14px; height: 14px; border-radius: var(--radius-pill); background: var(--accent); box-shadow: 0 0 0 4px var(--bg); flex: none; }
  .tc-hs-pill { display: inline-flex; align-items: center; gap: var(--space-2); min-height: 44px; padding: 0 var(--space-4) 0 var(--space-3); box-sizing: border-box; border-radius: var(--radius-pill); background: var(--surface); border: 1px solid var(--line-strong); white-space: nowrap; }
  .tc-hs-pill .tc-icon { color: var(--ink-muted); }
  .tc-hs-val { font: 600 22px/1 var(--font-cond); }
  .tc-hs-val:empty, .tc-hs-pill .ic:empty { display: none; }
  .tc-hs-pill .ic, .tc-switch .ic { display: inline-flex; }
  .tc-hotspot.is-active .tc-hs-pill { background: var(--accent-soft); border-color: var(--accent); }
  .tc-hotspot.is-active .tc-hs-pill .tc-icon { color: var(--accent); }
  .tc-hotspot.tc-tone-warn .tc-hs-dot { background: var(--warn); }
  .tc-hotspot.tc-tone-warn .tc-hs-pill { border-color: var(--warn); background: var(--warn-soft); color: var(--warn); }
  .tc-hotspot.tc-tone-warn .tc-hs-pill .tc-icon { color: var(--warn); }
  .tc-hotspot.tc-tone-alarm .tc-hs-dot { background: var(--alarm); }
  .tc-hotspot.tc-tone-alarm .tc-hs-pill { border-color: var(--alarm); background: var(--alarm-soft); color: var(--alarm); }
  .tc-hotspot.tc-tone-alarm .tc-hs-pill .tc-icon { color: var(--alarm); }

  /* confirm dialog */
  .tc-dlg { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; background: var(--scrim); }
  .tc-dialog { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); width: 420px; max-width: calc(100% - 48px); padding: var(--space-6); box-sizing: border-box; background: var(--surface-raised); border: 1px solid var(--line-strong); border-radius: var(--radius-md); box-shadow: var(--shadow-dialog); text-align: center; color: var(--ink); }
  .tc-dialog > .tc-icon { color: var(--accent); }
  .tc-dialog-text { margin: 0; color: var(--ink-muted); white-space: pre-line; }
  .tc-dialog-btns { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); width: 100%; margin-top: var(--space-2); }
  .tc-btn { height: var(--touch-min); border-radius: var(--radius-md); border: 1px solid var(--line-strong); background: var(--surface); color: var(--ink); cursor: pointer; font-weight: 600; }
  .tc-btn-primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
  .tc-btn-danger { background: var(--alarm); border-color: var(--alarm); color: var(--on-alarm); }
`;

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
  "shipborn-joal": "data:image/webp;base64,UklGRtxkAABXRUJQVlA4WAoAAAAQAAAAcgIAVwAAQUxQSNwnAAAB90cmbdPWv/XtjojEoXyUkNg2kiRJEZG1e4+y/Te4KmseCyL6PwF/H4/pESDN2XmVY4GdY0VS2yZJuobOixfrlay1eKrstdYpktZyd3bmFxgrb62/VfZdkiE5iXGybXhPIkk5ZKVf2bm9s/+9iS1ROrmjkaQkQO+nZBKfSAzRjZpzultNdw+9SQJJBrRvStIXWVeMlSTap9xFIRN/1/pRVf1JiyRD3bh6ao4vIODiWbZdAKIx4B186LYuG++THol+MFKjJJLstmRb8jXWd4OtzzIYtG0kKeYPe/87AhExAWmupUhzuktRRUtVeu4EshxSkebecJRKCjL7oEVnlVRpwB0nm1eajejSdVwwE+qOe5VMNzIbS1ZseLHcSkkbBhvZMLOyWVBlmgWS9HVBFY0aafoD0VM9tG0rk6Q7a597vy8iG6rfe2JmZmZmZnDZkscsWcxMLlqymG1mZmap/4bqqozv3rONDyLii4isf8iKiAnwhW23ajvRtl2t9T7GnHNJHLckSII8uLuVAU/gwV3L3d3d3R23Mtzd3UPhFMElZOmUMXprG3POkQU8vhURE8Bd1ZyeeWIsbeJma8LrvxtAhXk3QATzxrwIwJ15ERf0Z6juPF4d2OvUxzpNbI2Z01sgWWCDU7HtBGnsM1cAEfd47keffCjPnYsfxJW1KHi9C614RTMvacFLWvCSIDk+m5sbF+E1cQckiUoVFbAeAsSCFmJBWogFLSgWtCI4eK/EA5fw5WREzoCWXFAIp3lmcQiJ4N7DeP0XzaI4mcUxuLy4rlMar1PJE6hEZeOGIzWBDJxuTItJbMzco3sZrd1LwGSSVIIf6ie2vEBZ6CyWmXMpZumlWHKiqEISpw30fEhWa+KaSg4rJ7a7iahZ6zyN+o6vMkKv/+Nrd5LEnNLFOg6W9jVr4xWDYpiZK6ojhC9kYtnhdROiTg/j4cTh6wzPXhjHAn0OGseAlr0lxGEQtGw9oYwjuLTSCltrgn56bgG+LfVZx2NbkeIla7kPtzpDs1tdCXjusDqlGHzN9yLHmLkvFM2yC6Au9BSgstBYdCbbQ4yMuw56pxMM8iMq+cE3yWfrcu35+Pw/3LAhcpOI5U3Lal/ru32/7/mVfKMDgP/j2zd3P3Txsy8j9WgoUX0/UiK/enTJh8pTmU4WutyI+tSaShkvcipMAYnaA9TiyJwNF3ytb/ktvtkHncVaipXdnpUaVk+7Q5QKdDtnpQDJ3Vo+/PjXaJkIDjndkDY3/dHXGbziIze+N4p7WuHETToC2OBbzhpyhPDpL/w5T4E9IxeCuXMhFtIzYiFXtPV8c+Kfi5fe9qykEHAYH5Hf67//u7Tg8tnHz37gv8IAY582eJjWnlhzk+33/JYfMrcMYt58/JJrrxprBRXIa3txYu3Vm2ozv/vAhxFhrENcKk7f4zfUCFQiLmEXV/y4MFwPZQeB1lrHHLHHAm7+Ky3mkdywlPOms3lLy5KMt1fZnaorbDucQvDQvk3YWrnVp6++4S+vZKB8ROqn9w9c+Wt8aDEPVqOolUs3PP7QVYC0QAKwwQnAPaet0rYoSrmXDOEc3NZ86lt9boHMxaN9p6/miMLln5r1IoC4ssqrr/3Kgs8cMeSeDFrTimda8UwrnmnFcW2+RThpGbcEWcqyZjJeKkgWTXoZ7JMuLsDbsVdu1XEQFO75w9HvZX9EnowzrmF5YpgM7ZRL0pih7PCRtwxiLgrOdncCd31rfrsxc7BW9iH1NfPHblNCuPZH96eoMtc8lVa5fOqoSTBnhzU+8HH3QgjctktzAjCZ3LaItCaaWRkIA0HpHWBRJwIMNjer9HQT5a//sFfv1/KIoEu6hiQYBGRjdbJccMJRgTIovb2khW7zmZ+6/XPyQsFOpfXsyplCtM/+jK/Zo3BdBddM1XFUwNeSFL/5teklxO1bVHEHxZkGKMH2QIdq7mWajbZrFsk0Ho1q1krJps7N9AmzUQprTd93r0AKQk83j71KEe2FamLGok3otO31oD65yfsYwt983Q2alPJaRA7rtMpkU2XmPlWMT9eRPGW/8BbiJRnnXNbm3taXvNyi/mhibKQYMiVNjRkCY4qNsa66/g4rUqrQ0y1AOanq1ohgqReIlizYgFrur1ls2JyPX85cahzcKZK/FoHDzMxKmwq3AI7WUyRXrvMJL7iXzjtRdpF3h6U3SkF7MFXj+a//cs/jBLUpMPSF+z75J//tfwzeELBt30QZhN4WeOXSG25b2mC8vfo22++whuK9QIRpm9bGLBD0NUHfdfN3a5pR7Qesn6IjQ1xKWOPrf7p9man4cqUAT4z+w4+PzZ12JZ84ar0yvxvziDuwT90f7n4y4+G6zE4+evftdvsHIstlLN53jXW+8uM3Q93C8Iw6IvT2wIvfu+ThDpES0cQKW1xL8D6gidkDXrfc7QpabvareclZlGyFvU2iMOhSqCCNBQffjCyP6Su//sdIE8bBicJ5BSE7wV3uivRi43udoAfjLqmmzaXXHPOXJ1le4/L5213x6idTyVwSzYjrkZS+Rrr0Gw8N1GygHClUHaS45C9LqSrOKrHu050rOitaCrJEwReRRLAkFLoAWh9qwEWnTno103985F/E8IFfR3Jtsb3cot+VR6madyeFK6+rPZppwltNi7X22B01r5a4Y2DvlyV73eCZpUw5GRf6Cu2LHyJLLuJGT4n4DS/h/cAZGVFLr4VgKvQvKpsvyEXFUYJ6HC/RLYMD42MDLhV6uGrf8Sy5M9RTgPMqxvHmykvTe7jL6j/XeDBglpBk5I1dVnGppEdvU0hCbFX+GJ2qS0bIkrGcZU5rCKmAcE9BGruC6bNPq/WTpIHjW3lkeZouVmu7vpuqTgefk3kB6TTXzopZqzu+HL6pgMw7kLsRpG5J5yT50rX10biTwMuEip5AVeP5xqnBzNkoteYXFnaouvJTBGP53WJoUtXhWU3NK8CIUVnYe1ZH+7S8WN5OzT9sW2qfzhUHFm0tQI3rF77f13Ww2Ty8cYIPPohq34FdegrmVVW3Yx6qCTsP1kMNPRLCFtSBYuJmrIL5e6ejQ9rE1R3xsiKpsdVgNhAvQIjtDW4cln54fOna+FqozV/TtIraBrt3jOitM5mLhgCeaGw0H3+iQKKxQ+ubh9lsChNFsG4i/a++VC0eaeO//r8SIMC7C6GGVYMFOg0eh0eiQ8FRnSXxcbTSPydqGZ0rbnH0sehoxfOFzYbE2iVUs+Z7fmEVcK5+opg68fghnMrOUYNYM5c/DrPCJ1sgsBzs8+v6u7HN9LFf3PN4u+aQ1uSZvCDP5E3yTPab/JSwH0oe/+T3feXulr0ZI6OZNTOaWTMjwGhmIK20w957eiVhpRkn84jLjCeQCvAeXeC+0qnfeR9O/84Gg6/GUqeE6KK/BOmHc2Ezn7Lg2+5hoZqy44aeTnk18/k2ZNS9j+AjNqfeu+gpCCroFgbEEgbEJmFArFkceJiqBkf7H9MYaTeAQhcGORIihRGOhMhIiBQGOQRS9nO+iFfyfJp5sH7u+HRqJyxNUP3/AFiHsjSR/7ApFcyOq6YisykSmOY7exULj1+Sh1qeh0AcDtoUpmcfC051sZnbt0MtJahxmdCStnUCAYV+vY/jaRudTz81VLZTDXCy80ozp8GPAhmgoROLY3OYKCcJhmcRFHdFaniWxDCZIMpJggEQr+mXbyBV6GnsR0Ia0kI8aqXCv5yBWC5uvUqN/hlfM3fM84sAQ+MHr2PaD5cfjM+QICJIbBWm19Z9qwfwLbgf0EiShLhmnoMTC4Sv10tsylh86XCzBJ/M/pN5Tg9j3SwbUmAkAwTzEIDEPAAjGXfozv39oayW03WaHspylICwnI1uiN5nqnyzLfS3PtkuSbBOh0tLbfjtSAXTJQvV6dmevcGx5/eoGSCbgm+3cbKTq3tb5Vlmr4M3mTu9BmoAkUEiKA0iS5ow0ZGydhMZJILSILKkAXcepXssrXe7i+wkYsJdpOkyE4mY7C6yk4hGtyL/gXulQKZ50KFViFcZoKvUBBXGr7z3Rk0Vuv5sapgrGi6l0tpxK9N+uOz3krqbkcn25prvR6D46vMWTA/Qj5xJ93Vy28QBG3IPOXLmK7MKqxV0iwCEAxAhEApABCACEA5AxCE1pfNhkGwddCKJYcLJwERS6olEQ+8kg04kMZxwMjCRXVqrj+42KVWcjEwes8d8okNlxaFyGDswjHr+JUJF8atfDdEw4qUQG/qhUDHpAbOSdvkMaR+7btLETd/+t+QG5fC5hxghr3Sm9YSL9qHYZsZPTiHA3GAUiUctyjwEMLHfGDTNdgFqeUhYvW9rmYEL3cEnfyrekOTuGz4qEIFqXAgdvxCrQNli547QHXWL+syjXRB+07oWr4DYx8eiAiH03bxFVppdunsTZJMAamAywZCASYNxAiYBk4AhAZMTeIt0U95FLIReFEBEYbcJ0FSaxzO604/p/ITO8+selDO/P9rgXDP6VUISCl3K5HrXKo31RGIQtutQ2H2uq+m95wydUmqVUv44VnO6g6SQvpb4X2AbgrxetnPE0ljJtQYkHUjo4KQBudaApHOm4qb6HlQSUN7DGQG7aDfZBolWpG869rJJZvlScFOeeqW534DYoOX5+kGhcF299xG1Cp2dvdB8ucLA4TjG2ZN67bWSKlh8cnWhW4QZmK4GNj3Zyfkd0YHnid0Lb7vxuodVxwUEA8jeDTVAXPipnFnj5fjMNIAAsYLd6KybPr1Yh1oqtVzBwwuXuFcwu2zfyVq2HDY+e2fUQ3Flbuk3SAVg75HQBThaY4f/U3bhRjvKCejeSSmncGADhOQFlbErfDOlltiFtaC1jgCaIfargGXji36iY4swgvRSAItlT/nubDUuepkopVyHPFwqWgEb3AF1QW4bpDhqdimJc27Py9qF96lVSHJwboA7QHJ98V+AAHwLkC4JNXaiMp6wknmyrEGAbmea+od7cFugmXd4485781eqtQVUh1LLS2FRFCt95W2JDeo3wyiu3erc95hYBfe1mECJoWxZ8XgUlXML03ziQrwCYZdtWwKWgNwDjAZC9NsIDcBYdtLa1/jZ38FGAp30/PefEKqvftYP7YWbLdG+N3G95TJ55NEF8kaRDdbAYqPLy6+U1nl5Cqs1rDXXdGeUV+VqpS8bxavIiu4qUEetiO20lqnpPdeGtre5ptQqSbfSyH+lBsxOy/T9fjvbvymFKO/9ze/BrWsnwrfZkzdyUrGJ55+qk1t/Ubh1bZ51NoeO7gDGHqGqslrDFMhkOQY9FMM58TlJZSe/4VZJVfj30Mhff+nb6EwWu/4wU2surYMOqazHnnFTCq6vIQHztrd6Owo2i6244WgN5oen+lIAYuDIVuPOx6cJUWlD9svViv8R3iC+1zdovYFYHUwL9vJgceL2HGkTxn6HVCi247YMaYzQokx7KGKx0vYn0g2wdyKeo2xSFmspN7Zfi1pKuZ1zlU1ndsxyzxcE8HoTjI53fOLqEp+yvXFuWv2jDZMynByiRNOW/GOJWj9c3tnKhP86Z6e2ExCPPRD3dMvnZMWnF8ZHaFMbKexrOeDfUbwlAm3Kmrsc4UpIf0I0uLiO/A2voOw1bfK/DkkB5sXrFszjfohNW6Mc1tLESzInvg3bxxEmgOYrgPmPX4itFt40Payfm6R4Tp6XWioi4axSK4jN2LWTWQIyd9Vvw3UEjsOLBwO4DvcDmXs3xUkLfjE4CiTf6IyEAAaja4DNdrF9cu6hCC7XMByskyRI7a77xNZwOSCpOIDlfYgifBsvbXE/beCVV2NuXpjKDhBnZMBxakDZ15lhcrN5ST2O3RQmcnUcp3UhvkHYdsiz0AFFehemm5sckHUHih6Aimf3U0xHbxrsqPsLY656VoRg5nkVK6/iHAUkTg2DrSLlUSULM64YDV7TtNpBTe2x7yD3B5g7GI+AWPC9SMIDF4XJVrvnSyQ4t6YIi85rwFXkO73Zg4fJP9DCHIqiOda89iz6Gh4OqgX2v4vUOcJuQNzYA1XLe+CmotddoEPJQcJ/P4CR5QjiUjy7rvhgvhxeKfoHYgIZ/VVftJ4W1GHgf/9fYkP0nRe1CVAp2tEunz6x8ZYkG8HtRnj2fHoEKS7r3bkTYPEZlw9QIIjy30837l+O4VgqOxTWrZtssVQlMm8nAsLKnL0Fy9/SUQkFe849NEtoS6NENBjLjSCAjNqsBfk2InbgPjM+w9LugNYVf1x8d9HJpxEI9Uz+W2ENXU/iDcJQw9nHGhhbxSsVe6yUBCC3WEhsFbZboaxFcRi0D1G0j1O+drBe/KZGVOC98VYWQ6o8RiU6Q+y9l0/dd/Vtt6dp5NOnTyO6DjREtF6nN78I5AYwwZnDmsoOnAZVncdMvI9mtSN5HaqttyiMg/T0FPswyU7LL/t6T8+0biNJ/2uc6OBDvSWr/+IfdHgrKqIlNgSISBtDIIRtA8VC2DYoLBT9B34f70BcMPn7v2yKNK6yOyAwBeggwApwgoDyxs+t8ZfbNKZ3muPLliXEtZYLwDghgR8e7iBMJm0Q5g4nN8KSL+fJZAWk0nOvZPTr7LOzhdcO1zeHoUjjuAcD2Ahfb9K/Yt0mdVQ3TNxqpiBPn/1Fzk4wyXJizGrHmGUni7/h1+X1VPMC5t//NfYfQrTkk8smneQOyrEnnnjpV2u/8m889ZcAoIFbJovXYDgUqVFoZczLmejMXSrBg8vyPpJmfdl5PSp7rU6w0zSLhX49ERx6GoaeJROb2zbzHoPFVEarTaiC21CtUycK9DwInk0VNB/Bz1AFU4wQXwzcbH0qvDWMPb2H6oa75KWghgvdkWvMDL6meTE6Lz3IBjHZExGApisgxfTVluNyOn3wnTdEwcuyPEsoNkga3Ieyl51GzFqQ/cRyh+jTja1mBzLTykSdzQaxrATEshIgEzJzNw58RrZCN/QTu6zugMQC0STJe6istvn32y6NF0RsX0+uYSxAWOxXKTeZYxUcXr0jq/UKA/EIDJAY41nnCscNlHuSWUsZQwCKZEKKjiJvy/QOjM8m6ROA6vOCEBQmDM8LhcTwdqH2jskTQC878BSA0DmCYnPi+grmRQAKNib/lV/2b+aSEYCiRycBhR+FVlDeMrNDtsaUXFN2w+lv3P9cw6RLGtn6u6AYj373h99Lz6QF9VenXYBXcDxvnw/q68MCJNpV6ru+uUy1eBiAqEMHVFsS4ylvCnpgVMVkjIGomFXXgidWB6t1VgdpSvbuGmd4CMsTe6xPAjSW2XgEQgug4WAAB8by4BwFkL7FqHoFW20rHwWgyItJZ+UDkApweUot7XJbtt9wEvDPffrTn+Lc8SPv+ZdYP5LvxQFA5CJl23sggqsG2fuK8685yp0BVIO5M7jBvEAleaDizCTY69LqQi0r7gowjP8Girner/e49cPim42YxTV8h1VN+3loXamliQC0hg5BML3n78P1gYaAohXK5/5BpfLEGiuqEsJFvMV8U2O6r5L5jpJ2em975rMAsQJ5InflHPE2cfgCOG3ytCkbaK0/Y621LmtPqp6daXoWd+1DwVYFIC2N8slQgiDXy3sU3iW5dxXerxzGm5tH5RUXiFdQ9l/4KaMACsmgKc/zsI87/c1vvCMzTw5kdvQGSXHOdGs1zeYC4+mvFrwf2D55XRC5yNfY9rVIN6DQL9Xw9Q40Ta/4ZLLZQLJv4euR2yA6YG8hN5FsdbLVZudayG1gwNy6Ig04sVPqEFs0BImNID2CAB6iB4HJpAohT+5BW2BpoR7vxMBTvfTV4BV87s4ZhbkwkZwvn7mbSAWRf7QFHCANHuHgYfQcnyydzRIQFi+RKs3O1CFhSs1xCwTGgPClZpX7reYa1CfRplvM+MY8dvXcJIp73N6q6Ai1BFUrAcgApKt3MB8HIlYC1DOboFsXhsJ9GHX46N7TxPphLGKrWrvAwMFrJO2X5J+nzYhZABW1LbcgYFz9dN2ZwqRLz8Uq2JauL1M0UbaJqzfrR7s4Cb5+fPTh4Xg83oYjze/301w2hZoehXsAxpugOLmbbnsfvGnzj/yEMtaZKOt/5cwnb/rVPqBk/oGNyiD62ZezD+xSXvM7dj3aLG98fXHa4vDVfPSsKxZC90ERr17Zz0fE+6nv/v0HA5kAyfl6NfwOhIpy8lI8BghZDB/ODcR+N+lMYXfl3BQqUNjHyIJMhRi2HeWFvJgUe63vKtyCf3KIyu3Gcps/9sralCk/CpKLls79bH7345Qx8y99fQlQvjJm6cJHza7cnHwoPDIHYENO2Q/46pf3OBZgXv7999D9TYL76CgA43HgofM09ROr/8ZnAZ7ZF6hatHHSfhYWn1ibaLZLUC12XmQBk8UX1TtTYGp5duujYhVKe3BGyKbE9YC21BGousa0LwkIdyFM3/G7OXUjNr79sWx3Hvu/9XHMleiM5B5KM/veBj879cXtHjC7cVhB+bPZj1cl7vKovby1NDpv2e7T7TKNfsM+++tO+dTw1+fs9WInzf7zQTffXd97hfTZn5xxH5TMe9C4a5b2A/H1shR6q55VysX/uSSrmjZ4c3vAmWKI/j5xcD2daFOApKjHU/EK6gu2Tmi8AMZyTkA3lxaxAzZIiqQxwsG/5Udw0z7n4f838DCDi/ouNFHBNvjyV4mnr/VIx75HrcYHLP0dZsxmyzF7eFaW7rrlu7fEyS3SL3i001k6t2hffEPODw/84M9jud758/0X1SIidHOLhRC1F24ZNumX+tCtioQwIxQiaqzk0175JVudXeveokEwlmvs6oqFZy+OLVW1MxIn18Ezx4KvYRxTE+wCpvVqLQFDkJfQwVlzj3PB5eUl8EmQrdyK4Mo5N/Xwo1DJi6TvAqWK+OS3h7U9wLFWjqzdGFz1lbK5ZZwxMGtFTkv2dcpsuozR+vDzQ3qp2fWNetJRyunf/Xldsoc//Re+3zfuQQxxFzQCWuojptYP56ZltZBnuRBRGN8bF7TTkocKe01521qubqVjDq13zjLBuIRGRzT6NickKTrP3o9tUD9wo45PBY0VkSrJ8mXSRKf9001McUZejghFuZkpVO7FPHbl6eSbW720k7eFuPJEsg8L7zd7XCIDMiyHW3pwtpeTHhja6cfI3B///N8UNyFb9uMsbxfxniI7vJeAuQ+9QafTsQcaWgFYTJDkmVBhLJpZqPuLncC6lNPfOhyFHBLU3/Y+UxC/RBKENudbpzU2cTlVxbJPKFMoDKxebVCqcmlrPnfLXimAcc1E4L6aPPT4sT8OCxz4HPfkXt4sBVgju87ST+Cvyf6utW8v/vVs3c4sbUaW4UTZQxRAk+PoTS8MtQUZf3peT4x6vwtkgpnp0hunozWn+SAuiMVgYB4y4kvL8DWRfHAyc8NBOdTTcTNcsPDEI3FScZ8CNzP9a0s3oOyzout5eBigoqh2CPA5Y0NinphUlO4HzO2+uPzlpaMfhpsAKc4o3NGWiwhDnGN2dpZfY/ZjPmlmP5VtLNmBZAEhe3kIaUwfjtJOAAWikCHQCYiyJ19IymwsWv7YPSHXIIT5lMcwzkyWS5l8eARn3ZnbJsslyTrQftBepmB+HiEUlExpJrV7b5e+QVLj0KkQ2WjAK8AxsiDRzxkGUBqzQAQ8lncNlu27Yrr05NFnPYxlV51xV0dxgSE5x+zKwTn3m31HTmova58hu6Rk73AJIvAoQlbPs0BPp1OCloYCcB12JPplNkuoP3gjW518vYE3FLEs0PtlWmdFhL4Gt1Yk5B0Ypm/1ZwYQPMoZZBSgUyIicg7egPKVtct6VvRtNUkVU/AgzpRel012fzMgdBcT9ZDdFzn5kUHx4H0ftJAJyRnmr2Z/qg9cbfYd3m1mH2L7MqXDEbpvIaAhxD6BjoOaQ5CAd0RStvUl5wayWuvyD4lcQRLrj6+TOAaK8aNXR5gzbQ5Of1HLKMrCwqEqPP2yH1UqGFfdPdC2IGZylrIsBJcLJqo3iA3/aga1oDFAilLj0Jm9B0p/8e0+/FyHsValkQlkmEy+6b5b4EK38/BLUeJdYY3ppVgPQ0NeJKE7UBPvOOApIUPTbrT0PbjA7LfMOu6M987U9ZPZVrkX7jBKRAJVhb6K1kH2I6kzc9Cln2hoBkSZFsTpiD3h0g9S4Mbf3vaYSCsO1HxU193mI+tj2scC2S+sTDGOmdfHx4aPf3cKdEt9JGTDcbTjM1WtVYu1coIOZ5re/vFrGYipjWiI5mHOv31lc6+C5eof3v6iwUCmWV1psw1+9ncayGDRePy5r23fD4fpAx1zwoHvkts5q91n/CcpdM8QAYmbp2SLhE+a3S2DwLC828oX56kJgHZppW5JDqBu+H7wkuV8i1dWQ2lQHnoE9z6YwqvX3nbjSJyRpfm7v2UIF3q7M3EJgQs+TRZnHP2BLegZfNerfnfpkmYL4awM7VGfvcnb3dpECpf8+Pb7n56I4tYhzn/bfrvgQmUXnrjiofj8v5x6c36dQdabNbTjSmsBPcT6C1k399ItMtYZrqn2LMF97qmLKLnPAnagC0SOsbR4qK4btsux9eNwQwOnm/2eoSSqEDQTeooqRBUQCYBq3il4HbukdhXjt5w9tiTH+iCPLyGaSg/cCJAKJEQgidLbIvc8ZNILkyO/yZdWnL8uSaUL8U1/8cqjy5b86u44Q2woDzxEV3F3cabVPsU/X2h/8r4QDt5tnQUr4q4sZxIFaJmIUfQ0l8S6cpe0uAvuTuC5KycnLSJScqednOkmIBnOUHwXpJNM99zkniFv5TcXdhT1IX5u5XcZzDM2fLUc2WSwVdasDW0CSFfJJDQtinupDuM2QQyuq0glos6pwrZsCOgAJUTNnjz3BUgqXYAbge5SVOjppoxetrisN5578zC8/ilHgRHoK8bsbeBDJ+SEorIxymMd96Sc7SkshLXdZ/x4FrirsvzmjgarnhBRtkvnIQfs3rIbEAYEBoQBgUFgQBgQGBBekQC8etEN7VoxmtAYmHwHPG3J6IDyFG2L1VI20Fpra1ZyJz1XvXrX04+5jaHfmZ0omtXjjNts/EBgtRvN3knD5gzNWlCy+frz15hRqynZrMFtStbceHJJe8bQdqt29D9OnJyoeTrWi2kQyBSkS1zr06uFFxzqmKJksYfMmspZv3/XHBIqXYD3EHq6EfC/n5kyc0k81sKQUlSqKm5lHE1BRToeYq0wkaUowc+TiCVtojVPHkSZcq8Jy2/66B3xGcgPKzdujz986RUPTF9Rcs2CECR3MPfiNfhKJGly3QJfLWNywHv1yNZpd0G0s8m8i/b/+sduuX90oRVfyFVAw+p/M7v1U2eO2RNHZlHq168rwL7WTjvRyDjgFAW2uJsjT/veCQDftvu3Mdf3LgfMzCGoCoBYexCv8ub1gpJ5Y1U1a3eS6QtbHXHISpBQhMqOe4Dx03/xUCsfbyULUO+cQlCWU0IIESuD9PS0IXDF3bmoBhU8z4MLb0ynNTFwQtQ//D2Lsyuq3axB2VOlOBsx2M2qkdkV1W7WoOypUtJNDlr7hTvub7WoLSnKThuFiTvonP9wYWP5Zy1kl3/7Gz9Irbj894+D7KE//btiTeE68O0V6sU17/VPbHHM7jOf+uYO9K7Dvue8as3bP7gymUjnlHXaGs1OOvVP6xCFR/5AGYLT/Fe8/rQxNdoDI53MrcZFRBsz9/zd5Uvv+sM2KeYRcCxlVEz+3n+VWValeYUoiJXZIK2Vdz7wbTmQXJAuxyUA7Wuv+etDPh1PpZDpaTRfMrflAbMWKKAUrVkMF6bYZeKlaZ2lL8w3fYMkuw/vlRz/ODcvQVMqzK1TupP34aa/9i1AB4b/8WvYrnDv1L/A/U3Ig7up6x0fpFulByKw6kZrQWgA9nWqy93vAlQSoXEi/d0Sl5WZjXcV1j3xQZ8e6BZm4v3gi7aBgljX6FKaTaJGbeMd37Z9LVC5aP3zupPuhfrIhCXzGBokyVuNLH9OSyNnChv26FMF9rJoYRp5g+Y8RDJYHDiZ0odul1RpVuTQktIr3YGHyZQ+dLukSrOijy0pvdIIOXFyZ6OwvTNXnNHDhqh9m+/CXNhRXVwKG0sFBvsN4HHo2aAqEiAGRYzkG3wITWkFb7h4GNv4N5Ypwv0pvaWRQ8h8+vC8av+iYgxsFgIQ1Dq191cf2mjFVVZZMFwme+7xxa88/KU3fZrqdCIChrEAKMr3+WMOY3lmLaTw8z/PjjMY8jf++FZ0IYtPH9Ce0fz9BkXUKJx2IlQCk2kjooRtp40oRbadTklUpfW+m1f9L8VKqk5Ez94c3fQm9d4nomenRZK9ET17c3QbC0MSqQxJmUXd9+YFKIGTZK5YAomkM09ABYQJMyGpZnaocgsZSF+K9nu/sg0QQ7c7p0fQ4M05GyJVbkH6qWxbjgRpZEpAJvlQWaQM4BA91KagVDEEi3oarEOfrDQgPCNkIdSzyqnaXNiHU7M+OJmNlhpqg916zx7UccDZenZLw1jtbD0b0jgWZ8+WTQpZTqHtWQWeWhIdU8qQEEWDoZbBUAqDoZYBU8qQECUj7eJwOjQU2sTgnu8aGkGsxqEOdQmNQ8tszE88uWVPVAxxNPRksRzde6NzYSkHd3EwL6UdLgow0toA7eNh2eVYl0dw2UMCEkIUQw0w0VxsW6cyjEGhHuoC4sKSpTiHSK4qAkZvIbBZFAKbuUBgMxcIkm6tlTZAx5J7ElHcIFSbKarZUVAnKKodIoobBNFNyeKO4hkMWH7XKKNDXqlDPR7XolOS5XAv1Vnkoh4yggIdDiVjeGvKhfC8IS3QSScTAdHdBpL0SVz0r2neRamXCtYdoVswM+ZuQdHsveMSaGYQGLTk4lxQ13D6CkQAuC8UAWQuVOaZMxXm3V0hdwy2kW3cSXBiILsNTgzOboM7CbYpkEaBUwYj884Rla1RyzCsJcYzGxJsgrl7bhnCXFHwWsFqspE1Q0YeBj4Z6etiv2lkIuYQ5UIj5zo40CcREJTDsHaHQwu5EAteKgteioVc0MwBYpo0nCI8DT0rfSpTUeY4UWiVVslpOEV4GnpWepZWInudVGkM0jRpOPHueZi26MDWFhOLvZF2Jnih52Q2jqeFfpmAJ1uzwn7G7BWHiy9ubKFPGS64uTERtZNE2bn5DDTykj1lEhnBbap1ZRL5DhJsjk3Z2drF1ma2BteVooNXUtk5bnCNdU/6uAm9U/biFzsjjiNlsbeK8aJpLJdZKwK6AnArsxYyZCuzVmToFKPsBTrv3s5NyeZkr1IQl93yC3PFktm99750JNqnDM/++30hWQmkdDMvYTFXCCACQME8BKAAUAggAkDBl2ljbGut+Re0F2ABKdAzFfbQhgxHSvCOO5SFMWa1zmLUbCizMiyMMat1FqNA8WUYpCZSv/4f+xVRekEiAXDD7MyVJAuEDgLFO88tlvrlGPBE+aXfb0WpIguL7hbhqS/Mqw3MnRdVngSlvsNItyJ9GSa1cymERxa968MzwGwERghQ3njW/MbMLEybFocSgPQO82V1t6ReiC39+rwjF603yMbOw+f/9Q7qgzEqEOL/Ky0AtTi85Cv53A2/z9d671DbFxq/7/r72qEWB2qZ8v9RBY8p+GBoP/Z3tuYNm0T4f6oCSCocakQ+RyuuWdFx/qcMVlA4INo8AADwqQCdASpzAlgAPjEUiEKiISEW284oIAMEtjd+EQokwR7NA/gDDAfhX+GaLy4D/S/kB3GGDu3f3X9jP7d+1/y5Vr+w/2b9G/3H/4f6r5SdonX3lScu/9D/CflF8z/8H/s/817lfzZ/uv79++/0BfrH/wv8X+TPxPfsl7k/7Z/svyg+AX9E/tH/h/zP7//K9/iP+5/lfct/Rv8l+z3/A+QL+m/4b/w+03/yf//7kX90/4P//9xH+bf2z/zezd/v//n/u/+x8lf9Z/2/7b/9T5EP6f/jf/b+evyAf+f1AP+96gH7/9yv/P/xb/Vr5dfEP0z+q/jb+6nrD+I/MP2T+7/sx/gP+//rviO/pfIF1n/1PJh9pPxf9z/dH/C+23+28OfjJ/i+oF+QfzH/Gfl1/hf3h+s/5P/j9xnsP+a/5v+X9gL1u+c/5f+8f5T/m/5P0gv63/Ffut7j/WT/b/bT9gP8p/nH+e/sv7qf4r5a/v//W/wHlv/Uv9D/sP8l+430Bfx/+if53+7/5r/h/5z/8/a5/F/8r/Hf5//x/6b9//i/+af4P/o/5r/Vftd9g38n/oH+m/uf+Z/8H+N////8+6f2E/tn/5fcl/V3/bfnIGAFUBaxP6vGn7M6/QCkYSK49EoVnYxccMUeN2psIQWax82i/UA6UZyU58gmkmNljSSydUv30HtRr+eQDMPqPqOGS3HuJVRy5WheCgYItZhopcaY2jsyTCbBHTqf+WKqJ4gP7hHvsWu2WP4YACQZzyclp+UDHdNxnOM6euln5IuBO1duVWuvRLUbRYBnNILDbcyLFVcz9l/I4yfthnHB8lEnA62JjdtNg2+hW97+ZVFu42OkZKKDoXTNcAn2bov1U0qEQFR/0V6DoF9r0/oYy4ZVjnJsbnOfeqonnlMjc5897s7l2zNOkMx21NrK/xojQTp2X5MzBpaXjudbraALi2EqNNJTmeYZN6T6dbxS3rv7wWmY1CKSYFEaV4R21tqEtIrJP09aMaVwX7PktbTaxsnXM5dpHPZzi+ERlZpKh093BlF61GRF9F6bIBdjEX2amxNpO4FtfEg0XQq9lRBcXWbwzajzVXA23Ps0V4gg/AzoarU6O+n21lXei7TveoewHeRWEtHOS5SVCrDATcjv+49BPhDKy0O7vuHdSEG0J/tWSBbkCUM9bpOgflKHzLXWheCD/XhFkfCbKKAA5QtunNKSomdlFdURTNDoI1AcpPbd9V7HA6k1ll2j/ZhlCXVM/denhM0EoToo54wn8CfPKA6E+ts849RjGJD1s/LFyqPb6Zl97ahocE7IGHXkbzHuvY/MoFm+ab5GIbhIuIN6Bvp4dVE/8OsDxBWFvDTi9hUuIcD8gxS2+mLyA9uEc6haHeUgkjEmp3NfyaPAb3eZISbqW2LUdXLnnVynY4JBuO0bOtpQVJzv0w/RDrTv7VX07mnmTXEPBMZWTUwXnDlQLlyiUBnPS9OqhhdU4QKvtPtBy8YK1LB5Nh9a6ErtRuNny+dv2GqAkCmrAWH1TJCrQjSY2cBT9tYuRdRhSXJUlUJa3YhEQI1XX9pTHASzX2n+L/zydTxuxssuKWP3We+OmuuldHPXe4fb4LXk93cQ9KGQ858IVL8ij/NR/gFj/93p2sXwjEFQd5bUZafSOadz7KwR9zqtMw8QE3zTG05NaPK4DHxVXsTPoncEIpPCOT8tMPDmIGq7DTn0wQTKVfrCibIjgkyEGyqm1mscCDr8T648aCzdUMTzNX6Dtvmhc63aAoImmct2gJ3Umgut4LDf9OetcB0JjsWxfU92yw4+HWUAoIn182VpaWlpAAAA9rWdB9XdponSGV4K7SBvBoEFyFdBGm0Rr60bECpHkLrJFUW2c+etwIQCJL58vqPn51e/Za/dnwji8kvWFCurMWPHS6mg57rN+3boooWXiP40SYydKoThDjpj0vU21PiCsPlIBtvdqvlx1g2IFvQpaspfmktL0kopKPATM9PtPZ2iT8emCD8N8VqiJiL9lUTY6moIbojBGMg3wQVjsY2MqjTuonzgvTjFJj1thhlhNFQCSZ1H82l7Tn52cikpCHEADtygloF2yDepaQ0qcpByS7goiv/sDWsH0OABuYYEqQnW0PSjIzG+76X7zkHlH7B1Wz81UbZsNu7/awPNE3IBlWDDFH/erE81cV3Rjzmodh+Ph2fUcuUS5zw4jpDEWHR9cJ64PNDSzo7MCyd8dDfVpdZY0irCdhltaXaziZc6X391vnqTm0EJ63+eibDDWveQzlAUxFmG87lIoZ1sgvwSR4MgpKBHcI3ZSWLJ86lhjumoXS6R84acbaB63++wiDD24O/UG5Ly75MoHMvh8vT8nF8hhWZWoOCj2SvBJSAAyfw/uebU4NGu32kJUT3Bxvc5HcQANsj5b+OCK0EQAlK/u18ILYv0PcPMzv5kCfDxrGHTM6CkLyHo+3XPpgAkAPI4TB4d71brFh/Btbzxe5DaOjCb3YhOp+J/jvK6/K9OCz3VBQuQSVULUwX0UBz0Dnhuj2xXWTYJockTM2ubCXboNdNjLt9mMGvQkLrs7p6yHFs1YdjGlqxs7LIpm4+12+IcmVuxxWy/SeSZ0GCFn0ShXMTXGeoTTeQXnSQv+YmQh5k9uSQQU9SjyVDOdjPdOHubvcfbgkb2xzTg9lq3gE3+pTaiAQa/ui8TlC6yjCAfzOSqP1HFmY6+ZcuPBYxo5/F2ZOeQcb/V1bNMAHIYwtlabHP0WMpcO97l260XaryvDzukS0qrGIYYqt9lh+NqYq2CORJEplVWdgAWd2Hx0xvkBDDPwFMJ8HePLSMvtrXBoE3v0UN5vZiw7dC4FvyRD6tVrMIBIPaABN6R1DvWy44vFSh8o77BgpiC5DwOMbQP3LDSve2nWSDW7f15PtJJYOadCEJHaJWO7oBWCuxuI3vxrvJ9YIx7a8eUeUASCS2yUDj4HyZbmbM6OgV+oGZoaaW8vmxXWTk+cTZKrcowC71ijVFmPuMsI6uyAuo9eEdrVEw07crmay1YCckhsbYmnHc8B7t6rhIlykwUqYyq1c4nzCfCQtzDVQudvfqKhIlPoAhkVw1A03Y4qZjZ+3+nTaTzRGChEtTTPeqq92fi26YhnkFeP8q00S7q3KzDwlDV+baYr/XJ/P5Gahj+F52wqH5mNYe1upvl0DS5f+aQjxSKjib9uCH5Vy9ja+VHjfHFW/L0cbhF1MSmQ9XR6wDolW3jfKIpvXUjGMIENL3a1KSr8Ryy9BW1YuZ5YPf1pNdN+hyUlGOCnl3kbdXsACk0CZYF940gtoHLdNjliysKmcHqQAed/IF0eqiAfu+9bRMuomEpV4AWOLGXjTtvnUWXbtgIxT5UEqsrVYhJfWX0lBqiYFdrLPh5/CkTz7uqObFxBSH2MSUoEep7OrQOe3a7C1skNprxk/2ciNuIQHZUBzKYAiar/cUbupcZg3L8J67E4dqM/+k+UWmetia8SNzSvV52/hLGfnwHCa/O6EnLIeOTfpMxDR+9kTdym1SEQVyPbNEXS+nBSk4HPnKXHRPxu6eAlnBBJhOZsxanwg6uJQVbAV0YAaMCcnm+YE+imGc8Q3MjEniJtZzN/npkWG9GKVsOgJus3TB2gyDKlEoAsvgNsSna0zegITpB97UOjT/K0qqHdTKY/IkglPVDYSx+v514m9Vf20O3f8Ln1u7A7V2c9DElXWanM0dYB3lRstx74biq+Qfy3xbU5CZClVTr97ukTCu5hTUcRXbKcW5KYQdQ0Zwkkm2KUmE9kkJw/1QFm0NHAuYTIPIVHS4hSVdrDMpXqrgA5Sp3pBiuZC3phwytkrNkAJM+XSSPVxSoSskZkrmI07WzhsfTqf8yeB4dKx+nzJq/mFb0Be8mEQIEBh272Bc7NUJ8T4Vu4X59U3d+cExv2TqNHh+vNbmeifZzEOTMUeOmq5XjoRol7BQr4we/CM7+13gz7kRmbu61o/sZOqyUygTJHLhrU9hdJUzNEBC+daL0o3hFlHf1IWa+O0tbOV6MjN9HACkO5vp7Xm6XvcWh4EwsllJmz/X1AJK1fkbX3ZHBj3D6v+Yelk+2BZmWhV8PbzYfiyLI/yNVsbBDwB+nFqdHEVQZfJqtVZXUXB1vF/jDUQoGnLFJ2iJ1jP4MJh2dQzhqmSwntMp43g93vlZ3EarwNFrljI3dgvfW2RdqGh9AtAL+HzFaY6bgBPI8mLuFslnDr1njJWCwENGyC/bnHcvfdAiAxza1eB6pGCIN7kkAe6i8C48B/5zHXhevC0os+zlP2xCpkQqFJv6j6gVqsr0EbFG1xvjAz25+rSN21H53wzv3lhZXs8tlv/ahTk2ssUSsBKp+woSg5qKyGFwSPc3Z7S39X9cWm2W69NbNpTNTzYwjScOn/qVJs3bXexdQVNWR+XciH7SJfQjjh0hnPy2FY3r338hJmt0KVZYWEh69X9tkIOqru+4lCIWE5sHGuUe7HGZ3nCqExXqZ+rnCqoYH+RiCC5s5I5Lh1N///GC/zbr+SgQ18b3LQbg32z9+q/LAcLMwRvLjmaPEjxSVyU7ynItQHK+uIErXDDRY/AMaP+tZOmCMrtk4+D0+y9jynVB7ds2L/7fUZrsQ9LnS4V6jcpX6XWlCKFv9KTf+k/54WRfN4x2bTistmv+Xa17uEiBlMOQIRJHRfQzOt+7oq4dh09pE+kVQY5RRHIg8FxUBGnyRn2/c7xCJzQnAA6DK6fwqmsSOV77OqL2+a+vttHNVk7IAPC23TGukUkpXJ6gAkcCK34fr5fH4Qsu6IEAeMqMGsCWuLjy7RVOvjgMZTy6ykoH5IeWEx94pTD6UdqAeJLR0P7jl6h8P+A9548dVUx0zJ1AIJU7oHpW7gse6g0Nzs07ur7y950W8eLjl7L2dpfnoI07f4Qu991yd7hQ3EXVGMBzUCe2nGfsb5YDVDERHTvnfgF1Hd4+GavA+o884TXyH9sAV7isHzzeXtLBGncLdUaOEF/qEjDJ7sVO06bEtqShJdQRjErOCTqTS72c43sGPBRLGMH4Ah81iLX6+JvLClnfA/4nEi7m+PjMYL8H8e2G0XdBoxJHAtyaeLNbV6IkP0fMbsAtqUDAyOHEj4XqFhrr7+uZbynrkBB1ivRi9dI9s6vsPPdFgZ1SCfeHUpYwMlX3FpfQAN76zHsZGrjavS5VI6v5Pnlbz9OSMjmAmcUtb7WOAqWiiCmnWC2jT9SLWOd0+7ffgfhgwYd5fB/zdGxKPxOnkSXWV8f+4Baf/+HYAfOoIuG5v9Ud29qTNdwOA/JYGE879SIOklE7eC31NrVt6Vex5XAjkGLs+pA3W2ndg+EBkIlZNUeB9tSfL37Bur0y31gGmd0YbK9YpkB4i6NVTGLax6yTw09gm3pH6nLJiDyy+7YoXIvFqPuBmgLNJc2P8n5rjo5Lf4WgfNdyL1yVP9C/Z8oVB+T3QRueO1Ou6M1Ute4/eLmTC/mpz/jOV2cLJFaH1I3Kp/pI9WBrnAaMER56XvtpeJHcRr7QDI/+MACKHDozhZulqf4lRFoB/sjU2piX598kR8URbTOhhlCm0eiL9zz4A5zTJfaDd/g1250J0SeH4PlfYW/aaUX4T9ovpjQGe9xJVmWZxZHSxv7uP1mwGX7+il0nC+taV4Pze7tFXUywF7axmU+HJkd4E0D4y7dzaf3RbVob50vaDPZVWA6bIkJXwePPCy875QRNHEOUZGYPd7GpwIjEh/aOEg58iXxEZgQRGNFbai2ohuUzbzSJs+t1cxxjOOylZ0krT2GherVFsz0E21xBHixQqBcbsx/graBnLcRsaHznBQGr3hjItlkLeepFwp1L/A71AERaA0ekMMwt2CrBx/5Fesp3VKSIglQ3aPmQiw0iCemTQ4y309L2Ew32oR/JOGLOl5b240x9NuU8mrrMU8ItLjImXbaZjC38+We8vh/pBDTtVt1ibph4G/yj2Nghj2SclQJzRFsQdcQ5dV2E0MmmKxt1lSSm1xxfvbPl/jQttTVdXOQXVnXWtrXW+itylJVw7ZX0D4+qP2DWwBWd5BIpYUkNjaIthfNk07ZjpVTgwQIiIeP4ZQ6NUpzsRVFyKYe4i3X7GvajFzfK0G8eyh2aiySyOvMvTTkoOCCJJRUKowMAvad9otuhHYxKtrsVJ6P6MrAdRRG+b3RommFnfjA2Azj0msaAZLK21JjT+yJ6ZVMsr8DAmOW2zVx+o/NvmVMa17bN4GWQ0qBFeMXWbjvin0CtLPA/EKt3nSqGhb+E4tuzP90VEjDBc8A2wJlfHlWmAEXKok3yrxoFhp5lnVwxf8kVNbvq8u9qPdzCctvxL8G3fRnWP1KHAvQyhysFyFbTOQ3Tpm1AsTIrEeAl+eQyAXwJCiugas51jNjaLwetZHK9UIIcvTGo+oCsenjqM9hOJCcGgCAQv9UZhGxN+JZMnGwYRLggAku5N/cFCRz53yO4gjdErUuE183w3Myc6n4W6aCt5FPZXvsfCrH/jVBwbzMJo7iQULpLbIX7zz0xWxCUYrY42u16AhSfNyenHrgvMQAf8I+pEW7xM6Lg8S9AuLFTZchyH+Yyi8hCtgXQLGCZY+Kxn/TWuNQ6/ULAMDkfZrZeI30oT6mZQ5R2YaAkrYORtVBt58U3F71q9yE8B5X1y/DBAKDfrOtGMkJPJveK9/O0cx34lvhl9vDvpTBW+iZvR4movz16mcswSGJ8ZVCO+JIf8E5PYfzufeXY6VtT8IUqgS3k/P9rTH9/kEfFDtVML2m61IeipSZ5TSU1cq3EtDi32Xqfq7AwsuaSQaPTJuXErZ3O+PswO0UxPSj/E7FOOG0g41XspXVGiXCWNem6hWu8jK/O+TNnMZ9jF3n688somCNylzb77as6Et4cmvxyHpvhmAcohH15NQdI02ogmwM9rSZsqzMCjUV5idbqb6VekyqtAXjPFh+UCz3mmoZXohpLUHO1i24H/qIdlGf7N8eGGW04SkYwSkgHzBDLPjRI1bNLIfTiy9OhmCX2RKL5ht/VnmwHUmsvEPqt0RQ0sN2YN0S14eMynLHF19jbq3F2gx/aGSFKHj7BOAtUMV5Fxpntj/h2F5+GNFuvstF1jSY7z1ABHoHTTa0fYwa7hFQF+PP/CYgapsQWujZSO9qLA0AQClDq1I1Y8XNxEfGMzw1LLCbMCJ8YUnT2pU+c4FWlTHw/Sy8cAKqvDi4E72sLgoo9dvVyI2UE/Z5ICpMqkg7LocJkPXJk8MgbK7AOsapWCSSjnK/i+MpLlWDEZbofkAD7bisvFQpOAUVsLwYUcJsd90sr+LgUNi2r02SLqkz/M7D7SG9ED46W8gXOhQWuMceOSSeWqwOGyiHLX3rz22HpP63rkqqX8gV9f2iQLMqdmGtsvUV4fbQ+qiJ7fTn6tOOCvwwoBI41X3YvYO3yp9du7eqN2jL0CwJthNWDT2XbXXRdao88Cg57PKzFwd2GWTx+Vcp4XPXqFm+QCbDA54bg34FrC8naFN9HkIjJ9Fiy0nzI1zNAtCvEy9oAfCRUPiI/TebukgOyGWMSeMlqMQ0cMMO6m0xddRCcBcTKC8nLtn+T0pujZqtGCctWDbBuegTvIA6D8OrsCkFmwXqgVJ0EhGRlgK0FkLadOCNQkSUci7sgoL1dYHICT1GdBGMPCp0aYZ1g1c1w5ZDWlaHu8XmYLrVHkCRSfmomE2vIt9JohHmE9g0MX92COSnycbqbm5yQdurTZ8+hFQoI9YZHPc+W9gAnERyuWiX5hFgETQ+X532VJiV2hi/0UrF1E2kNDECK1T85hMuelyhfENPnxED/meP//NG3//8zzo4f+xAf6E94fnJt/CMcQxyntb3j7W467QSuPJvPbYEnKBYb3eV6qi7sP6wY9m9up6q8CWJkvBh/XtLJ42RGaGzznOTiP8VH51tWwbXb0LW0qgnDe1Zj5rEVDAv1a11s2UlgGBiZAwIWiWh0Q9OMUVnDEKhafmN1yZorrKnSIPPLMVzDpGBRNxYwBlfyXlJftdy6DtTNp2192Rjchb+Vh7lwUwuYkYUaXJxboK9PEOoTEsa7jtX8hsv0QrvhGe18jysNMh4MhRxFxMEn6nx1VcJqJAN0Yx0NoRgi4L+N7ONBn+yE+5/ozgRAUDXs2YOQ1Q+H4JUwMD+8F1d60yEjwV9UPapZeuvOLv7fMgAh8ycnV+betJvrIKPazzrX4ZVfwJuxfYXrNCMUFlVgbG8WufBXCBBaJa2AIJTcYTGqGZv2VsJF4iw0fOMPCSLit9jpARL8JHfae7u7/GdIqK3B30syh2Ch5LPBm8eeSEUDhc43vJBaopuuHmuE77QXG+UhnJjMInks5YFGBcpJ3PBOj9dQtCGkvHqx2Mt619LMpISdKWFd7kG38NQsdVwUQgImOZls66rDTMa96H7O7wOrTN7p2TZvi08x25p4UKY6PoCMO0Jv2yRsEOEKpGXwXdVDW4thNwaZ/0aUuIEA2L6wZ2iLinVtwuDF4nJf8anFMt4WJ5SzUIAhx5XDtGky3mwSmaaD0a2Whv6T+39TfTLksT9LYxFwDu96Wcc23wPnjjXvw/P2q+aZM8Ed1Yx93yShnmOnkQvTpqwanJYEVRpItCA09k3j18p+vrXC+JwfDO8A48VkL9VS3P4XjrBItQhCNQ4KEtrBF1LoiE4F+vbuwUZAx5ofY4Yk+UqE8Feg8DeB/OgavwuvUnxn4iQrneBzYyiq1j6bKmXacTZfT1/ju8Qdmphcv0KziDF8Xt6VAp+010Fd68wB/pYCYOghrdREg0GzNgZgOM6DW+D9Sv3JehKaKrCPatl1RMruyd+0pDmZ2E3rc3/9KX/9xVGfRrxaVfm1S1cqcP2PUQXsiCi3YAAyP+lFhhEfTXCNoHrrUNdB+yiRnB5bUMm1fSAFfNJjWcUbboNJwDRJWZWbdlFhvTkSDyANawRi76FiAUt6VdJAZPA++CS6Qp1oqXUUv5M3Ihsgx7hdNTOZ3Znl0MQ6atx6PDMoVFJCxQFiegaDWyyzqe0983VT1k0zL3PbeWoIaS46FF/c6lkb7UGDEkDyn1qKXCoKTcDT15ZXRw1aa3vG6KbdjPauQ1PStP2Ot5XJGVOTueHeQZqc6pQjqVMBEkdAdcuOUxM3ndUNGQNLe4+czvytNQBeAc80NTKEuemFjnfrJlBB7ftHPNlzmeUOLndyH+VbfgIq7971f+ycx84wNhwLRqzyJkvO/unec/q/2HQBNcMwgHOyiGWXLpjhuVqJqnQIOyXx84TfC5BCgo2PQ9av3zX9rLMPEl4kZYGL7z8jfUdP3Oz8R4npFgYUZUfwZwHXCGgexrn+VWNZelCQ6Z+K7ayuRqO/4oMrr8sL3CQ2qofRlr8cf8EB/+fdPdHa/aFYm0Whp3pDGs/fkibLiTsENUKuK3Wi0tv59VBlfCLqdipjs2SuXzsFNJ7oSphsGKefto6I9hD07yrcPSh+2b32Dc4yCQgSHgY0z/fKmOwgP+7Lb4qLignN8+wqCKb3/dFycIZaG4YvGyYK5Y8h4vCPcIQ9QZa2Jsjq0QB57jvL4xZOqDphkDC0yoyUkpHCtfIL8UnPLcLds5ELbTBR22bivXhmmTd0vYmrGmJcIX4+nVWI8eX/3TA+2gWA9iUSuP9Qoe1/TS8oOzdj5/W29PTnHX6ytBlzPwO+KTXlXJ2hE8MlQjRAiXu6jlGD/rAnUKtU1Zlh/tAkjLFcXTVYXJhG74lOPMTuk+vGGHbcUs7YV9owkH3k2cYT5KK159dBuw9aH1UN1Wi9erv3dtEtCXUfM9CzMrVhUDonXhu0Kd2SXai21AnQA8ep1y8DKxqEqGw8ZwCh8Z3fvhA4xyp9YMcAn25vVszp4NO05wWnKix3IirhoDztv+AJ6bHd/HGOP4zeN1iNVd3QsR2bnTUf6cDQTqVJrz6qgPf16QpwX/9DHaSvBAFSxoUi47f9P5s/CiwGumRfiVYwCIzLdFSYXmz9lCYA4D1UdyVmItwAR7KS33VPXOu4diIhjQLx50E0Zrt8d9KFQbj0/FKP+oVcEosI928Ju2/4JY7Isj7JhC+s0yJJF1z+Ejtn6buYLM9wN8ZCKqyB+9DuMu4/hPxdEfdSo6+CfW07e++e4Zi7zfzcOHm8Z7eJAwlmfBhHOC2n8CW5wO2+ax0Uz1Q7/OjGTxl9srLv9NwAgK9EEAPFpSTMupT4JqQZViUsG3AAC1vcve2rJFyn3Emr8iQ0qbPYDrz00lBLf4dq+6fu69KJiE6fJwm0k0TylzBEFMpGwIVqHoC17LZfEvgo1eptnt3c+hsdKrmnFEKlhv7Q1pW0Jyc6jCt/UckDRtcx0RnKVRlNfVzWRSWtgjn6d6I03zfSpKNmt7rSFvWnuKiRljLfPo5IbtEwEUHUlsFKv4zmSnHvIfDPiiaeHgfK8/Y9niGuBgq/NPXDPrlWna3MvJ/I2OzHd9UI0p5Mzmqvl0IMMzs23Cvu9oFFHQbsrFVvJ8/bO/59ari2pCFd59MAph3kduU8RIvdtuNSLEpK0H//oQYqU/H2q+0AnWjkiGMhqy2oOXA3HI/3R/jBuLC9rr5kAOt0EtGCpydfCNb7/Y/dNEg5MA7+ctYfWofRj7axltxyDTSqlfWHyDsJnsgA2qubBbZ54+74vquuyoSGK3aurhxSL8LkCEYDxso0wtmTMTL1pT8QuQ0/rqpWUj794JgB5ZlZSPu0fDxgz7Hv4BEPSrcahNVSM+7IGz8xv9uXsizOnX7RB8/CTlm/kb8QuH71YReBMwWmSnYUdL4lKVMNZCKD4hb9uZRzoWMxDInoigUMNaNNSKKHAzvVkqfofaiIqWV3a8/jP3mxdUz8vBk+dy4fr7M4JUWujywhTSH8qYfE09x7cCiOoYAujOVg8mePlKLoNE76fIElKcDvHMVF4+w/BjBh0MsWk0CHPTsPKOb9AqTLf2K6274ifgUuAMdftV4rzb828Lt4c+tt5brbgzgT0AvEveOVsLzecItuFK0lqp0Jq4qf74lBWN+Q/DxdFu3qmVNXpy4HvTKA+YR3NkfWIYfHkaZUSRuJMwUgegNDVGhIrqDiYywnBoKYVgs3be83x3jL63LIhx+WlHyb0yLSt9z/0Zp6ELjZg8oQa40HSKURcGI8dIv/O9XsORYcxNn86WOd3I0aWBVOTkN2lU+5+Z7pRhkWeJ+l82xaaSEOCeZTJRx89s5K1pswDnJun+aejx9mF6eGmUpiNyy6q0T0hBtg0wOUVHRMNKj4sknPow1/PoLTxfYeByg4d/AYQbxhC5y3po3pyGcecDDM+eo/78stnCTYNU2yfs71zDybKPmYH59lFq+O0Z78DYUZ+LkcWNIybvOrDgC/WLHte1uaZCkuNTT7IZryIirzx9SoY0sezpVbuWi9OyZDbHfYIkcagNoR7CpYvYyBNm5OsqVf1OfMCv5g5/R9E0XzqCRjdBCF/ycD7cJWJRepnzlCb6KEZBQwUnFiOW4ynr6yzwK4cKvVytylfFTir2Rdjwcw3j7+hmOELIbUTWkSE10BlpNj0ZCXSoQI/bU6Q/m7eeSt47PuaAF3/FWyTfs3RKP2O7DAbRVlqCeMwydSfm9gUltNOdFC4+u+xP5vJt1ciM8/YkAge2KisV7SKeUM5WZondzpS/zNuDU9Fg9YWAGMz0x/hEb3kfHAiKA91E0sh76keaQkjifVEv2SmuEK11RebVLQKhtVHl32fgtpMW6ZGwY1IVwlIh6355kXVXtzBU7xneXNOcvZ31MwGDPiX6d0Y8P+aC2jdvqtGi12OgPIec/iiqtOoiifG1TrKrbpw/DKfYYx/04KvTG6V7p5dKPEWb3H4IFaT/dDp4/JqI2YIqkrVflGdPQTsWF8P/g0v2FO0va5vvB4K2otT6dQx4loFyXWYGEcKoHkTp0ziE1wiJMODcgqat1jv+7DEj/DUytBWCzp8Ct1TpvqY35C6BbEOBh0m8J9hePFyCacfr6Q4rFBfZFrwSeLqLgyEbWzZovwaaB4mP9ysz7sbzrNDsShWREr1fdHwUBkoTyM/6igQTTl/dyi6NTA9fx4e9MWX97eNHFLwZLmstUxFxgqSW9jXTWAPRcEr6m1i1rUiK4tfa7wFER06xb3tsECb2dK56W4MMdKZ+AWcDyOHbKKNWsXCOMgAlp9pcyF1wAl+2gz4uXe6RxM5JUuN+woZtfp3badijvmrIdoDTlYKORpJhL38veWWmZ7mxITuwScgrBfCG0/KizuLjjsJZx3A4a6FhdK3C6skFxIrblTj48BxYJ/654NRUI2RATXWzAQVbx/+WUHgv3nYmUBmh9mvzUESzoG9QoWaqbtLd6Hq+p98sIEzFm9D/09vjUAVz38ecs6rd7nndkMYNx/3OJyGeDOqQGctm56BkEqPpSV1iNEMANsnTILLmIsTUueN8+ykU5zmm0wmHbQnRk9i+WhfHrCJa1MQFtGXWoSeM9e3B2wU+N8/r+3N2pcn4REAt2tHZxCF18+1AbNy9313HLOuwoxSo9YUmVhkI+Lr0OWieZajLPJOkNmKeqaZFsP9+rT6VNby5Wh4jxFH1CLttl1PLU0Atfk3+9fNn3h61EaZQSvUOHNAFxXwzFJ59g82cOuQjwLwevcXZCTGBKjVpxIUixLpa9oYZ/EpnxkCYysdlH4DxryA6nulBCtm2MulXdZetV3UST4N/IeZiqfA1ebSrFnAPGlT9exZsU/JzsTaTJfXB1RqehzAZkGDXmvJ+zjaBlfI1pk2Da3opwvfDm5Puv1v3uEUTSM+WRhZhmwaYXzwYFpnEWJE4LiLNZ8XyO9bcXjnHIT8PWar1LZEaZGzFuCTMrJOuvJTcVBAmKli5I2dMT3R9g8dYwnEgwR/BGdPM5627QKojbCFVrZpiwKq/W1APiX1MC85iXFGJcHVSRzm+bzAcf4KV14h/CR/26IJSWlXFxEsa1xZeI/hscXzy4ctR+l37VC5XpLz6/tdDqiTUxK9uFqlrNOeRwBK9q4O0/H/Cwf1B+UAX1VSLvqk0TAunUpXiBW7YXxweYcZOTesauRWylft3lkXf+wY51c0CAFE/sF06UpVHvX5T4eQ669VwRRisiBB5ajuD1FEQILPmMBUz89vsD/BxGIrLC+5ZtRPcC1CblHmGaAeq8XF/9XMRFb2MayqqZMm7iymGgW0MaMgLxRNR0dCeAtaOyL79/uSI63ZC39LXvxTAYQohBLI8FPonyI5C5a/354OCayvnKBKm1pZ/WEilrzzcklCDvdg5hhfiCk9KxyrBjLq0GwHw3UfASLZwXRQzPm4gWDi/psbi6PwzWJWfqLVhYEoNHeGSDdnbunVDsg+G6KMi+du0m9RAiIgAEY19Qri6xDVz/HnobBURkJbE0uHKox7qdwm2EApZXWqr6rY8dVCjw/wV7MIt7x35Yq24AwmBWIYAvGxRMzNscD2oNQHTHsnM528D2ewnTSPGfrIWDVK0uXvxqp03R6zR/ONCUem4Xoh/Kq7jTNc9fjpyaaF+huOXhUSSILE1jsGpXxwc9bGG6KOv18bPpoUSjweRpyucSpFwBA9gt54pNUrPYV2/l4gTW8wVU/eLSICExY+D74DFofnnfgmXuF5y5ayTJ4qNiuSIW5Dqxd9baYM30PA2/qOwlfsPLQKabwjXQw/QR31awzlQSY6q52wU+fY64A22c6InIwo2YY3CrRTPRK66iEeMPQch9WKQzdHt0O/MWTBHm5BTCuZyxsexuYEoA66D/W+Cqu7bo8lVOqbDypjNq/ZVazuYNnXnJ/t2m4vQLjgm4Q9b6qWcxxZZXhOGCmGD85a8KLoZiONN1b1PPiwq2aIrJ/TP68lRphAl+BeCtbSrgrq6xcAlfzWPuV0W4kVrVMIwk6QYt/R7utrF/jNguJ5gMb+f3wewaRm7f+hcSBU9x/XN08teD0iXYp17Ic9psLb/ihM0+9RnHPrksud6uXRu5ep+1UdOEf//ZKMTy1eQlXjb9bo6eWIGTSZTn9SGVURA2DlQyoDhog8kR+abJoDZi0D8+5Bb/lOAbmM0EsxDcEmJvJIAcM1GpTzJKkrVvwrQuswz/whmh4TCA4SqB6DyuZI8F4PsVuxuo75PVyoXIXHtXU4razLAWijD118HTHxxMPTrh/JU4XHkvWuxY8nzFKTbD7Idt5UbcQVV2TcOFYFDpUJVDDgtG0rCjryegIRzH+BECbEQ+UL7C7VfFIEtPLPd/gyYdyUwKUt55iU9bd2Rw3nUmhRy0JjzuFLrcesbCrd88yyfL3camucIbBagUX8dCtDgfRJRxGImxV7kVF5iPHvsP4SfJhiaUl0215liIpoca13wgMfAuFxl0sXuamDsPyf5uwdDYOh/eflhHREfoaJNSDLwDlvu4ZRwwnqoyNMoVAnZdOXwTL5rOXKdcolllj/A2f+6tMSHG0v6ZfEbA5BllKyPVdTcEZjrccWV4OMBJTDgJijVJA1tXERJfzYXXIpGneXAFfgiiqtzsRzYMF8GPY8z2St2X0hilHVaM3mRVUtlopnkdrqnl8FSBs/SpNIi9pRmprER9aGl86xijVxYAh16liGv+UZ/lg9YZmjhCHAVrNoAAmgkbCu6JcrQbj8AlbhPUn38KBVsLFCDzN+eaHNFlDF+dmTlVZQEvrBOHEvf81i6RzrFtHW28hCnxlS/ajiHsrk7t6e4u4W+Fbf0d6iLzA833NnOqA7tun8wxnEobFVLDmtb3VAtWahxbzV163aJDuChLtav/vURPfJLbar3GbY22XvKbPfqJe9vpM0jHRitglgrSHAg8gnusKxB0phf5ttqb5FWlEZN0GppvWPiamXAP7d8K2pU6+eRU6qh8H5pUBz/EJYY0S2dDGsu9UCKM9yL+4d6Zr2Tt6/nhAVdrNTjQUNRlK6y1032tiAfQHv7dQFrK4okf6MIrQaYP8KF41KfTnsEAiD1zbnjUbqqir9h0vavct2ucvcMnxIBrvigq2LuRg7hpdL1rNu0zYDrrp+3IkjJTARhQGRbzhHAAXT00enubVO/xMSdIllEKIA0cFTY0xNVEZYbAtAxpuCcjzr04EAuv4GqEp0EODPwgpXoG483T1W64hkTXCb4a5o0Zv3rN9M1sk5uInAapJ5ksJ3gIMT97aaPzcsycYN8POg6qj5rBLqJ/el8KreOIUns2zIonLNAq9jBJMKV3lFKLm96WSqFWZlS2JYUkCSuW1W/3qcEZgtX1Jem/W86O97zmuLDOZou4MImZFscY04Eu+ntRfenFpQDuFSwLmJ6wtZrYYiQ4t97TPgMPLp9Wdn5+D6vV0Hs9djpzqoKnZ6NTjG5wgDQI2cAFPOS4opMqhjWNnLPPt2iAxw6HnAb7UjoFzq1olCkFPoUV6g6v0Qm64syqzqd/Rof4vVJnW9djqv3l1sGmGNNq2lK5lz0ObaFC525+OfT2cKWloYAZEqSQOeyC+eQdRnWqQtu+mCCpGNxr4gNVBsofX0M4pRZBXELjDxCabF2nh62fxSf64Qtsm0xTMolAxRfHmGadWxofPsM/IU0hrWRUozHcdHYX5hnt3UJEfUxvR1jbyhOGTLnaNHqsDTTEZ7I0UtLCNXjw4DEryIALjAFNl+OyFF0BEONAftwG4eqeJ7Afu11xpZsgy7DBIl8Gp3bYDQuj8KXwWaieuOXzIJOswvgn0+hUPv+cnyV19i0vb8vfZn3vPJiN4tyD3dNRw7CQxEygofmk6mdDy3jPFBB+PtBm8phFucaQA2Sb7d5LwiK4lebqFsg6y0CWtjlGHPR3Q33Lzv22hhdXWc+5wgTY1mI1flweDMhJcKzuYwayk5HTtk3mBJ7ux+FRyqPrr49hu52sp/brUUAWLhXUvWefOvCSOnDCpZZGYjn8wEUy0YVQ5JJiuXUKI2VS1Dc3EU+Thim58mR9ChZhfY+b4ecNGkQL+fAfQVGHBNm4fh+UfTq0Uyf2WY6jjhwxbqK3g9HBda425EC1ByzwJDSB9FDkU/9Jp1pH/ta0MKc4FYoyiUEzXNe7cNIRfIxsf5xjfwHYL9UUJHQt9lahXaC0Hi2nyCnAaLRx2EFQoVjEI/e+3oqCz8tA9Yxz7lKYJKRWpb8JtWZUlu+1zM9FrKQJ2RyXSiBrqmmhVDXc0gRxXA9WLx5m45potizsTWEsA1/J5Zb7U7LGQ28AAjTPv2noKAuBB4g0ig5PheOmLypa5G+l2Mbl1ya5Lhwf2mWClqQzOK3IZlhXFN7UtWb9JiIiipFfrtYApew4PgjCbky/7NPXW8jtDBuOOSoG4AxWyGpfetDVxCNz8aMJpaTiWpSA53lj5z+BHcNQ4INAaThu35R9IIL2F5LemWbNNeZZG/GduhpnMeoHPWkJF0HPPd5gWtukXOL5K9w39IQKQeM7tlmB2M1DE2163uP3VQKpbaOoomZHIEN5MyP9IOGrnKeNM0vnqSbS9p8cP+9YlcaJhBG602D/5nyX8wpUXr635JCY5uukDRDzXKek10rEFEX9Pw4OSeucFKJBuwCjPalF3m8Ee2UHLHcKQ4xk3Ld5E8fy0loLvypDEoZ2GPzCfKhLAUa7Hcz9YCMujj5KeEIIuKFSgRGx2VS6hu3Hd7oE3FPTRQbsjdS1JS1B5AtrJP2Dn5ZsYr/HHIK2V9RJeelmXlpWGRmaKPDQpa/uDZAucQi0t69TjCpvwlEaErNjAATrbu9DWvfTpItrJ02405BRAGQAtIpCk+2SVzysqAcZs4qDEF31kPLMkMzN27oyOq3239EgfOtpRfVzgYGqfEV/Ydt6kuaLqLOUH9N+5T9Yvu4IeEIMBqdT51GVDW04hW9DRVaFEie0DtaczDu31DnaxqOz/SS5rEnNPsHxRVwuBlGLM+Ei9WSGLskwQHVH5PpWl1nru28EoKvexlmD50oaNLOvK6FF2xaj7ZXhNrVnwGfcQcgOJrrC5dMPWPz2ELMf4tBA2GI2SVwWNWjZLqey92q2oHZM0iXZbD22a3JQyfwVPTSxHZQ2E6w7QfknC2jRiiX3xaNy6zg0OydQrySsYKrtsSPCmt167kHiLbPyaGI+tj9V8Q9XG2rwkd6J2EoNXCuGzqIHEQFvIEk1+yCgEuq767MXfey1NkYfviZM39XhQdHbi9tIuvD8bkEeWP6SA1hBEfOiasufldMb+iZ8Ntc8s77C1vT2qS9JVavLTOsPS6VlPKTJJqMr+bsFnUj4j8kb1qumFDT8iOkGuU1sQRP2wZfjNKOlHU0snaE6JtN32yMG5bwh22hmhFte3khaTUr6AS/iDRDXB5+wiQcHQCxPIPpEyS6mnbtB4tG4NgR12exGUd0ZcAzF48HUXi8hFTcjbmTBNebc28KMCUgEiP7EHSZiafwq+QZMGq1Jak1T1w26BNEjiaMbS+IEdaxhXlOv2VnD9aTH1vwRiKeMk1xCweXmrAeFcOG1m5aqyRLURcxsbh9011jS0NhPGF4s1cx52vic2sPYv+uXy0RSt7jngLd/2eJpgfWwyKMAx9DK8O47KJ9HUaU+JTGKzJLK0hi/KslUn1aMiHa6oeWSeqo10878/jiXkcrJ2eSQ/Y5Muu5hn87ZnCRjNYhhgNLcKKy470zGUCy2UolNBvaJQ7IfaUEwwwn3h7WaU1boRq9135gt63HRQQGMjjvDVckTlKuJGfVhPMe0Ev6HcUx1PNNuKhLHamNodHU/ehPGGQcZK7xuAfA6EGYWWapgYQ3mPQVi32Te2Cymi9DpXfKULurVKXuxJdTYwA2uiHeT/vjBqI3ACsofCKmUmtr05K0P5yQtlr6Ns4JQm21Y4hQy/xa0lkxwswyKeJ1BXcepTRpCE+pJ98z50GKMtMqhnsNAoZZUqTk1+8gczH+Y/f47KG6gXRmBCxObQYiGw+7LAn/ENJrGHO880VbWvthvV0yYw+PxqgZiBj97rXz6HRwJeUSfnaBTTGPWXIFJ1Bjdgl+PSK+OdWcoPyxUPOdRGRI3Xj4hYAJZmodxO1/E+yoF4cDx/M6fNqeTQsz5lJA2+Daw5Z+hH27mOhEUG9ROj75V31WhH0nyfzZnUunroeq8LD9t+enq52XhmMcKeVF/MY/zV+9dU7V2oPPt3bZsyJOV1j7oaD3Wu5lDgo5U6AJEA1oFGooUrq687gxGwDITgcDIVYkCZbDVsEbE1rnLS/TEKF4Lobud4rr1VsgPk7kZ0qY2i8ClsgcRFpcq08DkxpgCaHn8KsN5I2Qj3ZrWCOCiYmozENfG5jlAcj3pKgTCPL2RGXU7jFgNJQjAp9tXqQBnX2cMhxP0W3rxfrYu+z//JYwoAzoZkB1KrO8+0xeh8of80Nc1ee1IzFQUfmoWDILvvy2DD4VfrOQUgB3575uK3DHR3nuAX4N4SWUpZckDJfPIzIlxvkFPQXg79JZYX8WaD7kciAZcmPDztjJjaFTPit5GP2sC3vlFHnZEq5sh71dN4ftVXVz7GeRuMbIBznD9EsA4wulmniGcYaoJsAsyDG4iumXP8dJ6WyA6tLuGYSYEwkbYod6W0lntJLHie/rfyqEO5kcjbA7cw5NWdgNUkCkOtFL6PUBh8rHDVU/wtNZFWvqft1btuQZMPcKcEYyqX2GKpbbNkkqRKuqEu96YIuTFrC7FpXLTnQ6KwEY38znDwB2BX9xh3l2IEwoS5AHLT7pWbxevGELOOOYnCY0unEKxel/rdm1vjHT87WV8U2tIB+2nr9vVCplS5ka+9IiBeCtK0KHOOOjHqeUk9bNKSmuk/opBqkrk5pQLw19JG+/LRuQ1UCS8SryktjwEGv3PB6AaOitL6v++dA/UmcqeQ7g+gUh/D7df3ueRx8fgel1LguyaxP4JbELhwtgVfkBAr8lHbyA7N1dp/32f7UKP1ASX9N6cFuVvf7bFxnmwfEKBqmI9TiwDa9I6SHRkyGL9s3qnzveBw6WG8KU+jBDADmvbLoaOWdApbw29MBpxis9XrJPD5BtyfhHDl4fuUtrJc5zIsEU63f21gYan8KAZvm9noE89QPRG0hKY1wOV92xLcVsdRPF57e9ZhfsAPmZIslq/LXIaxggQ2VmW6xbULgM6DFPicrj5P9O7nv0+dJHaTvv8jaCq0FZVxu1pdaGIt8cWGsTuFMtx8cDc+TQkYlRomE8FeQwzPELAf9ZpVcMzPRmSWMUDtVR8sTBMdXk34eXN4x9tiuCrQq7FMpMM9jlw5sVin0C0o8i1C9SRwwO3mlrZlvOh/SQChWZIiH/A7k7sAcP4dsMzyyVSxVAzAtX2tAXJyG7x/DUg4Cr7iXmskfzM1O5joteXWsJ1g4O9rcfHpWpLDCyLhK/7qOJ1WOR1vdcCSsQEC1wZ8rR8dQCq0ZMso1soXnxwsVXD9X+vXx42R6uEmxzAFSN8pP5PdjaH/vkXHc6jRQ+w976PjL5Rzi2n8svuAgozQzb1b3boIOCU/1xliX59HRMCHLt+rioVg9YHdbHoH9CGXGEiVqk0j51FT5Ah8viDdc2ERHcCXIA1cqR7dPmkQJck/Us0c4CvQ0mXwPKjLDoJbs7YSA7PyWDMOpB8pXgSj7FXVZCEMRNuGlBhRMbFNYeulqk3pdZFF2C+82hIvucoPbRc6kiPzjb+Adtpxn599j+uYDJji4rYJ59yurAwH65RSwjivWFKFL9vGjx91cvf/qnyndnqdUY7hlIdXi/7mqyN6Iz9zSNpyNTsmLVtzoAmRvZrvKCHFz+zIsQUShBQ7GRsdMRfV+PsvARdYqhqdDdtLDW3WLA+xDcWhK9YCuMfxvidulEUedj4R6r2Oa28SnpIs/lqUx/5bk8wm0LwI/y0ijXLjmhXlGTI8l5fBdUIt5TgLYueaG0lqZg57W++Aj2u5HAA5yZfwGV3sTCd5FcT2sSACFS9kVxEqkxBt+MH9x9H57VyuYOk3T+cUYgRQcZF8cI2Wmn9OpIfKfl/rvyHFBkxyA7IPVejJwse0po+Y4tyCxDeEKtt3Z5XI/i5HxEzxEvSE9l9F4f6BATcfk69MumiL50LCa1vn86y3WGiQ1JijRA5oP0fEOKx4XO+PT/09/rNz5JMr9Ceb2+0Kp+Ubn0o0Etp/gjerZMNn70/AzBnBiS4mCg2wjCmpmzaEMD6PNCYx38uriBwID1gzYWBxNqGWqT6naNjP6Lzs0HScG/wb9nY/+J0n0wxo+3W5WScZ3+eT3OF/7l4/w7tDWOe8jTJ/Wwm3R2pPv0002UHPMvP3Q26OWyvi2/IraSoV7roEB/Twtaxd/Cf49m/3EONSfKaNJi4nGY+wu6Mlh++a7D+CemfQTc7Zxf5s7oAfqL9GRQATNwcK5oHnB5eHZefuht5wlDTpjTx8al//mI19v7BRRb4ABMcANAAAAAAAAAAV4elA2rJEdkVktf8Tn28Mdsy60+A1XVCEOa8vC7LrWN1buSamWlCnVGtM9oxQCjOG67+I1yVYHKprHAm9C156KNv46Cg8neXShnukDIky6Ui9l4CBM4FjxLfyQb4DSTHLHCoP0CVTlVH8b1nIJEpUlggqSM2i0v1jdGTm62evgq5XixKjweKDNMp72nkO+HWSAVe4OBKBKo0+ReP3jN4WvtGTdF1OnyrK2hnqHLWvh8oUrsIa1u34pEGONUQkpv8k8terUi9JpEQbr530OFJrbHCrKURYUwxkLFOPKq1GqcOqp4pMvY8kstrdviDc2D4SpX3/cTmyD0cfcoUVN6pi2KeRYkjFnNXJrMBAvLLYszLdntAN+r5TLbU817CgW2WzYbCgAAAABhQAAAAAAAAAAAA==",
  "tc90-zijaanzicht": "data:image/webp;base64,UklGRtxiAABXRUJQVlA4INBiAADwfgOdASrsBMoFPm02l0mkIyKkILGooIANiWlu9pRqxdXD4XmL//O2B6t/XT/M7Uz07fDf9n6kP4z/mfWFZnL16pm3naW14jvYl6W1swdHEQ70PdetFmuetZN/v38x5uP+v6uvMP8sP/k9i39h/5HrC/bv1zN3+9bT0bvLZ/cH4qf8H6vv/B1GWdZ5z2U9iTamwr0FU9X+V4n/xf9L6COSfaCcB5iPuR+M8zn9Xzx+1GwUfcf/R7A38p/x/rIf8HnlE905bdXs3UhSSl/W3V7N1IUkpf1t1ezdSFJKX9bdXs3UhSSmd5MbdSFJKX9bdXs3UhSSl/W3V7N1IUkpf1t1ezdSFJKX9bdibUe7q9m6kKSUv626vZupCklL+tur2bqQpJS/rbq9m6kKSUzvJjbqQpJS/rbq9m6kKSUv626uqbWu8t9vK61sCiFuxSGctur2bqQpJS/rbq9nL1VXs3UhSSl/W3V7N1IUkpf1tSQEeryvpQQ82EwN0q3a1uLWg/R8ZTQKnhv3dKkKSUv626vZupCklL/If/z9m6kKSUv626vZupCklL+twkVsI+2BkKgLxt1IUkpf1t1ezdSFJKZ3kxt1IUkpf1t1ezdSFJKX9bdXVHvoRyv1iZF+nf1t1ezdSFJKX9bdXs3Umf9m6kKSUv626vZupCklL+tur1buFQ5KSzkFAsO4BET+AiLxMbdSFJKX9bdXs3UhSTp6kKSUv626vZupCklL+tur2bqOXBV1baAm0a2Ou1ZQf3JoJHnTET8jFm6kKSUv626vZupCklXXiY26kKSUv626vZupCklL+tuUQ2nZmJJIpCbql1pgwki6LkQypswqaf6a0zdSFJKX9bdXs3UhSTp6kKSUv626vZupCklL+tur2bppv30NImzE77DpU/TTLnjtFDzMxhGjgOnLWklL+tur2bqQpJS/rep8/ZupCklL+tur2bqQpJS/rbCFqMr5Wl44puiO1s+r1/GGizOMZyMXcS0RQENBs13lblt1ezdSFJKX9bdXxse7q9m6kKSUv626vZupCklL8rzrFTRZVi7k1ufxEjcQxcDK9uaqHyn/yx2of9bdXs3UhSSl/W3Ym1Hu6vZupCklL+tur2bqQpJIj0ZvQcRvVq80INE2lxIMsCgHcpilRyaPahOW3V7N1IUkpf1t2JtR7ur2bqQpJS/rbq9m6kKSRLtabTh6z4xnZlyKk90B1TCrAf1S0yOjIrDGzDbCzdSFJKX9bdXs3Umf9m6kKSUv626vZupCklL+tqST90C3M7AsWDJychdDEOTBNaYe0pU9QIc8ME/z9m6kKSUv626vjY93V7N1IUkpf1t1ezdSFJKOy52buIYWLQM5wa+qWwyZLukFvawhm3N7YQ+3pS/rbq9m6kKSUzvJjbqQpJS/rbq9m6kKSUv6PMkYqiIvRopFKwq/VWMj7b2CZ0DsxZMTAZn/zzlUru+l1IUkpf1t1ezeAKr2bqQpJS/rbq9m6kKSUvyv6XQD/fUogfWob9qjXm0WlBhsLeFThcvfz7xJJfW5aPGA7bpy26vZupCklM7yY26kKSUv626vZupCklL9LrOHUHCvuvEG1Eytuuy5qMFMBWYzOVYXn3WVmhU0ahDOW3V7N1IUkq68TG3UhSSl/W3V7N1IUkpcz6laQxSQ38zQQCL2WOcKkvXVpznU9CESBOmVL9jakzZ+sQknZD56g/Ext1IUkpf1vU+fs3UhSSl/W3V7N1IUko+M0PZH/h1Et0ziQ3oA1Log3FTYHgCjD0Zz77akFlgksQxHQJFJiBJF39778WuxIknvpMv/n7N1IUkpf1/ySGctur2bqQpJS/rbq9mzpfs4wqarSgd/hfPVCCpW0F0p2SS+sOx3WLpNyKnJ5P5tt6VmfSd6UzpWWon+wyNQ0aVopaxOKklL+tur2bwBVezdSFJKX9bdXs3UhSSRrblvBNULiSZoI8VJfaZJf8Vlp1zd6bd8jnXtx/TlqvErhDbpqxn7N1IUkpf1/ySGctur2bqQpJS/rbq9mis0EeoJIklAJSWTu9w3sVrsCEFeBWJPIJr+fsyEqNW+Kg1V7N1IUkpgeKklL+tur2bqQpJS/rbqd8cY+G1dUbaO56GShDg4F/DX2IGEccabcnbfX0t1FNGSkhUemE9ny1HlR7IlvMSHa6fw1dHy7g+TJKX9OHCaxMOaq9m6kKSUzvJjbqQpJS/rbq9m6kKST3aHo+Q75ByAQkR7UKs8tnIEznf7jynw1x127eCuBNuGGQNXtwus1+/k9/VALQOcz+7wx+NvCUOWO+Jzo7XERf1ZR7ups5peNi8/ZupCklM7yY26kKSUv626vZupCkbzwuSwgLMNyQlE3L/ZP2VGiFX01Rax1Lzqb0d4h1bJjRxAMoQbqIJH6/VfRS0+GQb9oTgkM5abNYPi7KpJS/rbq+Nj3dXs3UhSSl/W3V7N1GT4K4MESbL+32WF9cgAAuBZU2v7YoV+9C0HklXUfsyklful9GD85+kKSUpSUbFeuzdSFJKX+Q//n7N1IUkpf1t1ezdSDAkKXZAtNYjp/vhMjBLKNRtztp1QzPdx8y+FsmpkPNWnjlyO1HhbcPKe9m6kDkPZbeOVJKX9bdYmUe7q9m6kKSUv626vZttc6cSzhDkjMA4XRfHBpgpN76v+i7VXqYSVV7N0ZF/O7cTG3UhSTp6kKSUv626vZupCklL9oSWZWi6cNfGBB66nOnQPFnkHEd4PptEas8PuZIOkhnLROTmAzHo26vZuq/Ext1IUkpf1t1ezdSFFSOVru5bnguqgxXuX7a34xZKeJGn+es6LmogyP+twOBbZvUi79bdXs3VfiY26kKSUv626vZupCT50rcmYj0A1ZkJXTPu0Sosn5C4IRwz5Re7m2VYtp69+vP2bWTH86SJjbqQpJ09SFJKX9bdXs3UhSSl3R2WvtNLidfbIJwLPP14KPL3sTpCP8NERg5qi6A+m7dXs3RdY+nJJS/rbsTaj3dXs3UhSSl/W3V26FgY/T1T/cgjlnYz4mNy83yRL/neNA7Jqj2pHBoMVvGuZbLBIZy2t+WsFRndXs3Umf9m6kKSUv626vZupCclsjOUSbh3r0kP8EFtilxOeMaxtRLbMs1KgHu7gGksDvpv/n7Nx9WnxCQzlt1iZR7ur2bqQpJS/rbq9h4OK5w6VooqnXGk95HNPOeRsgn3KruRGi/1TM7pv7aLGsH+TPV2OmKkvQh0xKRJEWhQfw50Y62Elgg+nEh+6ZNdNz/fZ0ROhh1nOR2e3dAbeMbdSFJ9LqQpJS/rbq9m6kKR8GHK9k/lLUjxNu/I/0TSzI/PiGppnCQ9Ha+uykhB4D8og+j4S/vNG7pNnn/5+zeAKr2bqQpJS/rbq9m1R6jgocv+BjfS9/ty7gX28pGi0Wg2vlsXz6Eh2A/n/j0rbIzlt1QpipMufs3Uhudm6kKSUv626vZuo+XN1fe7u4WMXc9soKTTH7zy5hLA/DipHZyGcfDFr6GR/AsaVNy26vKYqbHFSkKSUzvJjbqQpJS/rbq9m0Kb/sq8hKh3CjUbERJJH85U0nP9oyI9o/H+Ol2SO4jP2o3bq82FhLEETG3UfH06GsK3UhSfS6kKSUv626vZupCdRM7OJ7Q58pJnfO3CaAAw2snoBckqnQ0NEp4Bdg68EKfrzbI/lFlur2bpqXGKY26kNzs3UhSSl/W3V7N0EVXXsX7d5pxWRXJRuZZ3s2RgBluYOi+dvpTMXRJrldB85iNfpf1ty/GyNLN1IVKZupCklL+tur2bqEK3+QoRhrjTSAoRp3MKArX8mbbmms+TFXLBRmZc0zBVder0Id+To/ASURvrqQopqGP4pDOW31u1Hu6vZupCklL82sQdUbicXt2yzay7xb958YLzs7hQZHVSG8sBesnVfRuPJjbqDtaOz7PXUhUpm6kKSUv626vZufy+W6txa85scQpOFpWndkUoyRZKGomeHi18PXlepROlHQE13qn2Gd2GxIZy1pyf81LG6kKT6XUhSSl/W3V7N1HLlh2GYBCegwZ7ff86lyHKnpglVyUWVDvCyarHa6xCitt4wMk3EwHCvkQv0Dbq9mSlH/u6vjY93V7N1IUkpf1rgY90nKT3syPD6GJIoCTXwR6B1CZ99IBwJ4l+ZeWzop3vTRuW2NDF602Y+Azlty/LgMA3UhUpm6kKSUv626vZs6X8NKWt4kDtLglGOpBZBzJgwKU5HTLVnivsjrMfVG1EbX+xWa1QCfVCkxZr9G6vZuJso146kKT6XUhSSl/W3V7NtpwOQAmOwe8dl3vkDByUkJuyceRMyQFl4+oZb3PRJ6lmm3YqN5u/UPGAA626vV2MGbBX78/aim3V7N1IUkpf1riYfRYYzWUoVsNqa/ftoya/t+mJd5UChqGKqKN17oWTxZQHvh7ePnKa1TG3UgjJW+kdEM5f8khnLbq9m6kKR8gKzBQopT/9WSfpqQkTa8pN+pmNND6CTjCeYFqt7YdIUWhSYvzFLddigULk5bdWcxvsKr2opt1ezdSFJKX9NzUBkWYAGRhn0RhjMvZCDDFXpySrrDTHrLCz98v14Ak7XIzKh+/WKF7onEO+xq0gblRrRpUcmAmCKOlfo1NpdKzIZOL+FLMitS5GPb9PAyDP4frwizw54n++MZ+NqlP9ybs2B99ZGxVW4j+bqTP+zdSFJKX9bdWHNjbhchJR3Vn2ndWRcUMMbdacPBF2gEg3uL6R9pG+I5pfp+J4FDUhNGhmCmVoMjwYEMm1utv/tZAuO/F34hfWIoxVaId3beG3QU9Q4apnz+1uVFHrZhBqcpf1mglkT0M5f8khnLbq9m6kJ1AX0X25VFlu2BicXyVr8JY+OSTinnacSHwWW1gqu0bRiOGY+q11gHmELxgDQyKagi/27BSNC0UZJMvC3S/rXnBpp8/jY93V7N1IUkpdr+HKs1SUne2l8bBC0zztJD6/d+1GDuhVyMEwpzSQe+sc23hpwwrk1IdE+2We5//Pup49g7gy6q+Nj3dXs3UhSSknIraJqdH4eA2n171RvCwKTrI8lvhMD+clXnjvTSYz10vAkYH0Xlp2D2o92c+lDOkP/5+zdSFJKRECCP3DIZf85N9eJF/h1H3nkeaL7+2k4UmoPi/k5V43eblcor9UuCK1kvdbbbdqXSABNvP2bqvxMdFNur2bqQpJR2LJhS6tp5iotJXzA+e6hm/KnQfzNtzkgeehyYGoYMSqs7kNpRjIPn4rYyTVjII8KmW6vXxMkHr0Eyj3dXs3UhRaWnhsFvZZSpf00DUM0OuQAKKbGUN2Gpp+zgveHXgdv1OpIvdVZPIfb78YYGctax2mX/1Taj3dXs3UhOomkNBqka/XWb15m256WmiVFxKVzIWTdyNaHetlC2mDstliTee1tdV4uZ5HXTp8tYe4iX/obTBd9AUe7plTFxY931u1Hu6vZuoUwoHh77p04I/bRMRCfcLuhjl7E2GPKvHtRTU5MXeroVzcR79s7LBN7hUNlWN5OymWPIvJ8xtuemUQAB7tR7ur2bqD8JpCjMaztqKm+Qn375iaNql6pW8+gb804fXv7nAzR7oXlYpiouxsfS6l067aN/+vn6dRno27E2o+/JIZy26vZbnANMx6q6w466JfLyk0hWDVdR6Ul5Z/Y/QBSdbtOMqs4gGoaw3PH7emI869dwOnKOmdFb6z/9Ydvl3WJlHu6vZuo+X8SlJXL/N3q/RzWaWnHasfqTshPcLuScHCQI4Y4DK2UniVB4zOsCWdai1LDt/4b0yzeAKr42Pd1ezdSFA9s/qZyzTIM+KiE+OSG73bc6JPtV2u0+jxfekWGU53Ip3VT9y+sBiKuHXJW+vjIZARai7fHe7sTaj78khnLbq9h1so9IlR8x4nyPzkdoXkU2z4ZdnswNwGh+xxEeL7gExujKicnYHbtn32M6s5ed2BjCi5KIkbxMux7vrdqPd1ezatckvU1U0uGEderNTmeVnT8IshF4tT3AC/lDsbuWEleryG+buwXZIZB/S2A7ik3AQju5/X/JIdkhSSl/W3R7bQ7n5aw4oHCwmSARy1MA1plzh5FJTpE0Q/yJHS6vJqg8X3fJd4Ee8WZEYuW1PO0cUylveuIutK+VNbHGfxse763aj3dXsuSQ7IYnPOXc1o7ffhDNPhpMR8/llDP4BdPYdQyR75PDCtdYTgNic3d+nTl7t7/m5alGAM9d496TykmJCUA5L1feQDhGKZ56JckueqjTWtbyHMf8kh2SFJKX9ba9Ou2zwMLJOAOXM9qCxQ+mQgPV9h3bFm2CL+Y6w00umWesvHph65fQGnPJOfrhmS8o3kmgCeZ9CzHmf39Cj1ScX+JhBoX/X/JIZy26np+3XWAqXAkH3T8ValSME3JEFAfSIPsEQzVraQij8K39m6zqQ+0NT/0lMF/rcSijEfZcAipOukJsCWm+EZy/5JDOW3Vk3/XmnHPnufOkn8dCNPkyh9Bmx8S7HaNDGpZV/mK/M5YqwhfHUJ+mkt8XSHo4ah1eboePIEz0rNoWuLcmxdtYLqmuOMufZe/6usSlK7lBH8CuKFkNyko+/JIZy26t2x7iTlGKYjdlnf+L4WNDkASWZwzTqYaN2ixK8rjItjzMZzorfQ0/cuX3vs0ipSJw1N57IRQkM1MVeZX1IXg4PslG21SS2pUrJzoTn4xhGktO9ruhI1/1/yRVBqcOn6adHC45+2boyS+LjImL21picPkxxBFq+eU/D3e5l8Kev4WxxDEN80uXoG4dxD6Dsh40++vNeRE4+yYyEbGnkf+Ghw6dFeICowXYo3HVCMZ1wyHyCU1JD9dNPRJrHLigIuHQ8bq5YxnhOHx5TpebdFEc9wtJ/drAlhGnOlJCFxu+l9KsQwD/2qwfpOsjawT2pLP/axBx61AMRgW0EMW98zwFn4LQyK/7LUOUBqL12htydtRO9DeI+3XcoJGY+GzeUf4ehaQ/oXJsiDCLz+OyYEufGFlH6KWK2RAQfX+G1bxlrDEM7wQKKsSZVqhaVQLe210QGETAJNsQZId5FQTSjJ9QC/0j7urbYTKhk6vrpx8LWNryyxaI1knCx7D6nrNcMDULeYYA8DQfOZeuO8Ga3TDo3cnb4pvU+bYEvwQUNRbb76gACj3hi05OYJlOwoHKzO/i0+Qr46sfWAx6gDJayGcturrhyBozTjEXpNZ57HSuxtVgw+6WudIHmafm876sF0ImmR56ZrPIcQ7U3NCT2f/jrNyW8MuDlRIdCTL1+yQ2mti8nInlCqsTzB/6EordfiWMACv1FeQibDkjgziLkccbnaXew3Cq3SOM6K0/0UU/85RG4dh4dj5TVKSz///mSXS9cT0A3DfnBsU+dMo1CED/DX+iEPPG2yYWkrJ9SzGocNH6ELLOouUbAcHtS8k/kvPsJrNwsJ2yfApa/Japi1qLRdLwY7re/VaN/rqpGVXIoBDCQXb4uVJj9/Kb0bHwvbIUFbHinuurkh6f9WLXnvn5b+2AJaRbsyRY1ZosuO77mk0xNjiSzHnSo3jUD0u2xfkED04eBbVqJpvCBHuyRM+vTqDrwwejQPzaHUQFxpZwU6Yerm9oDMzSHem0d1PIgmdQCpuKfXTP+LzYBkf+EuoI6w+GUk5XrzfKX62+t2n4JKSSdaKe4WZ5blgmQJ5YZO6mC7P0JxDlQHO1qD2Oh12O8H6loN0JdR6+vheE0zePYmhkSjXx0cCyiwUSmvFORBDxKXgfqleUIuCXEiQ6hufTqKi/mN8cAs4TK4at4wDF8Lrxz1Kg35nY+Th/1XZ1qhWe9POlid49KcXr3o8ZZOi/tZEcrQq+skUcXI6wlO8oCo83oIarrV9UORAtutM7wL8XdaF8FqbtCgqTIRyi4uWMD9idpRsNZSm4d5APPHLYHaxQsPr+gJIClBLSKBhnmeq/mAARDY8rksdL0FT7Mp7cHfrpC8LCC8PFo/x0RLCfu7tG9uT87re/WtNFBaT+oZi4HD+c2V+kICbDqJTmEIXQT3JAlPEgLJ0DLwcP66u8vn2R0bvUPTb91TvPvdFiz+cs4aJbo4X08iWl3V8bHvAcfW+A29IE4NfgNedzMcnUGCrupCSN8jUCymBcThcabpKZVgSj9bNx1Bs3G/2oGpxLOaCze05O1papViK7DJrnSIA2+W/MhuNrK8U1n4DiWB3HQ7Y0t31H4lJGsxFahcT0qXwNo9i1QcVqjNyD4fZj1l50yHZJILZy2YlrdEKriSGfIn7/loTg5IZ+x9IvpvwrcufPqrn4NqHkuIv9rlzZzRxkgPDqZAlaJZ0CIE4uaMwZoCcucoXulHfO8q/lVt7DNlGtgEDy7QhROcsoslLK08L6yZvDnr0tUlR/madrPiKYhURtC+KwD2IdgIOcD4wFJ3vbl3uJ7/fCj3dibUfQ+sznfbGZa6dxeuAKxEu93dptB8WTgx1+nRRK+V5uF5tO9HToW/LxOU+xYJDfXzqKHX2b+u83ynUUOvs39FB2FZ+MLNm/HY5at8MwVIefD0jMDQbSyG23CvdXQov5NmgsvhVCVVOMfYRz/7DsImeupCpTN1IUkpgwP3HaTNCUN2/SP2sGRECAid2cS/OGn19KgjLbDQxFwbY3AdoekqaSLOYtIi8q4CLSXbB8iLQL++le3etNrDzLWxv0qLsNPOtcel/2sHwSurw3Y9aBXKdvrTzb3gsS5jbqQqUzdRG7LNgmbGAffQ9YuodGT0m7liZ6oReNgsxZzdPpO8s943X7ortFri0bR4s9fukP0qYN34hRNQEX90vsoSlcgvqDlQQnWH3TVs6w+6atnWESc5AZPyi86TlqatmhcEE12isB+ZpWbD4HdrDooOvobvnMzvT37ZnhDLiBwF8Y8lD/8JekKPXsAepWyoWv9U2o93V7N1ITSV0ruYBFdZC6DiRfs/UmC6gZWGxocxLEE9rs7770wSCV0kFrnIJcBPWzQIHYRA0x6QQo3uC1NO9WqK7SOW3V7N1X4mNupCklL+NLC+tdYqj2DWf7LNdppAwWBSnOACv7lPMZjJMAklrSSVJKX9bdXs3UMIvWllwYGbILA9vn/OK0mZkqU7TvP2bqQpJ09SFJKX9bdUYgJqcJ+RBN23V7Nz+oO6YsGLwUNhBZRu0r6uWAlsjrcPT7IUenKJ94QJ8FU/EBizo8l3CLGEPmIfoHM6FgzRF8njhhup4/626vZupCknT1IUkpf1t1Xt53YGxZvdnEM5bdXs7GV4gH5bq8jRT4qr8FK9/s3UhSSl/W3V8bHu6vZupCkbEyeJ9qYnnOW3V7N1IUjWEXpMbcp4gP0hnLbq9m6kKSUv626vaim3V7N1IUjhkuQU5j4qXKPd1ezdSFJAItM3RCRBI3wP/z9m6kKSUv626vZupDc7N1IUkpf1t1ezdSFJKX9H7lrWyi+EeJjEd9reupCklL+tur2bqQpJS/r/kkM5bdXs3UhSSl/W3V7Nv0JRj9cCZmMfzIOp1VVezdSFJKX9bdXs3UhSfS6kKSUv626vZupCklL+tur2bqQpJS/rbq9m6kKSUv626vZYAAP7/cWcAAAAAAAAAAAAAAAAACOv2knIeMEfSbQ0x8h2l1p3j7jZIL909eIlH+i/zBId7U2t926RR3KsOxsgKjVvhInBe0aoccOO2yN8mpuqaT4MyTt6BP4HDZIZ6ykcLg1r57qi9dEgelh5mjzEw5XzEm5GS/g/OxIqd0wUgR80ExbzMZLARUZ+IAAABL7Mbo+VzwN5PA4TTzUez0r/7P1kn45r93y3Y+y9uO/LtAG7PP+MwpOySrJbIkdQzUolgyVCFbXW/xrX8aiew39y1LFreE31uM+H5Jw/7FFpKlOano+WEWMYp155Il0Nb5iefUVkAM/5vjEI9jrCGBQEPVPZ57wcPyqen/UexPhPKaMBpmWO4mkVc13xEGeCiqHefje/uiOD4CR8ThaqRfvnsxyh+J3rKGC27s6356LzA4pI6WkcwDew2nalFUtgJQlzc3OE88r8pn+RR+mSlu4ZJHNa+N4ywV6+aCfPhIvcKnK1sRHJjkXPBufBQ95h7+MNUxzo/QjfLgAAAABva11aDzKv2h0x/BDegAAAAiOsLoLurZpmrOKXkjorwRe63vSYGraW2Ghflj0Tt1A6YjvJtj0SBfPvf/JiDwOtz/rfkwFR3F+oftWrNHLoAAAA0I6TaDnjgnCYuy7A7oY7LQZyMnvJgfI49adqFPInRcJrKHJd/WfkLEJwG0Cz7ZViginloc9cJ70z3XaD2dg/a3PTDATf3NVrLNhAAyEWd58ctZ2m/AGQCrcc5Wi8YdHxnOgWINanUMO33DmgAAABUlg+al9eur5rSh6dVAebHSf0pkywXy/TULvYOrxY71/S3pZMZlIPzSqPyhGhhUP9lpbyR6VrEUqLP/z+bGQflSCZ/n2+osZjwuZ4W24XjITS+DI+ajbXdvWyBdy1JUdFFDY3Ed8PX6gg4YK4AAAAEoxKrmsrGu84eSsny3qveXWVH9FQQE0uO52n/F7kb886TZOj0Ll1ew2DRTw334kqktxnGCSEfx7qW5rKNm5folFZINjEU4uec+36cdvx3vrvTD7tU2J/gv7qw8ypmABDyEoU6cjWwAAACDJGjd4hMljSZJofSGsW6i0wD+49sjWGYU/F+PzKQiSz2oJZERlx5GDFu8/7Yt4l99DdYmNlyfLD7xkClzjBg0dtT0yzL62HUYti6qlno0uNyIZcf3Y4BvR8fxd0i4AAABCS5e6kTrqWWBx//rzBHI4AQiF+6HFugvcp0UHfEasdT6uM8b1CvAzXREJv8jUUcsMRXoonocIwennAAAAr2xTLRH6LqsRAPatHsJUVetXl0p28WsVa2FkXztSOWD/6nfddt42/yOTuz3kpKV/eLVw4s7bzLGUH0ykajeAAABJsL06ERvYuUrvd5XaJS5cz90tBcNycwhW8yFyuciTV/4LEx89xXfPC2+HMpJwBgBKCev3Pw4X/ezAAAADI9JXOGWxznR7MhgBM+yPmGsKHFvcB6LlsXc73TSFtRYR0RsGFQAa/vA6Xo1iAAAAD0A9ABSFkae/W14sesM4nWDXr/VeY1EFCEwnSe8uhidYU6Z9kzWCD9ty0o4nwUAAAARFAmT7phSIX180uje8lD3E2f/44psBax0MEVyS3bkOg4XRc3RvrBJxsEnx1CUOVXaDwLIu0YO5hOAAABSJzSijNSAEmkkTtoA5NSGnCTvO46F4q/wv2PoAe6fpcA6+43qKtWBalg2YxvCUWbbxXKwSkZ6fo2koab/Ba+6n06UTtdpq/jgTJNpRb4rdjnHtVd3VSsYjWd0aeY8AAAT8DU15TViwo5XNZTD/KB8mez6hAjhf3TkKyMNgZrZaGi1tf2OVjs7gpGlUatp6WepfvXPJL4kjk3CUJSa0ziQ17qu4yc5SZCoQaaDCMjAAAEd/ynp5Fd8pFJW1bbxGshHfZhguxcsL5j9qv0zWy5xph12/vUVUXvfwp0gNeabMQPBuHDZVQWe0AAAcbtaGEzZnRKLzS17n41N8mRztdL0HJ1ciu8FYtgixX2hB+rZrD3mHbSUsEeV25asQVoijNmUHFhoQJc8pdXwP1z18aNN+SAXvChpsNT+t671m3ewW9EAAB6VLvwZTxXkSXKCCKmgsx9k9cybZiBWavNDdGD3EqpCCr9vM1kMJag+xreDN1n35FNsCqQQ6VEh70f12Dw/Wsas8UA9/7U59nnxrWnfuf/otWngX85sE5vQklDZqREVt7dzFunRlzC8+j1j+XajJibGy3Z181aoR56zWONecUpZqbHXyPKpF6/hiUlKdhaNmhp7Qcxmv182ZF+2oY/aeFNQmqBknbWAAAF/8EqBgs7OrLJxiWW+vx3DYSHYFCUW/5mEtRjuIBeEj8BdMqLBnb2DT7+o0KH20NcoVIv1h12SBlgfcz6bNWHAUlgzr7rt9FGVave78/GGZn75JpTpcw8KFuZKnU4lGZwHgl7tEf2zHYIrNNszNn8KU1sDsL5ZDYxTOauoyegvjAk4VOOUPH1kXrd0/mofsrm7FyS8IeNMPkTBGtXcRQtPh/d4HXC7uNl2cCU1q7lcr8HYZpoUdc/uyNdFXWC0r6g/qmtjXMRHxYLDQpVY3tuKfycZD2/AABWTnPYf1xbpkacMNl2US3Uv+uZXznf9dhcoTS2XzRUJd9N/U9NRcqCqSWal4p2Dq4qUX4Wgf8hj+z/FTbnfAsXKzhVDgfPaWVKTRWgHzP2hq1Bwuk+DD1HqcaDAAfPWFL1FzvAAAZtykdUimnSUR+nzk4p/wmYb1euM9aMa8VBiXPkcRBllIqniVVFej4fRWzEqmOS6JjbxcIIgu//hC+dUUdUUSwbO+WGFTwRthBMi/cCjwGioAFPuAAC/x6wcbjEvQRkcuh3WEAJvMMjaj0LBRb7P78ta21AsljFsenTMd/ZYSQSlPrWZ0PWgujkIhuv28Gc/13L5VQ5CDxE6QmkP2Ec7xJsELuRj9nrui2tKn65MkVE1WlRW4pUattg86JahfSdGPD2w/v9Oj7YRcuoZ55dVRg6KeLWhA3y35fHa8OFNpNPcJgs6s0wY0H5aZ6wyCYx2/2XiGhAd5GAR10t6/39wYy0KaO+Br6wepdYs4DQA8vaLsEn372WVXYZoGcGhlfU69dnUva/bhBxlSNSi4Lnktnse1IEXTxCNiJPPuJz65c4vF3Hk6ywVb5ePuiEkG39w5emVAQBfY0jGpdfnsj8zcPwlz/tRQnmCrEwmtHHK3shmH5LLvXBmlx0hOeGTzObsMqbwZH20aC4SpnyG7rShIN9Y74s2bV0ZNaQ13s6cJL2wdDRK0HdeDgEsaFAVs36nWKaJifbizvcf+B3qwmv/M9qRxmJL+JgwLWaulwtNAp1+VeefZo85uTEYGkcKLQh2l7CFjnilonuwuSRYaohVpfByaF8AAATCYEwAV8TsqorClnTyplXu9QeoPpG+Ve+lI+SiVr+RYsAjX+D4R13N77sSxq5bgGXnu/jwpfuZSQXkaibN85RHkcRNLILD6Tnf1pnILY/KM3kXSt5umMBkmFN+CbG1E/49j5Ebp4a6xlgw1yMiWjorqpW3quBw9OWzhk2uj2NJvt54tRWhdZ8Ira/9ZhNwg9oDeiFji8UqgOvrJSafn7DiDzvMfmBXNXbuvcu8WU35n9C4hmZMUsbSYNbabLs/1vtfshn0dnVI9/+4oiKm+j4QLPC1LJ118xt+yphINPWE8Bngf+bH0ucLwPU7lOF1q4BgDypyH9UNa5fBA4rp6E/f5hjQ9ZWR4OsPQ7rO6SNo8rbBgGF8k76RSOt6J9L+gaSc76BTkIHcYuTrN6+9dJo0EBTCQ0eW3brjtptUZm20unDJ/AqdAxAXz4A18XGWSBKNQMUP11VOrYu3H66t5O0hkAAHi7wfMHMs1yRR4XtIfMzsHUCz/clGKekPsWYL4ll3ojWo8oIT0kCmTEJiEaU08e18YKOuVnjRO1HqBMaSlzZgzDiI6TTEx55hVGeP6WSUb4QDvqcwVO8jhRtgQ6ir2JpSFjIix1h77f7N4kmaI79p3UwmeNxEuWcq9p0O1/AUD6q/nVn3Rd+WoGpl0yxNhr36ncJN0/3lE47H/uKE9zZDwb1XRoRKKOszA+VVIJTmzyXVtJEFLzoUmWvGID1rfJ2Yneig0UFO5oGmKd4KUbs1Vy6BnsRWPBA1uWPe8qCRLNkMwp0ynmjGtdIygKDpTKwRnpzT8XVuARRQfeC4kmdgA77G6JnEJQ/yqYgN1/L3wjxQf25W7gAA4tQ9rgrCxNcuulriaYp6ZqGgmpHcNXlCaKHt11Eg2Dri8agCt9O/faL6isb+okGG+TPv64KuecFH4aNM7HRfxzwgG3k3mE8oLHi3M0wasLRQdT1KYEXuKNAExDE93UXkkF6Sv6wC3EJAp8iAAEiGuyWQTSoFhF4xfbX3+rRVObXQSTYRNvpyq4ckxQZWuZ3hhyR4wJRAyp9GwPyScO8izFqmER4d9yq3jQQxV0k7QhYGERCYZ0RLfUuLXG1XKI+YM+1ORrchJsveT8zO461aTnXiGDBIXk3brvFerbbm8p44B0Qc43vZuexWEnrzOH+2BAjOLOIlEkYiNWIjoAALxQ+DeywXqsdbHnJTy9LhxYLkcVEtLJGrw7vlc7q7TUhNgm8oPj+7wXZ9zMfLvMjXVaxnQLz0MDFwR/sfg26hq+hkSDbYva9RPk+PxBo03mOT3tmT4LI+iG8wjbwXI/W4ACDOrdo+NWIi3OzRNKuKdGbpZLiiRXWDknWrxG0yTNgPQ3Wt5BCb19ttNniSpqf7k1vlgmixUCKE5SUqKMQuFA+y7vy2160lGGGfYkx+SUdGNc0TOfQlxd4AAIK0Mtg5pwqkSVGXyIez0urh16hdf2zR04LdIkX7KlgYbHaqHWB5mpvLEOlm3HYjRNf+avCaGGA/XFvcNWBFAAH3YozmGcbHgGJWC4wr10z+0oOJBpYcHV3b8bUIQA22b5yoibYiam24dEbYlS9a51fL7Y/5f/35+WFDUWXy1NPozxZHF5jgiy60ACDmVbS5D0ZkYPyhmubEiAAMYkpTkFBiEITrn9nMBIQNKOxw+tSWPTdSli41V3Qg505KW6joNp+waFD1d1mdR+gsqNmjsNY/vVw1rOa5Jdhno95B++bJ7qsh1+ETMVAAFVr7eSwxAGchdHfFQmTxCZ1U9D04fDc9GzLa6urfqdl107bSsyJTdDpJrBYZHxEf8fN8Jzub8iUkYC6i+mpN0Fe09D/bZrKf8kaH0szzDobMV+Fv/EAfAiaaXLfYg9EZcqmFAPnux+AoG7papSuxxTUtC6tVCGef450477AeXcofgXOPkAA7BML+xXW9JCzNrjNcQxqQLuHF3q1/aWidvqalYAfBnXx/DVeUwPYYfoBaRNJ6f+iKMC+9DZpPybNCHCrrrb2p5pHX0dfumL8bGGw1RpjPKeAkUqskQAguiK/XBHnup8Afhouio4N215C7es8AAxgMNQzYX7Vt6FKqVIgN3Td4jyUdpLDMnxiPwB2YWYP9ZMhPLxF4FvRQcV9IOFpnYdR1EIpS/pgDg6vGTQBYxdNJ0HxXtP2xfBZpVI57PCJwYmCn6dbEZ0abDuZLqXqzm6kaH+jjnJlA6YEb1uNMYuiBl8VFm+2qEBy/KAeHUVW/H6m94g7CmK4+mOOWACexBgwpQSu+eHhNpjbAI3hcIRJr7ek/0MO7XGzpRJRGe3s3x1fyXUA+FTwEwXvPxygOSz9MnZUGdbkL3erAdZJbouxBQACJqy1JYnfXP94gqAaMK/vUlDvEsNneRAH314QA5Wc7Ql/tWZSZx4dGxxLF6Yjrr1hcfypWjkSG0py2YgKDF/T4/NWSp3nLkFkKKJ1IdZtMBEujDZ810WEc7eAa8VOEXT7Iy060qAAAlhgEMWXMx/KWcliwlhwcs2o4n/KZCGBHAxFqSunMO2YN5/OrAj52zIBuc6tcObqFd8aKb6vUGlJtypuUiCBxuFOoaf8cTNISYUK4D+nTYH4rwBDYk9DD+CFOq7vf96HwAKryWe6BKBy2hg0/dbtDvsV9FGlj5iH+M05Gfk6UOqifsIAsasLiY9HIcsU7FzAZ/5WFZaQAXyaXLkFFd07zmbOm/ehhSt3VBJlS+q+Q9v+2aI4K7AMUXT33ZFd9jNFgayYADD1r9WY3Bffk5gG8zsoJ/fh52cqs+blAtL9rl6CP7pol4ogySIPmpZJ4nqwh7PcvN2B1amp3z5yH8O507HL+SL5Hze37pdgARHZfojMefL+Q0iXtqLnG7bC5BV1n6FloLWAATmoX6q7joAObqBfyA6DamqUFLDfwv2vf7RG/vJVx0QI9NG9V+X54FN7tRKZXrKt6gsqefdxrkjCY7ixLiSvdmJOrCrq34t0GivKVdTs6dYLmfu85Zv6/w4TRP7n4QNtlI/y72YtSxf0iaJ0F0QdUu9XjC85duOoABkxMCH4DOtRBZHT90SqMdhbV9XbY2Zh4xHIVZbuFsecknM+eQTOYMomV/U83HgvpxAJGZlUAx55xmS5WlgKNXYW7d3bP0dqyzQ02CHibMJyNm+UKKn2Vd2CcefCodBOSbGj33cUYSTu6UCUiyB1uQAluO2UGHVTRjSg6+w4WcwZPsGkgSb6vontwRiM4EYtZ3wRsRS97cEDaxQQTNRYi6QKVuTtzkYvBT8UaPRsJko23oNGu//zr7QEKdhsoXHQFSYS9PKzY8Cnd/e/G2elVoze1R1S5lRHDP7WtdeoABVpuGJDd0pYRQ8+GV6WcdXDBUBCYKNlOiVz2ZR52Jdjwk233nE0odjdmhpryTyjVib7Z3t5GZVv44JUJSo+FqK0B5H2CERPhro3suxAhOv3PzBA2H/Qa6Ep1frb87VN7l8guvAAhvPnQM34/HVQyGWr8B81UAju8KDOaG6X/PwfBh1MWiXs3aqWze/a1TLOjAOeiYRwFBdVFoDJvY9t3l1INqXPiqn8gYNwIYA72qrlJDyeS2RJVWQ0Z4yoKBHyJgCK5dEtVIhHEZoAMfH7qH2vOln+6uVlLUeRJe2XTl4CMun89mUJTd3+SGAHzBHnq6oAfcdCil5nvJBt854RZTtMRMQ0OD0BOn7SvrX2nZHNe5usfCiKQmLYxUekv0kDPshYIbFxupkzLj24yVAxStNnqGH2DKjx0Eno26EsJy1oD0sDRCikIuxlbeC90+72RuA9Wxg10LblqSwblVGnRqsfgnSjM2W69psemh+4OEcTDJhqE35IXP1ZN97FB8XCzG8svx5k4EFkVW9kp4XHkBNaIonjCN5HyIv8jK/B/Jn9p946uv64+225f/4aUK36/yrAUAjCHVBNkBhCbBTPZ74lF6Ch9UkS7Gn89jMvMDlofgZTFzUqVldHh+FVGyNcqZanlM/uVyyprkC5WGrXyfkRrLbz/ebC3PIRa+8bz2QUKmLLmIfX53eAGjGN5SxRtqD0d3tzEBisgA6t9myX6Q8+4mSbwr+cHl7hV1s5FM04SVOCBroO+HEeK7SPlxal7VNWlDvMs0ApSaqFpj0Hn+fc78pN9PGds6IR7zlZ3FGzITG44oREvyPLtekfA+GR9Sejwh0gSv3JUgOxbPMtxJiBz42wNb0A56ZZFvq4ctJU2bnJBUb4QuuAscB3eudiGoiid0nzKLupbV0pc0vhTFRiLkmerBM87HA0WQwLAKP9nqCOa2bqsNGvPvNzxJ3G6e4aZLnjB8GEZ6kmPuBXT+rFodoBmeEXvlKBLx7svOwWgCNlXjk6sBShuia8At79E/JJM5XfLSp+qwOu0jwgUvw0DoGkWJeX2OSJPzp1nSgt19Y0+sGqWfJH+/cI06VSB9FrtGXxhDQIcr/zeuNBkEWZScg6x8XMM2h+I/Du+pqGA4n6Bbvbc1b5fJJ4DdLSb9ath22ZcfeM3wv5O/vTAWKWI/1WCOuJZYol+V0dXpM84wZeG0TjYr3bHPd2ivoHx89JKMWw+y6TWCitN24l8juxUetk3SV9WMthSbMZwpckYY9hKnI/ndgOUd3+dxrnDucwyWVQBkUN5idKdkaUTrJ11sORQSJdkCvtHErfk/82cjz8icVbF+jftjysJ8rTYsa6Rbzd9F7OZ0dIBn4C4StqGDoI+sjagis+x6JDSW9iM/f7XvXbWekYR/IRatm0BR0+gjZh9Y+ZyVG0L3g2PflMBjyM8NZ05bXSQ9eFPMIQdoDBB6abo6VwlI+ZIC9UE0i3tYqZi11nGBwJtIMzKZbJA5dNlTAloJWBaZzpqOzXjY8un0aqW5extzqphaAHCtEk1/xhrGhVL1qDC8NWgXPdupwZzJDuKuSBAZ7PKms8UGLEblSfO4wY/MiTD4cQjY2am7Hx32BAaTns57OeylG53IwPwDO5yUOn5i1lagIVWXDnH3XAsw14MMZoraBOzTlQA9zpNDiHZcERmkX8vE1GQ7MyJzJ/fK22pPPCy1h2sbyA8LcU7Y43nvxm/iEKabOOv9fIGmc9HM8gSOZBvuT5L+tdkzA3MufxPD6v54dirzGSTd+Dj3F2izT6KuU6PIgHVPvUCkkW75e9khj1VnmlO7ld78z2VAQp6rBvl/6aImYBeEDTnN5o6+/b5wH7ydDyQS4AIAGM7un661+Tpr7SIZqx6MPa6YFSb3V69Bkkc3ieAxf6o0okeZIFiI1lmLp66jyutbAqKEEYGXlkdVf2ZSashAkKzxNdYjGRjsmd+mn5IlCXcgkEwvcq0rpedAt0drUvMza8JCuN327boc2MbwrB7OkvTcUQVEhpo8sb3EmZs7GaZpwDbVKvYUwLINQB9vI0/FiZjPAz30qdmgzc3RdFfRwVLQZmwIx4PKEyB2qZS0XuACL0DV4cjYk7NUtOTETo0QB0e/+QMha5FSQnLN8A6fy45KTxcnaT8m98OUSc/ryWu9a4fXqOt0sUUuzy+jR/4r2oyh82S2u0Cz7gAiDvVxB8XBqqH4xtK4zLJF8UNXI+e25FyCwYQ6u+cVOaOr8qT8Wj+/OOkUqI66rHi4xR+PrNMBGUPL26xYcao5RjDiQSJCUKwCF1X6DDo2z1A5YfAA0cJVOo+zmtgtgIOac4RGSLk7a6VPMJLfcQ0InJgcs5NmAkkX/NMVR+fnkvZZYD5wrF2thNFkGnYwRtAEMZxt7i3vyGitOCQhMehAAEVci04UDp2hiAYZ9Q4TFo2FoLd7qiHTWyChcGFwA+XEEMT2EvuLogEEawjhl3chpzHQaNigmLJsWrAfGdXZFXGf7jZmG78KnTk9Iu3EcLFir9c0qqMJd0wPoIft1gXxqwIV4dlWZzvDE/oBQjb4AzDarkr7ntfKV2jXaC997tQXLR9kqyzvOCq7OOel2o29ER7jknPb2iD62I0kNUouG0xiRCl6Dt3EYbIUP7t9sO/QoYwMs104nGoIWjwkmTvhpTt97So5Hgb7IYMcrmOE+VFRw0lDVnlCu2o6eMn4B8itH2YPfxR5j0dBjhxFz3ZXAjmFhIXjLHxBLRpA/wThoAiVhyBYm99uGnnh3J3aHDNdufeRCwMXBkQmZNiTQscn6N32m+dv8ixxXaCjrcpJ0gU+4Ud1NzcfATS+IS65IwZnBH+OPbYMKM2+luLJposfI70rgB4akZC0BvFmHwK3FIvv/EPFqbPzRbRQB3CK8XC9r8FjMcnNPfGIwVrf8kAGu+wt5uZsRi1la42o9iElhUIGVWCBycg0ScBumd5Lm83ONp/2BaUlRSE2pojs8yyvxVVAlaMrF1yDu32ynZTZ/C/a92hQlkaeySFJLg6Uz7pIthJepIqGVgKNpP/CkR2Gn1//l4zHDHR8iZWb5UTBedZIm/eIUtqZtiMnQ9x4ZX6PD6DxArdxmwXmorxW2luXQAmiGf41hQGL0HdpeUstXDKduFQVg2ZMY3KCfXkcQBLU8KKbcMp6Uh2ZZyNwGPgLTN5bC14ms9aSWNm4+kLgm+NxY/d1JpSMKy/WkASKVviwmrhmU8yQ6Ykv92y1pP8RDLC0D/luwreDRev80v0fyTXYKYDdXu79TUJnjN1xqQeDNxF0LqdfPyeoiJkhAMbNSwk7jguNfoM/NJGNBbFuXC6UYlaXZn+A0iWm+hzIqMAGdDPKrWXv3b7bFl5I2CVEBd6YlsEMFSEpJe8yLXaEn4EMYE5FbrfRTOvHvVT85HWfuSHrIeFBZRcH7lwa/SKlVGZq4/ayKJHTCSNktz1CnMMle1Ihb+vqUfEZW9478hg+QIXbXgCrfFvAy7HSHC7JmbxZ9m2ewqN63NCqZdFbji+pfgZ7gG4JsoZlO0Ehj9NYXsVW+x9xQEZSbgoqayH1JZaYR0bYX2SHPZiYQiT8k9rACsZ486jtu8SnU+bacWck5mbLl5fSHSPOQ6nGr4oR4ynkHarUKTXr3GMtYtisy1s5Q5gUoI0ob0sGptGjbLCC41hxg44aFCvEsRVPGZoXXaw7ufLyJ0zKkHr4S4sA61IBTLr7uzRMWqiQWhbT6ZNjJ+Dcv7gHgpdHCShnAulc0iUsAMHVCsLvOjsocZK6k46drxubhDI8/eBpFRAklx5N+VbZSFAYvWq+jS3SYXfHtgY8Tq4KUf17Xu/kd8EIvHLzndM2/F4LP7AFYm6jVXPd5rNvUnQ1milLnFjkEzahwHKTFD7KltZkBb4+zy1eMTyLk+S4jmwGBj91D7XnSz/dXKylqPIkvaXlqOV+YkZTxSqXueiyKKcEDowM4miLJ555jdjZMcchYO34FG0g7Y9E3Vin7uL75yu8YzurJegGB1TZNYDGqGPCRAEHUpvSTlwJvwv+VXhxY39waQ8mg9tEDjOAOzWRekMet8WBoBJ4/y+5v5KklBUXyI/YC9U7ip9tPkhJt4EpQWgFwjQOhJPzJqusMAIGrrnxbZE/QcZpmxhfebv0mvDMUbLbQ//mLtoJTaN2mrtty+fjaeaiLke8gGFxLiTuCl5O6lI99YEANyfptXlNBiO7uw99cHSgpAT4teua4iMRdc6VfaOrdfiORGtKI0juyLj3mgW+3C/YmqE423H2SNG/TmX4HBFQeys4pLM+pEemia8/ZHNUpqXcUxa0bF/6uOPVE3B6Kb559NooenqPVEGqj5biJ9VedyPIY07CPcr6SEGCPQ+Rmyrh5sd1PfoEn95F9juhyoPABSUdSCjdui93n0SR92V4CKNi55NjKyKhE1RSXmGPwH36QIpE6RQuUSlVpqCl4ehEbPHoe0KmB+XwQX4nt8g19RIP2XOIA/VK1d2k2vW4vGrdAUN2cx35GxkF3bpxsoSrx/GpqO61Z6i3Sj1twuFpT4U8eHLMccP4L52QD7rnMrPTeLzYpAWP9sUq6OueWTr8+aviZUeMWGsd8OKB/Du1vNR23PEIyRHUmsuNktpXye/DvdiNsryQWALbFpEowYW51Z6EQ4m4EhT8OMpHZ5KqgNQEVSDPPGBKlAbHxsLcSrK2v/FfVzxE3xIWltS/w3TA/e5ZOMxltDVFPhknxMrYJfZwcNpKe616Lc/4AAVhfoU9hcgoxgRgoYHLAacuR+NfMVVFi81CrOCrwtkQ6Xd8C4Ud0fUXZ0zd6iQdkZhX+9IdjC3aKwlHXC7mq6+nbjek+hggTf5/bUz82RJfdBPRnNtjbQzf6GjF01KNXNPcVQO52hvn+DZvkJiA484ovgkOp/p2hsMjFLUa/IgLmXGtK/TNJR/UCpwXIhqczbxp9Npwmfu7APk48aHX24cL6UMmEWBuaQHKmFChyTIYGWnKi8X2v6oZkAuZx5tRMWGhTlVBsOPr5RkvUmC7LYZyFYZaOl29P4sGOzY8WExMtSo12vWuU2ZDpnqmLFc2a5esDXBhqphbty48NQgpzXwzkADVJQuvwjQO/U/NX+lQcSad+AtbDZK/ZyUCsX/HRa9cQ3ZT98Knkc9eAMn+Xd7/Vag8cwAsif1S9XQ01oPNHXrwnN6ETIhwXLfqGC8C2QlQ3Ipn5ElUW+cEqyW9V4jXLAmq5cUb30L2GmHsVybSJSjY60UytSSbc9i7IWC8k2wf2ZMRslqkyzegqgHErsyyLt/41frZ4V7fl45fbQ0P1MqIXqePyLu1mP1+W/vweMjXFvOLfbUtbF+9nZ0RmI6CahUoNPRdQRQWF14G/kwp8vFyasP9uDBZniujnFeiK2CvDwdtHV9y0hB3Ourw94gIFZjqpfvuJAt0jwGNspPRB6rGviuyxZcBQoY0AiD4V/kgdyBpQqEwW5DEWmHQJAmZgz/9VqvWKQ8XL5byMueFz2VjU5hzzlYnJJNSgwofOjUTdstxq9J3U2AwQ/fFTG/4lsFPlHZospFUpKUsA3A3RbmhscQOT3UgDuVopFYAytIn+lQNRKq7fE9qj8YMpSraByeE0JEXim15tdMofvcYHPRZAV1ldSrkJS3PqL7UdYZeAwiIccwxj+Y8/+ZzrFK7qcDoYhMzReyQ48iRLoZhRkQMqh1UQ425bcU1op81gMJehvkyU4DY25EE/n1Jg/zwZ3FVdiRp/8Qhca4mn+0OYct1lVd57GnWMwdMYS1w2XlmwKt4iM8KTk6DMBtVfDzUxqVdRdF6zbQGJKErvDLmgcdaZllh1L/+qoONF92ZZofpLgZq+1j3wrEOWi14COsoFYvyWDPbURJ7g2/411AadtdpfvqwltThgu1Gdc/Lz7z9FAnYYjcKmxAo/SQCZDi/VhL+arEAb+9fnFvEgALIDW3wgsf+kT3ifizpWStQ5hEYv3EeI2qCODuTDjkU2MqvY+MTZAR6T5fMds8kZCyF2N0446u+tu16asqGZ6RP5yaxCP7RyDSbH72qsnhGVBCZnEXxwQxp2QJUSKW3vtb7r063duy3efn/Ewzu5CI+wsq9TE9rjZ9tNzQSLbOicwsFNMTtxo5KbBFLexo7TEkNMTR91uuKrLke6xvLMX13dVuFLgvTGao6Mo2KRm0pREBmZV98BaAxTBs12fP6uzQc7redu1i3uDly4sOJ5qAHq6yr1t3tDnUJbVqd3V/p7xHfk7JCcJzCLtVlOONrA/N8qYGE74aB/XfMsyhwBYIQNjB8VR2KAo20d443CLQrYyUXC9r1hfJnehoSGa1rEtyl9pJF0iTDn6iDJCOPY73lptvzaj6AeDGPFn/P8p49upFDMeUKRt34CpDtJxIhbMb/jNlpdTpM6+Cs2qdzH3R3l4C0Lgaqbqh02Kmllp1SvwLjU49O3koDYSForpInCQDAjzbwHDgpx7ZHZO52lGVonbVG34uD9uQnnj2AMnq8rNsT/25jqx/Xi/QGnoguH16j5GowSnCSzHAGW0horBjfN77ej56YiQuK9SjmGXLNJ61ZHk/duYP27RVCiN1kLORzDCPlGiPBmgcnvSW7Hhqn/uOtP/djxinTZf4g1PWQPIkdX3zR9jPFMlTWekvmAWDhhhZWWWGq5OPRm060ouGT1jlF6Q5B3+Hls09pRFSK5S3ppyZUTddQFlysLnX7BBVFJc+rpgrQn0/djNTZzFTzniuPtsWP0K/Xq84v3rw0hY79YTPQUdP2qIMpg/0OcZot8Z6Ui+5fEj9TfN3ztb+KwQmaEaQ9yqfi0oGhSLtL0fdinK2iB1KC0j/276W82ISz84toa726xgUE8wOUmQSYagDXTS/U4xR2kPmtY55GLsc9xFPFU+7KxxP3RHMOEMPLid/5xozytzxsXoeF1XCzh1ZYEBQC3aDG+jNqjFgksp6wxTyDbJeLNjOjo3dg3B3csJmR+pyZBVnB7dFGhLV7VZQUCy5mhhaw8LPr4MoWZJPqXNUmFpLQ74u7k+rBJe0Jb+Sd6ZtWxY7HlIaMTu2ycbPYV4m6rGfKnFEtNf+1FPtJFrPzjiGnQS23hd14EMs6eMP5zkoGzN0pI4gFn2x6U/0AkR+QlKvaalIhDnT1VMS+oHClFRL5KriAdnXpCYBrydGjGY8hR569EnFPL1AsU0rl0TQSwIElaWftDoPaIhD7lqmFweBI9zCTeBvhZ2VdhzZWkjrebf/yzwZd0eqr1TEqR8y9s+qhBnyXhxD79yesesNO9hUOX+cqGntD5dq98cFCmpbuk0i6qy8+Uevn90IfWNeSriefv2ug94JhI+7/rVMS3n2gH+8vc3Jkg1LT4jCkDJNRYmUv+E8t+263Bz+v4/l1P3qWiMIExRJ5ka15yjcGeOJWy7T80Li5SlW18RkGoMy/5i4MLHkly6UO8w+2NwGyzibwpHbg18GXUGx+/L6O1mRPIhLSkSOX9MhubFzAxg3sctlLI8d1LqDO2Znzdvxq0NbJemw8pXv253Vhr7JgbNfA+QnWA0/+cmOMYJhzQ4I7x70127wDZnFJN76zSu/2fZIMB8x9506bSl73YFZ8r/gqXf72A4yCRfYcxhipJt2xf730cR+hmjx5XD8l+M4jIEilBmNY96UP48STT7kCerFhyG6M5eL2H9IDjw5SlWOpkQ96A8U4cZkkW5LGLvjR/5pDH6qZ9S1M0trwyIZ+Jil9VpyXtzysiKL7Bb/kU3FYrMJR/eE2GQxtkDdrJ4e6sTWVvdFTVDxgxCPWmYoxOwmTa6uzkIhxLao1Ui82Ob3WYNTOapfnuB4xhxmOjpTa4HyzB4baEV68ks5uM9vUlOgZ8mDkfH+N1Z0IQs34rp4eY/xUpP9GwcaVV2DIzEuWTmf9QwFr1pLKz8z7EtbOHWUERorzL/aajO4jChWtKZUSLANqLMRnbuGV6m1hleiShkrEt92wpKQ53OVxu5sw4jKfq4h4graKSBNMbt/BClAmaJXwf5kleqT4jCHd4rOXTqNVN8VpcWmGfzGEQAdLn5EsGymJmRh9h4pyVT9WbRkcnRGv087e4fA8Gwa7RE8l2bNrJ/zhCP5XjUtqXFBq9ZwHZ+0b+g2LPp4WbM7qxYX+fBu/ZnofROB0daQ+t2nhz7H19maJu1I9goMpx/tgHeJHmYHKXe4jCuw14ANFoXPzjYKnyF7eLIzhtrxsz2rk7yuPN5WdgD5NKFRD8GT9OyO1wRP5IyoBoT36PECvTLQisqmv+pgAf7GLvtond5piyYHoB7E1itMww2hOts0YjJy6h28WzjgzNj7RtRLD+WIpE97L+0Rdxlx9Tym4W9vdmtdyM3J2fF8NUFpPxeh+GJiAz8+VFVuBGztjzoGK1QDdxYEV8i73mYzfubImhN1UdHAzYYl/lIw1Q9FvjLS1KlWVKw3esMvUIhyAo9fcb+IPn2HzcYgJ3EazCE4dRaWzIsXmyA5DTjCT2Bw6lrvldbUhMmsj1PuAuisBddyJ6hd02Y+QuZMgJgz0ZC7GOPoUSnzrcS7NkaMEhk5XoukiaxICxiKarzn7ux8BLn3BlKmuk9FqYAy/M5baHYh/4y3cCWcZl0P0j91Dpvu7+Jm8eivMMVbbjViIJWWMugnh7KGG5023UmQD/ee1COxe46hAsIYpryoAcjT3ThadFBDf9DUnpNpGNchtPHUjRR/BGAcF5xwlGIYTZauq61lS4Hz3mD+72B5Ym/8PhemN/vaxpzUfJEejeEDYCvoDYV2VAdvnzyNoL66c8QHgmogXDHgD5DAPKYwCZtW9hdEvxINkSJT6PJOq9ANoX1P6v9EHLg0DdEY8c5UmuEIxzpfogePqX5Zg9oi5bUq27YqQbfDqMTaEV4SiIdgufMRitbPH/K766jNDfGDU1xXvO97kEXhjomG8RgsOW0qm5cuREjQyF2amP7FFGDAIIrGT57mBfAHHTcI7OU5sJO6pig8I0d0OESsBKUFw9acrz/x7y58woV5N8ZR63amno/PlU4GON+i5KaxReCjUoyVcxJb0e0OdUnGy8/OlURUzFEueFaIAemIjWnofdVfHxx1U2bpWhtwLiN8/M8kEkGZnwa7J596XMPQzeKTMDYlTnQtK6gNSqEkwL2ahU5JXIO62swu1NRS1Wgjbn94dAfj0WjgM/wwJyJpmbR/LTRaC8KbJ7r1HbKkIjz6ORwta3yQ/2726urtcoGt93h7DdkYi7odgvMgYvXI4Bf436ot7BBfIoZZERdr5YhaaofVn6dS+hxeXgytbFXxDSUQN3iKbeAcqJOqaydfMc/d/FSJ6xhXz8WSnqmMP6bhJVCULdIM/skrTw5DyXHygTOufncFvYSJAW0xFRrDwgxXoiv0y3hQndwv9G9ZZxkW3Raa5IWLRBIl7UEKlAUXvv7lRonRk53WoTby2pXVQYVXHFHtEDTXIURkzYP9JnyRewpI/Pa2/s6SiQhYC1cPf4SIFDjnmfIYMn7o6I1IeWj7qAk4hNiSzE8BAd9ld6vNZXjUvRGY3EBYueSL5BsfseYzeG+t9cDpVQohhKw53LktEwb62nvvrGiK0CimAXlPFgZKIg6U7zafT7m0qGcbFsy3QWtR/hItBYlyh4pHHm8kGeIIZVtXe1ScsFzBk/uRQYEJpJxx3NzmMuAWzKuQ66zZMZP7Dnh9yY/81L1a9L4lv9+BoDdmq+Q/maGiOS/0MnTBDLb7q/ezYs5tXi/OU/NQiKyeMq5TvzDh2u119+Q1PGE4jqGwaidSbWcl1JYw0lH9XAZwIkjLQMaYePyhyWqyomXh7T2UhbWnpn5wIOM7HZZd5VU7biy+TNOpAcqSoqCkl2GA9Z6efL09TQZbhxIJT15OFAvKktVChwzYuWZHjPkIMRtqgICgZypgdWfeXAc/hDQq1wbPaKsd4qGlhzidsGmwe0OQw/mjENHvjuWBybMDTj4v1QH5FI5KwOilvSk3ozPdIqHJpAh+8itpatQsqgqHsSBgIQii+4uWnxDJn+VzoJeyTpTnu1OlifyJGCSDSFsMeZN4EeVpePoz6osMwkZ/JZv/P4iM0UF+GNzV/v9pasfInsh+UZlEsQHFvYjk6m+QNeFUnnEJ04zPqAW4wBoCPbRS3qAKLKYyRpNefUH5uDtDyDRae31nvfUy24b1zp768kVHWbnxbglypWA42QaH1R3l05ns/eOYVnwGvz5F1yReWq/5iXr3nd8aC+wYNkJ6zWFKOwQX8yeg+iXga5c3SKxYrS5/BMpJAHjzJtQlLlr8i/FU2utz1BV74j6gMMijnUUoFv3+HnvJtN6HdgzgoM31893ZImDDsDVRsmwmYRtXIkxTpZ5OSsRnfx6xawkMX3I+zd4v44lJRMu0VccnBdm40IIAOgeeN0NdkHP2Q/Bxp/t5aAgqn2XCzLNXN20VPc1Kzz0KoeOFZq82Utfo8iU9rrh1LWA0xneZjUlzcEbdaipjYIzIgVSj9GvZ5BjrU1sBPEgkVSJEYnPnNxF6/g4JKVwm92Tk8jKAVQMzkvgSON37UTE9ctUXtyG0D0q8biE9+XgCAMDGRwj92YRIYxFLNSJLjf/e7Hi3IScLK0ETehUm3C6rFvflvuHUW1oSqbY6Ypqhgl4HlEDsClQCd/HeI5kvq67YUcp6TDjiuwuZplxYJuKbzHetcUhDucuFCsOss15ONPMSbJoCFHJZz1bw2Qf2pa0+dIu0vObKpwu7XpPtU+xx0J+nWSs/EkCMbaEFb8jzPTGrZgkOG3zlvANiUyUx7Lke+apvcpDquAWsIhIN8K77/e0xwPz7Zj9fZ/rmsinkXxsWIfPXpB6p289wJsxlKP+a7S8p92FnJSQGRVWlJrW6EFyjfTr18KPM/TUxhxRTBJ87S15W8eUW6v/51LQ6v+jkhSt+A3cizTJbe77gtGEi6OoLtDqmp2lHlP7iBtp/8HD1eGtdOh+mb2QBP7R83ho32HWEcsZGPQ+AFaLBPFqjQH397xwktZQXIzVvPO677LN3JgNL+sqxNwNGAl2cA4J0xOqdKWA/yVk31WrGXD/fonwVBF6jPg4O0jP6VuUTFQmLd3fZqI7Nafm3k2Q5WRjU36Aiyh8sTHjGYF4LtW/aW+plW2Hj+iQEwu5vZHY8EL4gbu5P5HiIDvo92B1BtItBfDlwEmFgQtFTLZdgNWYi0GzUaetsAPw/Li/7xIFDiFSjUf1tYtz92f0j3xcxv4oEVJuET5LLz9bITtK5njKLjU4VtLFuXeflvYBwd1dYvmeLSjC4BYiR2ALqR+Hr+W2I8Vuulb6K/N6O9RH6aEVuYviwy7ZsCwTglARUSagv/oMLb4hI9GVIlsQ3WplT/+vsULwt2ot5zRmY4lpjRb5DLtmO/WUGW9uXSlqzfMyvp9iHJYeaeMV6VtYW/sE4x/k8fEn/Jp8tSfd56cXttNoj8XAG5I/9cpPp6ZFl+RNpfgBgfk2/rchfpVqtftDKmq7MtLyYDFBd7gfeLVAbWKwbS+7QPNNJ8SFZF7utPd0FheH1ZljA0XnrW0ckBKGvKQO2+Z57w0e0WjzGxGnZvGydKUtjTEQ09ICFYMWVN6Q4HcNWwEdqeni6tGQAjz9gEJqREZ7ho3R7tYbu2yUgpiXx6s5UngAY11KNb+WYipodkywyULbbjqcIQL3tRMj3xYEqqm4wWCXBtBEhZl9b5LTaZQqCWrzQksHSExiWtUCi03ajG46s+8ZOo6KYbvynxteds8ui1nab0SASs6KryitlLov4V/sdzjXoQ8jyZi26VBYCmp81l5QN82hNWrN7WsZnvEMnVgZkXNHyiI0VCguYYoxex/Vbce82JoO9BRSUE8w6vQc/Vy8TFz/3cDFIDUO/OFKeeTYJkFUojLHNQYz8DX5r1TvKbsZdsBkpzAhEvBrtLhuuxDD+sARwGtIs3FM5tvTye8GWTAvh2FpmtNjPKupL6M6XN9FwHRASXZMfwsOZLt9uVnz6iMlTw5DmTQyxgWjaX7gQnt0+kYUXIiZXoe9DMU26ZrtdvT/No5JtG+RGUcSt+j7T2GKmTkVB10IPbyiyHQ6GhUi65svvA/IcNjxwBwJJox//YZR3FvpTey36W6MmDlkKc5MRHb6Vgu7RKSs56ynTEwZvn3bCKUuvp3SAs65ejdIe9exX+abB3BSvyUXNxQbIF9K3H5D00/W0FZLe9/Yh/7Tr/ikkOfHQou1LSYlLEQgJAs9DjZ9RV0nqRFZb9hGckzb5Fg9PpfmYaetKHd6HcRNxhZ4GY12B8cJs7+eximD6ppJGe5pw9dnyYxa0rPYKE+vaa64Y/F8Gi/pIkLrXSc//mn5ELMeMRftixHlF3qpZcMODcim+M/lf3ITqC+QOAg4Uw1+TF2HxcG13xTihlJrpJ9T+Ud58MjzYhHoblLNKcPeq37doLWQWW8LEli9Mc9sXQtib8hRNbGFlgW1glySmbqyqsPBX5MlRS/ordWWd5ccRdzh8Ssk22B5+IcqFsNKkKEPamKRGGcuL7qJTrpyv3jSa78+VSiFIarE1Xn9mbFejxf8nhZ2Rzv2e7Xvp9XYvMN2UQTdrW5f4VrXOQY1YvH55gIJUcTa58XxqKd6sqo+WeoCbxUChc/upE4p9o7dDwCtN9pAPXUzAcLboYzTSd3xSHSpSqAwdAvLRXn9/LbsTPObyFKg1izvuhhYRiHJAydpFj900NqlVXeFt+L/EKcTi3O+t5qvsGPwOoUbqJIm7bd++JglaUuJVp5VP5MjpHoAMdc+HJd9n6LETMv3NOVDha191oGuoYdFRLIYDuQ2rSGO8iTgwx+0huXpBFERDlimWE3loHMLsuqoNkwLVGVWKbnC4JlbsKGKPYj0QKgfjXJ09qPfYrsnECZSw5QEcMhw56X2BcaPBHtCDiJM9gSiZKdJifJ8Felg4Glu/FEoU9xoKYwqfXhs0hVzKh3e8KLWV8hGrjYNhnuTVCR90WK2opQs6FJIZYI8fesJFQgTQqZemb7OaSWzLtmp6D4BE+v8Uwuw6EPxu0RBvIkqX43vPJifvQiOjbZPqHGR2RkSSRylUtVbMnweFKjU9CridFFiLmIYCrYylP8KoCDH9JS/IYj0qI20n7A9OSxIBsZVrTcbemdJDseLUvMRz1UChfqFdoDY3FSqpVAsyN24Qebm7QQRWW9Tp+uXAL2UicLIqZ3elUHWeTT9MnNwD46s5ynmZpJ9s5yEQUXnpJYQQ708GjihManCUtM+rPNfQtUkBsDJdIwz7xPd+DeKWL9ltbZBrKJgvjWg3YPjuBF/N8f5n0OSEYKigCawWfRKiU3XAdBQ/54V2URmBVvy02cla3hensjbu3tYGyGBudp50DvvxtTIwr2kcjAG5EPmlxJtpRhQT22xUQfWEb5v+8cBqjhy/8zmcZfcFPrIn48mww61qK1FQcTggBCidGdZyMLyUOZkAnv9ds2ygU3V1xVVj+349vquHg/Jsl5973vlfI64vh9CJ33Q/SRoHrpgjdmr/VRf5otw7/5kWMaN6Ww116Ve9sS2NDfu5jSlqJNiimTN+ehRfagYUy69PzgURAbTYtWUQq2pLz029eBHPoXV0hEmBtYgLehx65C97B43IFnpw6GnKUtJfOjavW7CqmBPfmMkX77Y84Jm7mulOSAkJfEsW/dRpD6mbaIWWIvNwmMzC8tqG4V+lCTvSGEe/5OZ4tXRFUK6gHlwMf4raR8yX0+/6ac63AwtzgJYKe4vmeMuttroZTfcgwkFawGvlohotCxTEttQwUCFJoe/WIvHo02lLfUAcMxCpMHwphAo3RXHSu7LIspOXJzvue9KgHMIFUV9+BRudfjrrFTqY/xB/+Jzvg61YMEwb+frnplOHtw2Od1kIhN4/tZ81KP1wpDf3xuXQli4ON49BncCOPXbPoYLoPlbsr+JKh4ikx5je3Mmh3bIuShC6g53v5tUqg3lCN21sQ13rE4M4rv3+Fx5JTxMGOvnvS+MScMiu70vPjvbTAoiLKDf5XXANtJeRfe+MYTgXR4KILsdzvvzIIiBfX//Wuo+GYV1lr7sdAfhoMIP1RJh22U0dqLwWW8VI+VPQ0fwc4jYzJHk68YchJBJHvdCfCRbI4lP885nSUk0tJpDDsemLXTKXvtaN6II3Ynbzz+Wvbm4nDnYdbqYpf0Jx9RGJFS/4ZG7HXYC/xaQXDLNdGD2ktT2kgPUk1HTb4qRcwjXQ2zjHOquWjtuFfnXbofFt1IlFsrDJSn+pMM+CHM2Yl1mAc+Fsh2QfU1Rnpcefp2vWeZsJzwkR1lyDPQkfNsYVezYhahdtpOhoiNPpWKYRx02jr214LrVUaQc+fZL+MmAlAPUw6oUF3Kt0G6gW2n9DO0WqYQLkdJf254F0tjBmsW6IDwqATU/4KVbNS8upBRa4onbVh8R3YbREoDrPY/COvkcwOWrbINGGnpS/3gd6HljyRNrZ+RPX+y/5hcdqgw32KTekGvrQuZDJdQdHeCfOCNTlZt5dU6Z7Q+jZFIsSgQ+2srT43LRTKolfQ06jTOQVkXvX4KIkQhNWJmeYs6jKMdmG9pDBUdme0vc3iL9Pf/Aa1CrC8IoIlQa5SkvJ+438JGX9IhmWtt0nTGqLbRpTZ6HcgKVxN5/o1a2S9S/Q6rN99zZ8Evvx7A015tcm8Ivy2tWt6qWjR7GIc7VC9M0VzCMZX3VzF89bpn9Sh8WENAIz9fOUxvHDFd8wUmxBXbo5uGpnLwk/eG/4c2D6GXU5d81HKGVIoBW6UjFKtPYQkk3whW0pmyNrNMLp9U1xfiOhvPB+S5hoAOyiRz7cizPIwKdZCvxC5AIA/B9qvGp11BSA76MJepaBYKvkdupawIPYGbnNbWvvPpwcb8i+qshkpmiWPfy15Q21oBau/TLPjBFw/ggoq2LKKMu9G/pZ0/KXyAP20CL6J9ljHBmNZnzmOCd99J6adpC+JBq4oxL0MS9bw8UUlsYixqUGXvKS9qg7rjWna2ERilWK2rOF8407YR7YHEeBMS0XjOVDDiagKVW2SrrdhW6G2U0BeYsP2Oyjn5pgx0JQ7Axyp89cBO9h8GzTo2JCQNmdfVFhgmppkZ+gvdJ1S4tAgL5ZLvTdDB5YXSEvb4ftHT82owfOgUnGoWAWxwZaLXLdCIAB4ESlEfZkUBEyienjDI2VCHDu+p/dNpa/Ve1vhKdLCBADGDcsGAcRia5kS4+cf1MhmzcluDd7PCILnCodqdW3W445Nm3G+OwoBOzrrBEnIBK5v+lOHycVxkiGJJGb5+YyprmaUnkMXr1WXCu70MPC+6OxmnoyKJfv0s7xr4iZbJC+COOobAhM2AByfPj+7XbKlSz3BwbjEtfxZa42oz0f8fQtAI+vr3t1TbGFEhElQYIVzisGj7nhbd4cPdxvj50005AAOIoAAAun/G/spb3sCEzet4J3JS1wYUSTrgUSERVcREb4zNY5EPsLR3F9cg57OKvtCzFdbt7BgDeSFZvNCWKc21wUjyR9JUDwotDLFhQsvP4s85uatUKknstbFUtTuMUCSS7fg/y7L/JzSsopOaOLEBdpvMp48gVOL8/0IoXj64xgkBABqYHpxU9CGd6WLIzEO4weLAQ4FzQ4kaHcU0AsZ/f5rSKR9Q+62Ej9vrS8GL3rH9C/JjV8xaiCxsBNofqr15CWUilrYkp9ZnN9q77kAx+G8++8dMS7gsz0JfKhuqiqzpvVEcK66o/gABO4l6mXaBddX5YuC3fxZp5A9c39hQPvW2NOIM6JQf/8ViajQSQS1BfMkwXHMG95qQSYjw6/p47qBxEcowSTe23BaGhTzNQEWEDFQ+ow2auhgBvfnSzZY1nKJBjfCLZTA1Weu5G8yXuCeAvGjKDLS672StnNu4SEE1IQoFJkEF9NKV9f5AoX1hj5U+UqDwlc39zvMEZ9OeoHR9m+GQBukGOk1BTROW8mzorIlozy/QkVqQwGAGmvvWAhixdI6FG3Fu7+uFAu4CBpBzU+sCc2gccGdRpjA0UgBdFjEpTAos+Dni9U7WL2wsj8ygCF6dybx3syKEs13yttt7WQ+Bm383GQFqWLVZQ8SGHcCe/N45bk6UfiBfnmZqEpSSYgyBFLESlHKVI4M0jBH4rbPvaxvWbfevMwvwuz+QlKMifDJqGpBRwS2jlBzSxeVmpVDJ9S4c6SJIYVIe50gwptHQ4Snq1nKHAhpxQqdmWMcxQGMXsuEYcTiotVthpCkpOVboLRo2f5r00MTi9SeHtNuPxxKfq1gpX9CHA8wKsjkqTB2asxDTqGgFVwh5Vwh5SEa42fJvtOjbq8cfyk2++a32Sm03Keyqi3ArbH6rwvVspCEzxPCxpjiwIiwlkVANZe2RJX0hSzHiy2kanCWGk8RIrmsqmRQQkX3XgKLgjP9pfoyUTMKfjtUAgtKei3xq6Ciqe4qZrEA6wC85M4EhqIczhUWR3z1DLDYQOcgCYEWyRtb6bWBWaylWCsuiqw7k2lx4bx/s5ywCRqqQxV3YEr73pjRBdQMrubr3v6nMuXP1tffI6apBxVc0w5JF2EWesttvj0mRfOa1nN3AAAAAAAAAAB2G2a6XlJ1rWDn6PYrd6vL7BFed3vallI8OLQItL3YdzpVMIJkMw3eaCVrYEzLTt8eckn9jctBFDYKXmA7jkmiSjXQAAAy7+zI3f6IwCu8IcbVjgFg4JziXuvtlo9dfcPR7DYrVGKyJ+erG4amFb5Rf/P9ZcUBy5I1GXJznXfEBlTmnvH6EOYI1R51aQzqkz6UPBShVHusHKNeZ+pad4Br6vbG6y0oV0XJY7hJh4UlavhZ3//IP2vN0E6dl1d//bGMCD1JMYIL/SGtHb20MSUSk9B8rOlsq+WlMkFLtqDGRk78wfxhlRy8Mtrv7Og+JvgAAJa4pMQVLGki6j+KW0IwVusoQYqU0tHW4bH+zEm1FR/Fnf5hrGJHDr0b+S2S76saiEz3juV2O3+5ZnUqBDWVK9rHxTzvzrh6Vy01VT2h8LOerzrammgt7cEK7NMzK43+MNXmtaoNUkjcet6gK7zaA2ZopVxp+WxTcbLJijjHjDIS1WTxWbgA3PaGwpW+mYVWEESDQPZDzAMScPUNavG4U5TfvMVxMPBVVYrRXaJIr1Wqcz4MLG9XsG3KjwAAAeWeC6ssGhHIx1ZaLHO/hWfPHf/EAm3T2Ydq4S0YcGmQw4FSu0TI9gf4AAPHv6/u/fbnooDiNBGKTFVx0HvUgJq7o2re1h3X8gnQoUyXQd3c0U/1YAAGxMb9o30+xFYxpOc65if9mVex15E1/xmDrviBcASc7Nt7TpZKZiAAAAAbidzCMH1kxO6Y//uS6flpDuM4hAh8s2BkOoJ2ToV3AYwQX8whPolxeVjRAaiyAAAAitdMGo9RtRqPIMIS9IHi25SnhF2pS5ppJX2AAAAAAAAAAAAAA=",
  "tc90-dekplan": "data:image/webp;base64,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",
  "tc90-interieur": "data:image/webp;base64,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",
  // Hull only (from tc90-zijaanzicht, no sails), transparent background for the dark screens.
  "tc90-romp": "data:image/webp;base64,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",
};

const svgNS = "http://www.w3.org/2000/svg";
const isOn = (stateObj, onStates) =>
  !!stateObj &&
  (onStates ? [].concat(onStates).map(String).includes(stateObj.state) : ON_STATES.includes(stateObj.state));
const unavailable = (stateObj) => !stateObj || stateObj.state === "unavailable";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// `factor` converts raw values, e.g. 0.00001 for a Wago level of 7894954 → 78.9 %.
// Only whole numeric states: "026 Jetvalve 3 …" is text, not 26.
const num = (stateObj, factor = 1) => {
  const s = String(stateObj?.state ?? "").trim();
  return s !== "" && isFinite(Number(s)) ? Number(s) * factor : null;
};
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
// First matching entry of `colors` ({above, below, state, entity, color}); an entry without conditions is the default.
// An entry with its own `entity` tests that entity instead (e.g. grey while the pump has no pressure).
const colorOf = (hass, so, val, list) => {
  for (const c of list) {
    const o = c.entity ? hass.states[c.entity] : so;
    const v = c.entity ? num(o) : val;
    if (c.state != null && ![].concat(c.state).map(String).includes(o?.state)) continue;
    if (c.above != null && !(v != null && v > c.above)) continue;
    if (c.below != null && !(v != null && v < c.below)) continue;
    return c.color;
  }
  return null;
};
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
// True when one of these views is open (in demo/plc.html: ?view=<path>).
const isHere = (paths) => {
  const view = new URLSearchParams(location.search).get("view");
  return [].concat(paths || []).some((p) => p && (location.pathname === viewPath(p) || view === p));
};
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
    this._syncTheme();
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
    // HA keeps views it has shown and hangs the same card back in: take over a theme chosen on another page meanwhile.
    this._syncTheme();
    if (this._config?.kiosk && !this._kiosk) setTimeout(() => this.isConnected && !this._kiosk && this._kioskOn());
    if (!this._onTcTheme) {
      this._onTcTheme = (e) => this._tc && this._applyTheme(e.detail);
      this._onStorage = (e) => e.key === TC_THEME_KEY && this._syncTheme(); // another window or tab of HA
      window.addEventListener("shipborn-tc-theme", this._onTcTheme);
      window.addEventListener("storage", this._onStorage);
    }
  }

  disconnectedCallback() {
    this._ro?.disconnect();
    this._ro = null;
    this._kioskOff();
    window.removeEventListener("shipborn-tc-theme", this._onTcTheme);
    window.removeEventListener("storage", this._onStorage);
    this._onTcTheme = this._onStorage = null;
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
    const page = document.createElement("style");
    this._paintPage = (bg) => {
      page.textContent = `:host { --lovelace-background: ${bg} !important; --primary-background-color: ${bg} !important; }
      #view, hui-view-container, hui-view, hui-view-background { background: ${bg} !important; }`;
    };
    this._paintPage(this._tc ? TC_THEMES[this._theme].bg : this._config.page_background ?? this._config.background ?? "#1b1b1b");
    root.shadowRoot.appendChild(page);
    const styles = css.map(([sr, text]) => {
      const s = document.createElement("style");
      s.textContent = text;
      return [sr, s];
    });
    const delay = this._config.kiosk_delay ?? 800;
    let timer;
    const hidden = () => styles[0][1].isConnected;
    // The space HA keeps for the (hidden) sidebar differs between HA versions, so it is undone by measuring:
    // zero left margins and paddings, then pull the element that still adds an offset back to the left edge
    // and hide whatever still covers that edge. show() puts everything back.
    const flat = [];
    const up = (el) => el.parentElement || el.getRootNode().host || null;
    const within = (anc, el) => {
      for (; el; el = up(el)) if (el === anc) return true;
      return false;
    };
    const set = (el, prop, value) => {
      flat.push([el, prop, el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)]);
      el.style.setProperty(prop, value, "important");
    };
    const flatten = () => {
      for (let el = up(this); el && el !== document.documentElement; el = up(el)) {
        const cs = getComputedStyle(el);
        for (const prop of ["margin-left", "padding-left", "margin-inline-start", "padding-inline-start"])
          if (parseFloat(cs.getPropertyValue(prop)) > 0) set(el, prop, "0px");
      }
      for (let i = 0; i < 6 && this.getBoundingClientRect().left > 0.5; i++) {
        // The outermost ancestor that is still off the left edge (its parent is not) adds the offset.
        let a = null;
        for (let el = up(this); el && el !== document.documentElement; el = up(el)) {
          const r = el.getBoundingClientRect();
          if (r.width && r.left > 0.5) a = el;
        }
        if (!a) break;
        const d = a.getBoundingClientRect().left;
        const w = a.getBoundingClientRect().width;
        set(a, "margin-left", `${parseFloat(getComputedStyle(a).marginLeft) - d}px`);
        if (a.getBoundingClientRect().width < w + d - 0.5) set(a, "width", `${w + d}px`);
      }
      // A narrow strip (a sidebar or its empty panel) still drawn over the left edge of the card: hide it.
      // Wide things (a dialog, its scrim) are left alone.
      const y = innerHeight / 2;
      let el = document.elementFromPoint(20, y);
      for (let inner; el?.shadowRoot && (inner = el.shadowRoot.elementFromPoint(20, y)) && inner !== el; ) el = inner;
      if (el && !within(this, el) && el !== document.body && el !== document.documentElement) {
        while (up(el) && !within(up(el), this) && up(el).getBoundingClientRect().width < innerWidth / 3) el = up(el);
        const r = el.getBoundingClientRect();
        if (r.left < 1 && r.width < innerWidth / 3) set(el, "display", "none");
      }
    };
    const unflatten = () => {
      for (const [el, prop, value, prio] of flat.splice(0).reverse()) {
        if (value) el.style.setProperty(prop, value, prio);
        else el.style.removeProperty(prop);
      }
    };
    const hide = () => {
      for (const [sr, s] of styles) sr.appendChild(s);
      for (const z of zones) z.style.pointerEvents = "auto";
      flatten();
    };
    // Again whenever the card changes size (_fit): on opening the view the layout is often not final yet.
    this._kioskFlatten = () => hidden() && flatten();
    const show = () => {
      unflatten();
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
      this._paintPage = null;
      this._kioskFlatten = null;
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
    this._images = []; // image items so far; a zoomable zone zooms the drawing it lies on

    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const root = this.shadowRoot;
    this._tc = c.design === "tc90";
    this._themeHooks = [];
    this._docks = [];
    root.innerHTML = `<style>${STYLE}${this._tc ? TC_STYLE : ""}</style>`;
    this._outer = h("div", "outer");
    this._panel = h("div", "panel" + (this._tc ? " tc" : ""), { width: W + "px", height: H + "px" });
    if (this._tc) {
      this._theme = TC_THEMES[tcStoredTheme()] ? tcStoredTheme() : TC_THEMES[c.theme] ? c.theme : "nacht";
      this._panel.dataset.tcTheme = this._theme;
    }
    this._outer.appendChild(this._panel);
    root.appendChild(this._outer);

    if (c.fonts !== false && (this._tc || c.items.some((i) => DESIGN_TYPES.includes(i.type)))) ensureFonts();
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
    this._scale = s; // popups (zone) open at the same scale
    this._panel.style.transform = `scale(${s})`;
    this._panel.style.left = `${Math.max(0, (w - this._W * s) / 2)}px`;
    this._outer.style.height = `${this._H * s}px`;
    this._kioskFlatten?.();
    if (this._docks.length) {
      const r = this._outer.getBoundingClientRect();
      for (const [dock, dh] of this._docks) {
        Object.assign(dock.style, { left: r.left + "px", width: r.width + "px", height: dh * s + "px" });
        Object.assign(dock.firstChild.style, { transform: `scale(${s})`, marginLeft: this._panel.style.left });
      }
    }
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
        this._images?.push(item);
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
      case "zone": return this._dZone(item);
      case "statusbar": return this._tStatusbar(item);
      case "alarmbar": return this._tAlarmbar(item);
      case "navbar": return this._tNavbar(item);
      case "tile": return this._tTile(item);
      case "switch": return this._tSwitch(item);
      case "hotspot": return this._tHotspot(item);
      case "dial": return this._tDial(item);
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
      <path d="${arcD}" fill="none" style="stroke:var(--line, #2a2a2a)" stroke-width="14" pathLength="1000"/>
      <path class="arc" d="${arcD}" fill="none" stroke="${base}" stroke-width="14" pathLength="1000" stroke-dasharray="0 2000"/>
      <line class="ndl" x1="100" y1="100" x2="100" y2="34" style="stroke:var(--ink, #ecebe6)" stroke-width="3" stroke-linecap="round"/>
      <circle cx="100" cy="100" r="6" style="fill:var(--ink, #ecebe6)"/>
      <g style="fill:var(--ink-muted, #8f8e88)" font-size="10" text-anchor="middle" font-family="JetBrains Mono, monospace">
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
      const head = h("div", "d-ph", { fontSize: "15px", letterSpacing: ".08em", color: "var(--ink, #cfcec8)", whiteSpace: "normal", lineHeight: "1.1", minHeight: "36px" });
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
    if (tile) Object.assign(n.style, { padding: "12px 16px", background: "var(--surface-raised, #121212)", boxSizing: "border-box" });
    const l = h("span", tile ? "d-lbl" : null, tile ? {} : { fontSize: (item.font_size || 17) + "px", color: "var(--ink, #cfcec8)" });
    l.textContent = item.label ?? "";
    const v = h(
      "span",
      tile ? "d-num" : "d-valbox",
      tile ? { fontSize: (item.value_size || 30) + "px", whiteSpace: "nowrap" } : { width: (item.box_width || 110) + "px" }
    );
    n.append(l, v);
    if (item.entity) n.addEventListener("click", () => this._handleAction(item, item.tap_action || { action: "more-info" }, n));
    this._updaters.push((hass) => {
      const so = item.entity ? hass.states[item.entity] : null;
      const val = num(so, item.factor);
      const unit = unitOf(item, so);
      const txt = val == null && so && !unavailable(so) ? so.state : fmt(val, item.decimals ?? 1, hass);
      v.textContent = unit ? `${txt} ${unit}` : txt;
      if (item.colors) v.style.color = !so || unavailable(so) ? "" : color(colorOf(hass, so, val, item.colors), "");
    });
    return n;
  }

  // LED with text. With active_above / active_below the LED follows a numeric limit;
  // off_color lights it in that colour while not active (red cross on a checklist).
  _dIndicator(item) {
    const n = this._place(h("div", "d d-row"), item, null, null);
    Object.assign(n.style, { justifyContent: "flex-start", fontSize: (item.font_size || 17) + "px", color: "var(--ink, #cfcec8)", whiteSpace: "nowrap" });
    const s = item.led_size || 14;
    let led;
    if (item.off_color || item.active_above != null || item.active_below != null) {
      led = h("span", "d-led" + (item.blink ? " blink" : ""));
      const cfg = { active_above: item.active_above, active_below: item.active_below, active_state: item.state_on, active_abs: item.active_abs };
      this._updaters.push((hass) => {
        const on = !!item.entity && activeOf(hass, item.entity, cfg);
        const lit = on || (!!item.off_color && !!hass.states[item.entity]);
        led.classList.toggle("on", lit);
        led.style.setProperty("--c", on ? color(item.color || item.led, DESIGN_COLORS.green) : color(item.off_color, DESIGN_COLORS.red));
      });
    } else led = this._dLed(item.entity, item.color || item.led, item.state_on, item.blink);
    Object.assign(led.style, { width: s + "px", height: s + "px" });
    n.append(led, item.label ?? "");
    // show_state: the word AAN/UIT on the right, so the status never depends on colour alone.
    if (item.show_state) {
      const w = h("span", "tc-ind-state");
      n.appendChild(w);
      this._updaters.push((hass) => {
        const on = !!item.entity && activeOf(hass, item.entity, { active_above: item.active_above, active_below: item.active_below, active_state: item.state_on, active_abs: item.active_abs });
        w.textContent = on ? item.text_on || "AAN" : item.text_off || "UIT";
        w.classList.toggle("on", on);
      });
    }
    if (item.tap_action) {
      n.style.cursor = "pointer";
      n.addEventListener("click", () => this._handleAction(item, item.tap_action, n));
    }
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

  // ---------- TC90 JOAL design items ----------

  // Switches every TC90 card on the page (and later pages, via localStorage) to theme t.
  _setTheme(t) {
    try {
      localStorage.setItem(TC_THEME_KEY, t);
    } catch (e) {
      // private window: only this page changes
    }
    window.dispatchEvent(new CustomEvent("shipborn-tc-theme", { detail: t }));
  }

  // Follows the stored theme: on (re)connect and on every hass update, however HA reuses or rebuilds this view.
  _syncTheme() {
    if (!this._tc) return;
    const t = tcStoredTheme();
    if (TC_THEMES[t] && t !== this._theme) this._applyTheme(t);
  }

  _applyTheme(t) {
    this._theme = TC_THEMES[t] ? t : "nacht";
    this._panel.dataset.tcTheme = this._theme;
    for (const [dock] of this._docks) dock.dataset.tcTheme = this._theme;
    this._paintPage?.(TC_THEMES[this._theme].bg);
    for (const f of this._themeHooks) f();
  }

  // Status or icon bar fixed to the top or bottom of the screen, so it stays in view on long pages (sized in _fit).
  // With dock: false on the card (layout editor) it stays in the panel instead.
  _dockIt(node, where, height) {
    if (this._config.dock === false) return this._place(node, { x: 0, y: where === "top" ? 0 : this._H - height }, this._W, height);
    const dock = h("div", `tc tc-dock tc-dock-${where}`);
    dock.dataset.tcTheme = this._theme;
    dock.appendChild(node);
    this._outer.appendChild(dock);
    this._docks.push([dock, height]);
    return null;
  }

  // Top bar: logo, page title, status icons (lit in their tone while the entity is on), clock and theme button.
  _tStatusbar(s) {
    const n = h("div", "tc-statusbar", { width: this._W + "px", height: "56px" });
    const ident = h("div", "tc-sb-ident");
    const logo = h("img", "tc-img tc-sb-logo");
    logo.src = IMAGES[s.logo || "shipborn-joal"] || s.logo;
    logo.alt = "Shipborn JOAL";
    logo.title = `Shipborn Panel Card v${VERSION}`; // which card version HA loaded, without the console
    ident.appendChild(logo);
    const title = h("div", "tc-sb-title title");
    title.textContent = s.title ?? "";
    // tabs: switch between the sub-pages of a destination (e.g. Zeewater | Zoetwater | Vuilwater) instead of the title.
    if (s.tabs) {
      title.className = "tc-sb-tabs";
      title.textContent = "";
      for (const t of s.tabs) {
        const b = h("button", "tc-sb-tab label");
        b.type = "button";
        b.textContent = t.label;
        b.addEventListener("click", () => this._handleAction(t, { action: "navigate", navigation_path: t.path }, b));
        title.appendChild(b);
        this._updaters.push(() => b.classList.toggle("is-active", isHere([t.path, ...[].concat(t.match || [])])));
      }
    }
    const right = h("div", "tc-sb-right");
    for (const st of s.status || []) {
      const el = h("span", "tc-sb-stat");
      el.title = st.label || "";
      el.innerHTML = tcIcon(st.icon, 20);
      const val = st.value ? h("span", "tc-sb-statval") : null;
      if (val) el.appendChild(val);
      right.appendChild(el);
      if (st.entity) el.addEventListener("click", () => this._handleAction(st, st.tap_action || { action: "more-info" }, el));
      this._updaters.push((hass) => {
        const so = hass.states[st.entity];
        const v = num(so, st.factor);
        if (val) val.textContent = fmt(v, st.decimals ?? 0, hass) + (st.unit ?? "");
        const tone = st.value ? toneOf(hass, st, v) : isOn(so, st.state_on) ? st.tone || "ok" : null;
        el.className = "tc-sb-stat" + (tone ? " tc-tone-" + tone : "");
      });
    }
    if (s.clock !== false) {
      const t = h("span", "tc-sb-time mono");
      right.appendChild(t);
      const tick = () => {
        const d = new Date();
        t.textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
      };
      tick();
      this._updaters.push(tick);
    }
    if (s.theme_toggle !== false) {
      const b = h("button", "tc-sb-theme");
      b.type = "button";
      const paint = () => {
        b.innerHTML = tcIcon(this._theme === "dag" ? "zon" : "maan", 22);
        b.title = b.ariaLabel = "Thema: " + TC_THEME_NAMES[this._theme];
      };
      paint();
      this._themeHooks.push(paint);
      b.addEventListener("click", () => this._setTheme(TC_THEME_ORDER[(TC_THEME_ORDER.indexOf(this._theme) + 1) % TC_THEME_ORDER.length]));
      right.appendChild(b);
    }
    n.append(ident, title, right);
    return this._dockIt(n, "top", 56);
  }

  // Alarm bar: "Geen actieve alarmen" or the newest alarm on a blinking alarm surface, +N MEER; tap = alarm page.
  _tAlarmbar(a) {
    const n = this._place(h("button", "tc-alarmbar"), { x: 0, ...a }, this._W, 40);
    n.type = "button";
    n.addEventListener("click", () => this._handleAction(a, a.tap_action || { action: "navigate", navigation_path: "alarms" }, n));
    let shown = null;
    this._updaters.push((hass) => {
      const so = hass.states[a.entity];
      const v = a.attribute ? so?.attributes?.[a.attribute] : so?.state;
      const list = Array.isArray(v) ? v : v == null || v === "" || ["0", "off", "unknown", "unavailable"].includes(String(v)) ? [] : [v];
      const key = JSON.stringify([list, so?.last_changed]);
      if (key === shown) return;
      shown = key;
      if (!list.length) {
        n.className = "item tc-alarmbar tc-alarmbar-none";
        n.innerHTML = tcIcon("vink", 20) + '<span class="label"></span>';
        n.lastChild.textContent = a.empty_text || "Geen actieve alarmen";
        return;
      }
      n.className = "item tc-alarmbar tc-alarmbar-alarm" + (a.blink === false ? "" : " tc-blink");
      n.innerHTML =
        tcIcon("alarm", 22) + '<span class="tc-ab-time mono"></span><span class="tc-ab-text label"></span>' +
        (list.length > 1 ? '<span class="caption"></span>' : "") + tcIcon("pijl", 22);
      n.querySelector(".tc-ab-time").textContent = so?.last_changed ? stamp(so.last_changed).slice(11, 16) : "";
      n.querySelector(".tc-ab-text").textContent = String(list[0]);
      if (list.length > 1) n.querySelector(".caption").textContent = `+${list.length - 1} MEER`;
    });
    return n;
  }

  // Icon navigation at the bottom; the item whose path matches the URL (or `active`) is highlighted, with an alarm badge.
  _tNavbar(nv) {
    const n = h("nav", "tc-navbar", { width: this._W + "px", height: "88px" });
    const items = (nv.items || []).map((it) => {
      const b = h("button", "tc-nav-item");
      b.type = "button";
      b.innerHTML = `<span class="tc-nav-icon">${tcIcon(it.icon, 30)}</span><span class="nav"></span>`;
      b.lastChild.textContent = it.label;
      const badge = it.badge_entity ? h("span", "tc-nav-badge") : null;
      if (badge) b.firstChild.appendChild(badge);
      if (it.path) b.addEventListener("click", () => this._handleAction(it, { action: "navigate", navigation_path: it.path }, b));
      else b.disabled = true;
      n.appendChild(b);
      return [it, b, badge];
    });
    this._updaters.push((hass) => {
      for (const [it, b, badge] of items) {
        b.classList.toggle("is-active", nv.active ? nv.active === it.label : isHere([it.path, ...[].concat(it.match || [])]));
        if (!badge) continue;
        const so = hass.states[it.badge_entity];
        const v = it.badge_attribute ? so?.attributes?.[it.badge_attribute] : num(so);
        const count = Array.isArray(v) ? v.length : Number(v) || 0;
        badge.textContent = count;
        badge.style.display = count ? "" : "none";
      }
    });
    return this._dockIt(n, "bottom", 88);
  }

  // Measured value with label, unit and a line below (sub / sub_entity); warn/alarm colours with a triangle.
  _tTile(t) {
    const act = t.tap_action || (t.entity ? { action: "more-info" } : null);
    const click = act && act.action !== "none";
    const n = this._place(h(click ? "button" : "div", "tc-tile"), t, 200, t.size === "lg" ? 152 : 112);
    n.innerHTML =
      `<div class="tc-tile-head">${t.icon ? tcIcon(t.icon, 22) : ""}<span class="caption"></span><span class="tc-tile-flag"></span></div>` +
      `<div class="tc-tile-val"><span class="${t.size === "lg" ? "value-lg" : "value-md"}"></span><span class="tc-unit caption"></span></div>` +
      (t.sub != null || t.sub_entity ? '<div class="tc-tile-sub label"></div>' : "");
    n.querySelector(".tc-tile-head .caption").textContent = t.label ?? "";
    const flag = n.querySelector(".tc-tile-flag");
    const [val, unit] = n.querySelector(".tc-tile-val").children;
    const sub = n.querySelector(".tc-tile-sub");
    if (click) {
      n.type = "button";
      n.addEventListener("click", () => this._handleAction(t, act, n));
    }
    this._updaters.push((hass) => {
      const so = t.entity ? hass.states[t.entity] : null;
      const v = num(so, t.factor);
      val.textContent = v == null ? (so && !unavailable(so) ? tcWord(so.state, t) : "—") : fmt(v, t.decimals ?? (Math.abs(v) < 10 && v % 1 ? 1 : 0), hass);
      unit.textContent = v == null ? "" : unitOf(t, so);
      if (sub && t.sub_entity) {
        const s2 = hass.states[t.sub_entity];
        const v2 = num(s2, t.sub_factor);
        const u2 = t.sub_unit ?? s2?.attributes?.unit_of_measurement ?? "";
        sub.textContent = `${t.sub ? t.sub + " " : ""}${v2 == null ? (s2 ? tcWord(s2.state) : "—") : fmt(v2, t.sub_decimals ?? 0, hass)}${u2 && v2 != null ? " " + u2 : ""}`;
      } else if (sub) sub.textContent = t.sub;
      const tone = toneOf(hass, t, v);
      n.classList.toggle("tc-tone-warn", tone === "warn");
      n.classList.toggle("tc-tone-alarm", tone === "alarm");
      flag.innerHTML = tone ? tcIcon("alarm", 18) : "";
    });
    return n;
  }

  // Switch tile: AAN/UIT from state_entity (or entity); BEZIG after a tap until the state changes; STORING while fault_entity is on.
  _tSwitch(s) {
    const n = this._place(h("button", "tc-switch"), s, 136, 136);
    n.type = "button";
    n.innerHTML = '<span class="ic"></span><span class="tc-switch-label label"></span><span class="tc-switch-state caption"></span>';
    const [ic, lbl, word] = n.children;
    lbl.textContent = s.label ?? "";
    const stEnt = s.state_entity || s.entity;
    let busy = 0;
    let last = null;
    let drawn = null;
    n.addEventListener("click", async () => {
      const before = this._hass?.states[stEnt]?.state;
      if ((await this._handleAction(s, s.tap_action || { action: "toggle" }, n)) === false) return;
      if (this._hass?.states[stEnt]?.state !== before) return; // feedback already arrived
      busy = Date.now();
      this.hass = this._hass;
    });
    this._updaters.push((hass) => {
      const so = hass.states[stEnt];
      if (so?.state !== last) {
        if (last !== null) busy = 0;
        last = so?.state;
      }
      if (busy && Date.now() - busy > 10000) busy = 0;
      const on = activeOf(hass, stEnt, s, "on");
      const st = s.fault_entity && activeOf(hass, s.fault_entity) ? "fault" : busy ? "busy" : on ? "on" : "off";
      n.className = "item tc-switch is-" + st;
      n.disabled = !!s.entity && unavailable(hass.states[s.entity]);
      if (drawn !== st) ic.innerHTML = tcIcon(st === "fault" ? "alarm" : s.icon || "aan", s.icon_size || 40);
      drawn = st;
      word.textContent = { on: s.text_on || "AAN", off: s.text_off || "UIT", busy: "BEZIG", fault: "STORING" }[st];
    });
    return n;
  }

  // Point on the ship drawing (x/y = the point) with a pill: icon, label, value; warn/alarm limits, active = accent.
  _tHotspot(p) {
    const n = this._place(h("button", "tc-hotspot" + (p.side === "left" ? " is-left" : "")), p, null, null);
    n.type = "button";
    n.innerHTML = '<span class="tc-hs-dot"></span><span class="tc-hs-pill"><span class="ic"></span><span class="label"></span><span class="tc-hs-val"></span></span>';
    const [ic, lbl, val] = n.lastChild.children;
    lbl.textContent = p.label ?? "";
    const act = p.tap_action || (p.entity ? { action: "more-info" } : null);
    if (act) n.addEventListener("click", () => this._handleAction(p, act, n));
    let drawn = null;
    this._updaters.push((hass) => {
      const so = p.entity ? hass.states[p.entity] : null;
      const v = num(so, p.factor);
      const unit = unitOf(p, so);
      val.textContent = !p.entity ? "" : v == null ? (so ? tcWord(so.state, p) : "—") : fmt(v, p.decimals ?? 0, hass) + (unit ? " " + unit : "");
      const tone = p.alarm_entity && activeOf(hass, p.alarm_entity) ? "alarm" : toneOf(hass, p, v);
      n.classList.toggle("tc-tone-warn", tone === "warn");
      n.classList.toggle("tc-tone-alarm", tone === "alarm");
      n.classList.toggle("is-active", !!p.active_entity && activeOf(hass, p.active_entity, p));
      const icon = tone === "alarm" ? "alarm" : p.icon;
      if (icon !== drawn) ic.innerHTML = icon ? tcIcon(icon, 18) : "";
      drawn = icon;
    });
    return n;
  }

  // 270° dial for rpm or temperature; from zero when min < 0; thin warn zone above warn_above.
  _tDial(g) {
    const W = g.width || 220;
    const n = this._place(h("div", "tc-gauge"), g, W, null);
    n.style.height = "";
    const min = g.min ?? 0;
    const max = g.max ?? 100;
    const A0 = Math.PI * 0.75;
    const span = Math.PI * 1.5;
    const ang = (v) => A0 + span * clamp((v - min) / (max - min || 1), 0, 1);
    const arc = (a0, a1) => {
      const p = (a) => `${(100 + 80 * Math.cos(a)).toFixed(2)} ${(100 + 80 * Math.sin(a)).toFixed(2)}`;
      return `M${p(a0)}A80 80 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`;
    };
    const k = W / 220;
    n.innerHTML =
      `<svg viewBox="0 0 200 170"><path class="tc-g-track" d="${arc(A0, A0 + span)}"/>` +
      (g.warn_above != null ? `<path class="tc-g-zone" d="${arc(ang(g.warn_above), A0 + span)}"/>` : "") +
      `<path class="tc-g-val" d=""/></svg>` +
      `<div class="tc-gauge-center" style="top:${74 * k}px"><span class="value-lg" style="font-size:${36 * k}px"></span><span class="caption tc-unit"></span></div>` +
      `<div class="tc-gauge-label label" style="margin-top:${-12 * k}px"><span class="fl"></span><span></span></div>` +
      `<div class="tc-gauge-range caption" style="top:${158 * k}px;left:${30 * k}px;right:${30 * k}px"><span>${min}</span><span>${max}</span></div>`;
    const valArc = n.querySelector(".tc-g-val");
    const [big, unit] = n.querySelector(".tc-gauge-center").children;
    const [flag, lbl] = n.querySelector(".tc-gauge-label").children;
    lbl.textContent = g.label ?? "";
    this._updaters.push((hass) => {
      const so = g.entity ? hass.states[g.entity] : null;
      const v = num(so, g.factor);
      const zero = min < 0 ? ang(0) : A0;
      const a = v == null ? zero : ang(v);
      valArc.setAttribute("d", Math.abs(a - zero) < 0.001 ? "" : a > zero ? arc(zero, a) : arc(a, zero));
      big.textContent = fmt(v, g.decimals ?? 0, hass);
      unit.textContent = unitOf(g, so);
      const warn = v != null && g.warn_above != null && v >= g.warn_above;
      n.classList.toggle("tc-tone-warn", warn);
      flag.innerHTML = warn ? tcIcon("alarm", 16) : "";
    });
    return n;
  }

  // TC90 yes/no dialog: the question as title, optional text, verbs on the buttons; resolves true on yes.
  _tcConfirm(c, question, text) {
    return new Promise((resolve) => {
      const dlg = h("div", "tc-dlg");
      dlg.dataset.tcTheme = this._theme;
      const box = h("div", "tc-dialog");
      box.innerHTML = (c.icon ? tcIcon(c.icon, 40) : "") + '<div class="title"></div>' + (text ? '<p class="body tc-dialog-text"></p>' : "") +
        '<div class="tc-dialog-btns"><button type="button" class="tc-btn label"></button><button type="button" class="tc-btn tc-btn-primary label"></button></div>';
      box.querySelector(".title").textContent = question;
      if (text) box.querySelector("p").textContent = text;
      const [no, yes] = box.querySelector(".tc-dialog-btns").children;
      no.textContent = c.no || "Annuleren";
      yes.textContent = c.yes || "Ja";
      if (c.danger) yes.classList.add("tc-btn-danger");
      dlg.appendChild(box);
      const done = (ok) => (ev) => {
        ev.stopPropagation();
        dlg.remove();
        resolve(ok);
      };
      yes.addEventListener("click", done(true));
      no.addEventListener("click", done(false));
      dlg.addEventListener("click", (ev) => ev.target === dlg && done(false)(ev));
      this.shadowRoot.appendChild(dlg);
      yes.focus();
    });
  }

  // Tabs; the tab whose path matches the current URL is highlighted.
  _dNav(item) {
    const side = item.style === "side";
    const n = this._place(h("div", "d d-nav" + (side ? " side" : "")), item, side ? 200 : null, null);
    n.style.height = "";
    const tabs = (item.tabs || []).map((t) => {
      const b = h("button", "d-tab");
      b.textContent = t.label;
      if (item.font_size) Object.assign(b.style, { fontSize: item.font_size + "px", height: (item.tab_height || 36) + "px", padding: `0 ${item.tab_padding ?? 12}px` });
      if (item.letter_spacing != null) b.style.letterSpacing = item.letter_spacing;
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

  // Alarm banner: red with time + message while active, quiet otherwise. With `attribute` the
  // messages come from a list attribute (e.g. alarms) and the banner is active while it is not empty.
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
      const list = a.attribute ? [].concat(so?.attributes?.[a.attribute] ?? []).filter((m) => m != null && m !== "") : null;
      const text = list ? (list.length > 1 ? `(${list.length}) ` : "") + list.join("  ·  ") : so ? String(so.state) : "";
      const active = a.active_entity
        ? isOn(hass.states[a.active_entity])
        : list ? list.length > 0 : !quiet.includes(text.trim().toLowerCase());
      n.classList.toggle("on", active);
      led.classList.toggle("on", active);
      time.textContent = active && so ? stamp(list ? so.last_updated || so.last_changed : so.last_changed) : "";
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
    if (item.style) n.classList.add(item.style); // TC90 text styles: title, label, body, caption, mono
    s.whiteSpace = "pre-line";
    if (item.active_entity || item.alarm_entity) {
      this._updaters.push((hass) => {
        const alarm = activeOf(hass, item.alarm_entity);
        n.classList.toggle("alarm", alarm);
        n.classList.toggle("active", !alarm && activeOf(hass, item.active_entity, item));
      });
    }
    // A tank: the box fills from the bottom to the level of level_entity, with a solid line on top.
    if (item.level_entity) {
      const col = color(item.level_color || this._media()[item.medium], MEDIA.freshwater);
      this._updaters.push((hass) => {
        const val = num(hass.states[item.level_entity], item.level_factor);
        const pct = val == null ? 0 : clamp(val / (item.level_max ?? 100), 0, 1) * 100;
        s.backgroundImage = pct
          ? `linear-gradient(to top, color-mix(in srgb, ${col} 30%, transparent) calc(${pct}% - 2px), ${col} calc(${pct}% - 2px) ${pct}%, transparent ${pct}%)`
          : "";
      });
    }
    if (item.tap_action || item.active_entity || item.level_entity) {
      n.style.cursor = "pointer";
      n.addEventListener("click", () =>
        this._handleAction(item, item.tap_action || { action: "more-info", entity: item.entity || [].concat(item.active_entity || item.level_entity)[0] }, n)
      );
    }
    if (!item.entity) {
      n.textContent = item.text ?? "";
      return n;
    }
    // attribute: show that attribute instead of the state; a list becomes one "- " line per entry.
    if (item.attribute) {
      if (item.height) s.overflowY = "auto";
      this._updaters.push((hass) => {
        const v = hass.states[item.entity]?.attributes?.[item.attribute];
        const list = Array.isArray(v) ? v : v == null || v === "" ? [] : [v];
        n.textContent = list.length ? list.map((a) => (Array.isArray(v) ? "- " : "") + a).join("\n") : item.empty_text ?? "";
      });
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
      `<path d="${d}" fill="none" style="stroke:${p.casing || "var(--bg, #0a0b0c)"}" stroke-width="${t + 4}" stroke-linejoin="round" stroke-linecap="${p.cap || "butt"}"/>` +
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
    const fill = item.color || "var(--surface, #141516)";
    const line = item.border || "var(--line-strong, #3a3a3a)";
    n.innerHTML =
      `<svg viewBox="0 0 1000 300" preserveAspectRatio="none" width="100%" height="100%" style="display:block;overflow:visible${item.bow === "left" ? ";transform:scaleX(-1)" : ""}">` +
      `<path d="M14,34 C300,6 640,8 790,34 C900,56 975,110 996,150 C975,190 900,244 790,266 C640,292 300,294 14,266 Q4,150 14,34 Z"` +
      ` style="fill:${fill};stroke:${line}" stroke-width="2" vector-effect="non-scaling-stroke"/>` +
      `<path d="M34,52 C300,26 630,28 775,52 C875,72 940,115 958,150 C940,185 875,228 775,248 C630,272 300,274 34,248 Q26,150 34,52 Z"` +
      ` fill="none" style="stroke:${line}" stroke-width="1" stroke-dasharray="6 6" vector-effect="non-scaling-stroke" opacity=".6"/>` +
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
      jet_thruster: [50, 90],
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
      // Vertical motor-pump set: finned motor with a domed top, lantern with the shaft,
      // pump casing with a flange on the left, base below.
      jet_thruster: (() => {
        const x0 = W * 0.18;
        const x1 = W * 0.82;
        const my = H * 0.58;
        const r = (x1 - x0) / 2;
        const cy0 = H * 0.66;
        const cy1 = H * 0.86;
        const py = (cy0 + cy1) / 2;
        const pipe = (xa, xb, xf) =>
          `<rect class="bd" x="${Math.min(xa, xb)}" y="${py - H * 0.05}" width="${Math.abs(xb - xa)}" height="${H * 0.1}"/>` +
          `<line class="ln" x1="${xf}" y1="${py - H * 0.08}" x2="${xf}" y2="${py + H * 0.08}"/>`;
        return `<path class="bd" d="M${x0},${my} L${x0},${2 + r} A${r},${r} 0 0 1 ${x1},${2 + r} L${x1},${my} Z"/>` +
          [0.32, 0.44, 0.56, 0.68].map((f) => `<line class="ln" x1="${W * f}" y1="${H * 0.16}" x2="${W * f}" y2="${my - H * 0.05}"/>`).join("") +
          `<rect class="bd" x="${W * 0.28}" y="${my}" width="${W * 0.44}" height="${cy0 - my}"/>` +
          `<line class="ln shaft" x1="${cx}" y1="${my}" x2="${cx}" y2="${py}" stroke-width="3"/>` +
          pipe(2, x0, 3) +
          `<rect class="ac" x="${x0}" y="${cy0}" width="${x1 - x0}" height="${cy1 - cy0}" rx="3"/>` +
          `<rect class="bd" x="${W * 0.26}" y="${cy1}" width="${W * 0.48}" height="${H - 2 - cy1}"/>`;
      })(),
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
    // A valve drawn with only active_entity: valve.x still opens and closes that valve.
    const isValve = /valve$/.test(kind);
    const valveEnt = isValve && !s.entity && typeof s.active_entity === "string" && /^valve\./.test(s.active_entity) ? s.active_entity : null;
    if (s.entity || s.tap_action || valveEnt) {
      n.classList.add("click");
      const ent = s.entity || valveEnt;
      const tap = s.tap_action
        || (kind === "pump" && /^(switch|input_boolean|light|fan)\./.test(ent)
          ? { action: "toggle", entity: ent, confirmation: { text_on: "Wilt u de pomp aanzetten?", text_off: "Wilt u de pomp uitzetten?" } }
          : isValve && /^(valve|switch|input_boolean)\./.test(ent)
          ? { action: "toggle", entity: ent, confirmation: { text_on: "Wilt u de klep openen?", text_off: "Wilt u de klep sluiten?" } }
          : { action: "more-info", entity: ent });
      n.addEventListener("click", () => this._handleAction(s, tap, n));
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

  // Tappable area on a drawing (a room on a plan): lit while an active_entity is on, blinking red on
  // alarm_entity, with a label and optional value; a tap opens its popup (or runs tap_action).
  _dZone(z) {
    const n = this._place(h("div", "d d-zone"), z, 100, 100);
    if (z.radius != null) n.style.borderRadius = z.radius + "px";
    const chip = h("div", "chip");
    const led = h("span", "d-led");
    const val = h("span", "v");
    chip.append(led, z.label ?? "");
    if (z.value_entity) chip.append(val);
    if (z.label || z.value_entity) n.appendChild(chip);
    const pop = z.zoom ? this._dZoom(z) : z.popup ? this._dPopup(z.popup, z.label) : null;
    n.addEventListener("click", () =>
      pop ? pop.open() : this._handleAction(z, z.tap_action || { action: z.entity ? "more-info" : "none" }, n)
    );
    this._updaters.push((hass) => {
      const alarm = activeOf(hass, z.alarm_entity);
      const on = !alarm && activeOf(hass, z.active_entity, z);
      n.classList.toggle("alarm", alarm);
      n.classList.toggle("on", on);
      led.classList.toggle("on", alarm || on);
      led.style.setProperty("--c", alarm ? DESIGN_COLORS.red : DESIGN_COLORS.amber);
      if (z.value_entity) {
        const so = hass.states[z.value_entity];
        const v = num(so, z.factor);
        val.textContent = v == null ? "" : `${fmt(v, z.decimals ?? 1, hass)} ${unitOf(z, so)}`.trim();
      }
    });
    return n;
  }

  // Zoomed view of a zone: the drawing under it zooms into `area`, and a side panel (`panel`) with the zone's
  // own items slides in; it scrolls when `height` is taller than the panel. "Terug" zooms out again.
  _dZoom(z) {
    const zc = z.zoom;
    const W = this._W;
    const H = this._H;
    const zx = z.x || 0;
    const zy = z.y ?? z.true ?? 0;
    const zw = z.width || 100;
    const zh = z.height || 100;
    const img = [...this._images].reverse().find((i) => {
      const iy = i.y ?? i.true ?? 0;
      return zx + zw / 2 >= i.x && zx + zw / 2 <= i.x + i.width && zy + zh / 2 >= iy && zy + zh / 2 <= iy + i.height;
    });
    const [ax, ay, aw, ah] = zc.area || [20, 120, 740, H - 140];
    const [px, py, pw, ph] = zc.panel || [776, 120, W - 796, H - 140];
    const T = Math.min(ay, py);
    const ov = this._place(h("div", "d d-zoom"), { x: 0, y: T, width: W, height: H - T });
    const view = h("div", "zv", { background: zc.background ?? "#ffffff" });
    const inner = h("div", "zi", { top: -T + "px", width: W + "px", height: H + "px" });
    if (img) inner.appendChild(this._renderItem({ ...img }));
    const mark = h("div", "zm", { left: zx + "px", top: zy + "px", width: zw + "px", height: zh + "px" });
    inner.appendChild(mark);
    view.appendChild(inner);
    const side = h("div", "d-panel zp", { left: px + "px", top: py - T + "px", width: pw + "px", height: ph + "px" });
    const head = h("div", "zh");
    const t = h("div", "d-ph");
    t.textContent = zc.title ?? z.label ?? "";
    const back = h("button", "d-btn");
    back.textContent = "← Terug";
    head.append(t, back);
    const body = h("div", "zb");
    const content = h("div", "zc", { height: (zc.height || ph - 66) + "px" });
    for (const it of zc.items || []) {
      const c = this._renderItem(it);
      if (c) content.appendChild(c);
    }
    body.appendChild(content);
    side.append(head, body);
    ov.append(view, side);
    this._panel.appendChild(ov);
    // Start: the white sheet around the drawing; end: the zoom area. Both as clip-path insets of the overlay.
    const inset = (x, y, w, hh, r) => `inset(${y - T}px ${W - x - w}px ${H - y - hh}px ${x}px round ${r}px)`;
    const iy = img ? (img.y ?? img.true ?? 0) : zy;
    const from = img ? inset(img.x - 20, iy - 20, img.width + 40, img.height + 40, 10) : inset(zx, zy, zw, zh, 8);
    const to = inset(ax, ay, aw, ah, 10);
    const s = Math.min((aw / zw) * (zc.fill ?? 0.9), (ah / zh) * (zc.fill ?? 0.9), zc.max_scale ?? 3);
    const tx = ax + aw / 2 - (zx + zw / 2) * s;
    const ty = ay + ah / 2 - (zy + zh / 2) * s;
    let timer;
    back.addEventListener("click", () => {
      ov.classList.remove("in");
      view.style.clipPath = from;
      inner.style.transform = "translate(0px, 0px) scale(1)";
      timer = setTimeout(() => (ov.style.display = "none"), 450);
    });
    return {
      open: () => {
        clearTimeout(timer);
        ov.style.display = "block";
        view.style.clipPath = from;
        inner.style.transform = "translate(0px, 0px) scale(1)";
        mark.style.borderWidth = 3 / s + "px";
        body.scrollTop = 0;
        void ov.offsetWidth; // start the transitions from the unzoomed state
        ov.classList.add("in");
        view.style.clipPath = to;
        inner.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
      },
    };
  }

  // Popup window with its own items in design px (`width` × `height`), scaled like the card; ✕ or the backdrop closes it.
  _dPopup(p, label) {
    const W = p.width || 720;
    const H = p.height || 360;
    const dlg = h("div", "d d-pop");
    const box = h("div", "box", { width: W + "px" });
    const hd = h("div", "hd");
    const t = h("div", "d-ph");
    t.textContent = p.title ?? label ?? "";
    const x = h("button", "x");
    x.textContent = "✕";
    x.setAttribute("aria-label", "Sluiten");
    hd.append(t, x);
    const body = h("div", "body", { width: W + "px", height: H + "px" });
    for (const it of p.items || []) {
      const c = this._renderItem(it);
      if (c) body.appendChild(c);
    }
    box.append(hd, body);
    dlg.appendChild(box);
    const close = () => dlg.classList.remove("open");
    x.addEventListener("click", close);
    dlg.addEventListener("click", (ev) => ev.target === dlg && close());
    this.shadowRoot.appendChild(dlg);
    return {
      open: () => {
        box.style.zoom = Math.min(this._scale || 1, (innerWidth - 32) / W, (innerHeight - 32) / (H + 57));
        dlg.classList.add("open");
      },
    };
  }

  // ---------- actions ----------

  async _handleAction(cfg, action, node) {
    const hass = this._hass;
    if (!hass) return;
    const a = action || { action: "default" };
    const entity = a.entity || cfg.entity;
    if (a.action === "none") return;
    if (a.confirmation) {
      // text_on / text_off: a different question depending on whether the entity is on now.
      const c = a.confirmation;
      const on = entity && isOn(hass.states[entity]);
      const name = String(cfg.label || cfg.title || hass.states[entity]?.attributes?.friendly_name || entity || "").replace(/\n/g, " ");
      if (this._tc) {
        const question = (on ? c.title_off : c.title_on) || c.title || `${name}?`;
        if (!(await this._tcConfirm(c, question, (on ? c.text_off : c.text_on) || c.text))) return false;
      } else {
        const text = (on ? c.text_off : c.text_on) || c.text || `${name}?`;
        if (!(await this._confirm(text, text === `${name}?` ? "" : name))) return false;
      }
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
      case "fire-dom-event": // browser_mod and friends listen for ll-custom
        fire(this, "ll-custom", a);
        return;
      default:
        if (entity) this._toggle(entity);
    }
  }

  // Dark yes/no dialog in the style of the screen pages; resolves true on "Ja".
  _confirm(text, title) {
    return new Promise((resolve) => {
      const dlg = h("div", "d d-dlg");
      const box = h("div");
      if (title) {
        const t = h("div", "d-ph");
        t.textContent = title;
        box.appendChild(t);
      }
      const p = h("p");
      p.textContent = text;
      const row = h("div", "row");
      const no = h("button", "d-btn");
      no.textContent = "Nee";
      const yes = h("button", "d-btn yes");
      yes.textContent = "Ja";
      row.append(no, yes);
      box.append(p, row);
      dlg.appendChild(box);
      const done = (ok) => (ev) => {
        ev.stopPropagation();
        dlg.remove();
        resolve(ok);
      };
      yes.addEventListener("click", done(true));
      no.addEventListener("click", done(false));
      dlg.addEventListener("click", (ev) => ev.target === dlg && done(false)(ev));
      this.shadowRoot.appendChild(dlg);
      yes.focus();
    });
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
      case "valve":
        return call("valve", "toggle");
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

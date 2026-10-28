# Shipborn Panel Card

Een Home Assistant Lovelace-kaart die een fysiek bedieningspaneel nabootst: zwarte panelen (recht of schuin), knoppen met status-LED's, noodstoppen, throttle-hendels, draaiknoppen en een "scherm" waarin je elke andere HA-kaart kunt tonen.

`examples/dashboard.yaml` bevat de complete besturingspagina van de TC90 (Dynamic Positioning, Main Propulsion, Bow/Stern, General, Passerelle, Hatch, Gangway, MFD + motorstart).

## Installatie via HACS (vanuit GitHub)

1. Push deze map naar een GitHub-repository (bijv. `shipborn/shipborn-panel-card`).
2. In Home Assistant: **HACS → ⋮ → Custom repositories** → URL van de repo, type **Dashboard**.
3. Zoek "Shipborn Panel Card" in HACS en installeer. HACS voegt de resource automatisch toe.
4. Herlaad de browser (Ctrl/Cmd + Shift + R).

Updates: push naar GitHub (liefst met een release/tag, bijv. `v0.1.1`) en klik in HACS op *Update*.

### Handmatig (zonder HACS)

Kopieer `dist/shipborn-panel-card.js` naar `/config/www/` en voeg toe onder **Instellingen → Dashboards → ⋮ → Resources**: `/local/shipborn-panel-card.js` (type *JavaScript module*).

## Dashboard aanmaken

**Instellingen → Dashboards → Dashboard toevoegen**, open het, **⋮ → Bewerken → ⋮ → Raw configuration editor** en plak `examples/dashboard.yaml`. Vervang daarna de entity-id's door je eigen entiteiten.

## Configuratie

```yaml
type: custom:shipborn-panel-card
shape: wedge-left        # rect | wedge-left | wedge-right
width: 650               # ontwerpmaat in px; de kaart schaalt mee met de breedte
height: 340
background: "#1b1b1b"    # optioneel
items:                   # alle items worden absoluut geplaatst met x / y (px)
  - type: group
    ...
```

### `group` – titel met lijnen + raster knoppen

| optie | standaard | uitleg |
|---|---|---|
| `title` | – | kop, bijv. `Boom vang` |
| `title_style` | `line` | `line`, `plain`, `serif`, `none` |
| `x`, `y`, `width` | – | positie en breedte |
| `columns` | aantal knoppen | knoppen per rij |
| `gap` | `15` | ruimte tussen knoppen, of `[kolom, rij]` |
| `button_size` / `button_width` / `button_height` | `30` | knopmaat |
| `button_style` | – | `wide` voor platte rechthoekige knoppen |
| `buttons` | – | lijst van knoppen (`{ spacer: true }` voor een leeg vak) |

### Knop

| optie | uitleg |
|---|---|
| `label` | tekst; `\n` voor een nieuwe regel |
| `entity` | te bedienen entiteit |
| `mode: momentary` | **hold-to-run**: aan zolang je drukt, uit bij loslaten (hydrauliek!) |
| `tap_action` | `toggle` (standaard), `more-info`, `perform-action`, `navigate`, `url`, `none`; met `confirmation: true` voor een bevestiging |
| `led` | `green`, `red`, `amber`, `yellow`, `blue`, `white` of een kleurcode |
| `led_entity` | andere entiteit voor de LED (bijv. eindschakelaar) |
| `led_state` | staat(en) die de LED laten branden, bijv. `locked` |
| `led_blink` | knipperen als hij aan is (alarmen) |
| `style: dashed` | hoekmarkering zoals de ALARM-knop |

Standaardactie per domein: `switch/light/input_boolean` → toggle, `button/input_button` → press, `script/scene` → turn_on, `lock` → lock/unlock, `cover` → toggle.

### Overige items

```yaml
- { type: estop, x: 57, y: 80, entity: switch.estop_throttle, label: "EMERGENCY\nSTOP" }   # vraagt standaard bevestiging (confirmation: false om uit te zetten)
- type: throttle            # sleep de hendel; dubbelklik = 0
  x: 115
  y: 45
  width: 145
  height: 145
  levers:
    - { entity: number.throttle_ps }        # number of input_number, min/max uit de entiteit
- { type: knob, x: 271, y: 152, size: 76, entity: number.heading, min: 0, max: 359 }   # verticaal slepen = waarde, tikken = details
- { type: joystick, x: 87, y: 182, size: 96, entity: sensor.dp_joystick }               # style: ring voor thruster-ring
- type: screen              # bezel met een willekeurige HA-kaart erin
  x: 20
  y: 29
  width: 400
  height: 313
  label: MFD
  card: { type: picture-entity, entity: camera.achterdek }
- { type: box, x: 158, y: 352, width: 125, height: 100, inset: false }
- { type: label, x: 10, y: 10, text: "Tekst", font_size: 8 }
- { type: image, x: 295, y: 70, width: 100, height: 240, image: /local/shipborn/vhf.png }
```

### Schermpagina's (donker console-ontwerp)

Voor volledige pagina's (1280×800, `panel: true`) zijn er items in de stijl van het canvas-ontwerp; zie `examples/plc-dashboard.yaml`.

| type | belangrijkste opties |
|---|---|
| `panel` | `title`, `led_entity` – donker vlak met kop |
| `gauge` | `entity`, `min`, `max`, `label`, `unit`, `decimals`, `color`, `warn_above` / `warn_below` – halve cirkel, vanaf 0 bij een bereik rond nul |
| `bar` | `entity`, `min`, `max`, `label`, `ticks`, `color` – liggende balk |
| `tank` | `entity`, `label`, `kind`, `color`, `low` / `high`, `marker` of `marker_entity`, `scale`, `frame: false` |
| `value` | `entity`, `label`, `unit`, `decimals`, `style: tile` |
| `indicator` | `entity`, `label`, `color`, `blink`, `state_on` – LED met tekst |
| `pushbutton` | `label`, `entity`, `tap_action`, `mode: momentary`, `variant: stop`, `led` + `led_entity`, `active_entity` (oranje rand), `align: left` |
| `nav` | `tabs: [{label, path, match}]`, `style: side` – actieve tab volgt de URL |
| `alarm` | `entity` (tekst van het actieve alarm), `active_entity`, `ok_text` |
| `block` | PMS-blok: `name`, `kind`, `rating`, `entity` (kW), `alarm_entity`, `active_entity` |
| `line` | lijn/vlak: `color`, `active_entity`, `active_color`, `border`, `radius` |
| `text` | `text` of `entity`, `font_size`, `uppercase`, `mono`, `boxed` |

### Schema's met stromende leidingen

Voor systeemschema's – zie de views `sys-…` in `examples/plc-dashboard.yaml` (tab *Systemen*): Diesel, Fuel, Generator, DC-bus koeling, Bow thruster, Zeewater, Zoetwater, Vuilwater, Bilge en Accu's, omgezet uit `Overszichtstekeningen/`. Bovenaan elke view staan de entiteiten die nog niet in de PLC-lijst voorkomen.

```yaml
- type: pipe
  medium: seawater            # seawater, coolant/freshwater, fuel, oil, grease, exhaust, air, hydraulic, shaft, bilge,
                              # glycol, glycol_return, hotwater, wastewater, power (of color: "#...")
  points: [[1062, 560], [1062, 520], [1024, 520]]   # stroomrichting = volgorde van de punten
  thickness: 7
  arrow: true                 # pijlpunt aan het eind
  flow_entity: sensor.plc_diesel_speed   # of binary_sensor (aan = stroomt), of een lijst (één actief = stroomt)
  flow_above: 100             # optioneel: numerieke drempel (flow_below, flow_abs: true voor negatief toerental, flow_state)
```

| optie | uitleg |
|---|---|
| `speed` | snelheid van de streepjes in px/s (standaard 40) |
| `reverse` | streepjes tegen de puntvolgorde in |
| `idle_opacity` | helderheid als er niets stroomt (standaard 0.3) |
| `flow: true` | altijd stromend (legenda) |
| `radius`, `dash`, `flow_color`, `casing` | bochtstraal, streeppatroon `[lengte, gat]`, kleur streepjes, kleur rand |

Symbolen: `pump`, `valve`, `hx` (warmtewisselaar), `filter`, `strainer` (zeewaterinlaat), `propeller` (draait), `outlet` (overboord), `smoke` (rook bij de uitlaat), `engine`, `generator` (cirkel met `letter`, standaard G; M voor een motor), `converter` (`glyphs: ["~", "="]`), `battery`, `fan` (draait). Ze lichten op (`color`, standaard groen) via `active_entity` of `entity` met dezelfde opties `active_above` / `active_below` / `active_abs` / `active_state`; `alarm_entity` maakt ze rood. Verder `label`, `label_position: above`, `rotation` (graden), `size` of `width`/`height`.

`hull` tekent de romp van bovenaf (`bow: left` om te spiegelen). `text` met `boxed: true` krijgt `active_entity` (groen) en `alarm_entity` (rood) – gebruikt voor motor, gearbox en e-motor.

De lettertypes (Barlow Condensed, JetBrains Mono) komen van Google Fonts; zonder internet valt de kaart terug op Roboto Condensed / Arial Narrow. Zet `fonts: false` om ze niet te laden.

## Demo zonder Home Assistant

```bash
python3 -m http.server 8765
```

Open daarna http://localhost:8765/demo/ — de demo laadt `examples/dashboard.yaml` met nep-entiteiten, zodat je de layout kunt aanpassen zonder HA.

http://localhost:8765/demo/plc.html?view=sys-diesel (of een ander `sys-…`-pad) toont een systeemschema, met een vinkje per entiteit om leidingen te laten stromen.

## Veiligheid

Deze kaart is een bedieningsinterface, geen veiligheidssysteem. Noodstoppen en hold-to-run-functies moeten altijd ook hardwarematig (PLC/relais) geborgd zijn, inclusief een timeout als de verbinding met HA wegvalt.

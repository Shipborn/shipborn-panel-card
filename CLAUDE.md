# Shipborn Panel Card – overdracht en werkinstructies

Dit bestand is bedoeld om het werk in een nieuwe sessie (ook op een andere pc) direct op te pakken. Het beschrijft wat het project doet, hoe het in elkaar zit, hoe er gewerkt en uitgerold wordt, en wat er nog openstaat. De ontwikkelgeschiedenis staat in [docs/GESCHIEDENIS.md](docs/GESCHIEDENIS.md), de gebruikersdocumentatie van alle kaart-opties in [README.md](README.md).

## In het kort

- **Wat:** een eigen Home Assistant-kaart (`custom:shipborn-panel-card`) en een dashboard met bedieningsschermen voor de **TC90** (Shipborn / JOAL). De schermen tonen per systeem (diesel, brandstof, generator, DC-bus, boegschroef, zeewater, zoetwater, vuilwater, bilge, accu's, Webasto, navigatieverlichting, alarmen) een schema met stromende leidingen en daaronder de bediening.
- **Gebruikers:** bemanning aan boord, op een aanraakscherm (1280×800) in kiosk-modus. Teksten in de interface zijn Nederlands, de PLC-namen deels Engels.
- **Bron van de data:** Home Assistant met Wago-PLC's (`*wago_*`), ER-statusblokken (`*.er_*`), Victron (`*victron_mqtt_*`), AL1590-sensoren (`*al1590_*`), Zigbee-lekdetectie (`binary_sensor.0x…_water_leak`) en Lopolight-navigatieverlichting.
- **GitHub:** https://github.com/Shipborn/shipborn-panel-card (branch `main`). HACS in Home Assistant installeert de kaart vanaf daar.

## Mappen en bestanden

Lokaal staat het project in dagmappen `YYMMDD/` onder `…/32.Home Assistant/18.Bestruringspagina/`. De werkwijze daarvan staat in de `README.md` en `CLAUDE.md` van die bovenmap. Werk alleen in de nieuwste dagmap.

| Pad | Inhoud |
|---|---|
| `dist/shipborn-panel-card.js` | **De hele kaart**, met de hand geschreven (geen build, geen bundler, geen npm). Dit bestand ís de bron én wat HACS installeert. |
| `examples/plc-dashboard.yaml` | **Het dashboard dat in HA draait**: alle views (`sys-…`, `alarms`). Werkbestand; wordt in HA in de Raw configuration editor geplakt. |
| `examples/plc-entiteiten.csv` | Koppellijst: per pagina/onderdeel de placeholder (`*.plc_*`), de echte HA-entiteit, zekerheid (`zeker` / `waarschijnlijk` / `controleer` / `geen gevonden`) en opmerking. Puntkomma-gescheiden, UTF-8. |
| `examples/Entiteiten-HA.xlsx` | Export van álle entiteiten uit HA (entity_id, naam, domein, status, ruimte). Naslag; niet in git; wordt alleen ververst door opnieuw te exporteren uit HA. |
| `examples/dashboard.yaml` | Het eerste ontwerp: fysieke bedieningspanelen (DP, Main Propulsion, Bow/Stern, …). Niet het dashboard dat nu in gebruik is. |
| `demo/plc.html` | Toont een view van `plc-dashboard.yaml` zonder HA, met nep-entiteiten en een vinkje per entiteit om stroming te simuleren. `?view=sys-diesel` enz. |
| `demo/editor.html` + `demo/edit_server.py` | Visuele layout-editor; slaat op in `plc-dashboard.yaml` met behoud van opmerkingen en opmaak. |
| `demo/index.html` | Demo van `examples/dashboard.yaml` (het eerste ontwerp). |
| `Overszichtstekeningen/*.jpg` | De systeemtekeningen waarop de `sys-…`-schema's zijn gebaseerd. Niet in git. |
| `Voorbeeld foto's plc/` | Screenshots van het oorspronkelijke PLC-scherm (ontwerpvoorbeeld). Niet in git. |
| `hacs.json` | HACS-metadata (naam, bestandsnaam `shipborn-panel-card.js`); in HACS toegevoegd als custom repository van het type *Dashboard*. |

## Werken en uitrollen

### Lokaal bekijken en bewerken

Alleen Python (standaardbibliotheek) en een browser zijn nodig; de pagina's laden `js-yaml` en `yaml` van een CDN, dus internet is nodig.

```bash
python demo/edit_server.py              # editor: http://localhost:8770/demo/editor.html
python -m http.server 8765              # demo:   http://localhost:8765/demo/plc.html?view=sys-dcbus
```

- Op de pc van GBS werkt alleen `python`, niet `python3`.
- `http.server` stuurt geen cache-headers: na een wijziging kan de browser oude bestanden tonen. Harde refresh, of de editorserver gebruiken (die stuurt `no-store`).
- In de demo zijn entiteiten die niet in de nep-lijst van `demo/plc.html` staan "—" (waarden) of gedimd (knoppen). Dat is normaal.
- Claude Code: `.claude/launch.json` (niet in git) bevat preview-configuraties: in de dagmap `demo` (8765), in de bovenmap `demo` en `editor` (8770), die naar de actieve dagmap wijzen. Start ze met de preview-tool, niet met Bash.

### Uitrollen naar Home Assistant

Twee aparte stappen, in deze volgorde:

1. **De kaart (JS)**, alleen als `dist/shipborn-panel-card.js` veranderd is:
   - verhoog `const VERSION` bovenaan (patch-nummer, bijv. 0.4.18 → 0.4.19);
   - commit en push naar `main`;
   - in HA: **HACS → Shipborn Panel Card → Update** (of ⋮ → *Redownload*), daarna `Ctrl+Shift+R`. De browserconsole toont `SHIPBORN-PANEL-CARD vX.Y.Z`.
   - Er worden (nog) geen tags/releases gemaakt; HACS volgt de commits.
2. **De schermen (YAML)**: in HA het PLC-dashboard → ⋮ → Bewerken → ⋮ → *Raw configuration editor*, alles vervangen door `examples/plc-dashboard.yaml`, opslaan. De editor heeft hiervoor de knop **Kopieer YAML**.

Een YAML met een nieuw item-type of nieuwe optie vóór de JS-update plakken geeft een rood vak `? type (vX)` of een leeg onderdeel.

**Bron van waarheid is `examples/plc-dashboard.yaml`**, niet de configuratie in HA. Wijzigingen die iemand direct in HA maakt, gaan bij de volgende keer plakken verloren; haal ze eerst op (raw config kopiëren) en voeg ze samen.

### Nieuwe bediening uit het "normale" HA-dashboard overnemen

De gebruiker plakt vaak YAML van gewone HA-kaarten (`grid` met `tile`, `entities`, `button-card`, `markdown` met Jinja). Werkwijze:

1. Bepaal de juiste view (`sys-…` of `alarms`) en zet de onderdelen in een `panel` onder het schema (de bediening begint rond `y: 732`; alles daaronder schuift mee). Verhoog `height` van de kaart zodat het past.
2. Vertaal: `tile` op een sensor → `value` met `style: tile`; aan/uit-sensor → `indicator`; `button.*` → `pushbutton`; `switch.*` → `pushbutton` met `led: green`; Jinja → er is géén template-engine in de kaart, dus de functie nabouwen (bijv. `text` met `attribute` voor een lijst-attribuut).
3. Werk `examples/plc-entiteiten.csv` bij (placeholder vervangen of regel toevoegen, met zekerheid).
4. Controleer in `demo/plc.html?view=…`; voeg zo nodig nep-states toe in `demo/plc.html`.
5. Nieuwe kaart-optie of item → ook `README.md` (tabel bij het item) en `VERSION` bijwerken.

## Opbouw van het dashboard (`plc-dashboard.yaml`)

- Eén view per scherm, `panel: true`, met precies één `custom:shipborn-panel-card` erin. Ontwerpbreedte altijd **1280 px**; de kaart schaalt mee met de schermbreedte. `height` verschilt per view (800 voor alleen een scherm, langer als er bediening onder het schema staat; de pagina scrolt dan).
- Elke view begint met dezelfde kop:
  ```yaml
  - { type: line, x: 0, y: 0, width: 1280, height: 64, color: "#141516" }
  - { type: image, x: 24, y: 18, width: 200, height: 28, image: shipborn-joal }
  - { type: nav, x: 240, y: 14, font_size: 12, tab_padding: 8, letter_spacing: 0, tabs: *sys_tabs }
  - { type: indicator, x: 1144, y: 25, entity: binary_sensor.plc_lifebeat, label: "PLC LIFEBEAT", font_size: 13, led_size: 10 }
  - { type: alarm, x: 0, y: 64, width: 1280, height: 40, entity: sensor.er_alarm_status_active_alarms, attribute: alarms, tap_action: { action: navigate, navigation_path: alarms } }
  ```
  De tabs staan één keer als YAML-anker `&sys_tabs` in de eerste view (`sys-diesel`) en worden elders met `*sys_tabs` hergebruikt. Een nieuw scherm = view toevoegen én een regel in `&sys_tabs`.
- Tab-paden zonder `/` (bijv. `sys-fuel`) verwijzen naar een view in hetzelfde dashboard, ongeacht de URL van het dashboard.
- Schema: `hull` (romp) op **precies** `{ type: hull, x: 20, y: 112, width: 1240, height: 600 }` op elke schemapagina (de omtrek moet overal gelijk zijn), met daarin `pipe`-items en symbolen; daaronder vanaf `y: 732` de `panel`s met de bediening. Schuif je een schema, schuif dan alle coördinaten (ook `points`) mee en laat de romp staan.
- Kiosk: elke kaart heeft `kiosk: true` (HA-balken verborgen; even op de boven-/linkerrand blijven toont ze).
- Stijl: items op één regel in flow-stijl (`- { type: …, x: …, y: … }`), opmerkingen in het Nederlands, secties met `# ---- … ----`. De editor bewaart die opmaak.
- Entiteiten met `.plc_` in de naam zijn **placeholders** die (nog) niet in HA bestaan; ze tonen "—" of niets.

## Opbouw van de kaart (`dist/shipborn-panel-card.js`)

Eén custom element, `ShipbornPanelCard extends HTMLElement`, met shadow DOM. Geen framework.

- **Bovenaan:** `VERSION`, kleurtabellen (`LED_COLORS`, `DESIGN_COLORS`, `MEDIA` voor leidingkleuren per medium), `STYLE` (alle CSS als string), `SYMBOLS` en `DESIGN_TYPES` (lijsten met item-types), ingebouwde afbeeldingen (`IMAGES`, o.a. het logo `shipborn-joal`) en hulpfuncties: `isOn`, `num` (met `factor`), `fmt`, `unitOf`, `color`, `activeOf` (actief-logica met `*_above` / `*_below` / `*_abs` / `*_state`), `colorOf` (de `colors`-regels), `viewPath`, `stamp`.
- **`setConfig` → `_build()`:** maakt het paneel (vaste ontwerpmaat `width`×`height`, geschaald met CSS `transform` in `_fit()`), tekent de vorm (`_shapeSvg`) en roept per item `_renderItem(item)` aan. Elk DOM-element krijgt `data-i` = index van het item; de editor gebruikt dat.
- **`_renderItem`:** `switch` op `item.type`. Twee families:
  - *Fysiek paneel* (eerste ontwerp): `group`/knop (`_group`, `_button`, `_momentary` voor hold-to-run), `estop`, `throttle`/`_lever`, `knob`, `joystick`, `screen` (andere HA-kaart in een bezel), `box`, `label`, `image`.
  - *Schermontwerp* (`_d…`-methoden): `panel`, `gauge`, `bar`, `tank`, `value`, `indicator`, `pushbutton`, `nav`, `alarm`, `block`, `line`, `text`, `pipe`, `hull`, en alle schema-symbolen via `_dSymbol` (pompen, kleppen, `hx`, `converter`, `generator`, `propeller`, `jet_thruster`, …).
  - Onbekend type → rood vak `? type (vVERSION)`, zodat het opvalt.
- **Updates:** elk item dat van een entiteit afhangt, registreert een functie in `this._updaters`; de `hass`-setter roept ze allemaal aan bij elke statuswijziging. Nieuwe items volgen dat patroon.
- **Plaatsing:** `_place(node, item, defW, defH)` zet `x`, `y`, `width`/`height`/`size`. Let op: HA's YAML 1.1-parser maakt van de sleutel `y` soms `true`; daarom wordt `item.true` als terugval gelezen (ook in de editor).
- **Acties:** `_handleAction` (toggle, more-info, perform-action, navigate, url, fire-dom-event), `_confirm` (eigen donker Ja/Nee-venster, met `text_on`/`text_off`), `_toggle` (kiest de juiste dienst per domein: switch/light/input_boolean, button/input_button → press, valve → toggle, …), `_turn`, `_setValue`.
- **Kiosk:** `_kioskOn`/`_kioskOff` verbergen de HA-header en zijbalk en kleuren de pagina rond de kaart (`page_background`); niet in bewerkmodus.
- **Lettertypes:** Barlow Condensed en JetBrains Mono van Google Fonts (`fonts: false` om uit te zetten).
- Conventies in de code: Engelse commentaarregels boven elke methode in één zin, compacte stijl, geen afhankelijkheden.

## Layout-editor (`demo/editor.html`)

- ES-module die de kaart zelf laadt en `yaml@2.5.1` (`parseDocument`) gebruikt, zodat opmerkingen, ankers (`&sys_tabs`) en flow-stijl bewaard blijven bij opslaan.
- Werkt op `views[vi].cards[0].items`: selecteren, slepen (met raster), leidingpunten bewerken, labels los verslepen (`label_offset`), formaat wijzigen, eigenschappen rechts bewerken, items toevoegen uit een palet (`PALETTE`), kleuren en `media_colors`, schermen toevoegen/verwijderen (met de gedeelde kop en een tab).
- Opslaan (`Ctrl+S`) doet een `PUT` naar `edit_server.py`, die alleen `examples/plc-dashboard.yaml` mag schrijven en alleen op `127.0.0.1` luistert.
- Komt er een nieuw item-type of optie in de kaart, voeg het dan ook aan het palet en, waar zinvol, aan de eigenschappenlijst van de editor toe.

## Git en conventies

- Commits vanuit de nieuwste dagmap; berichten in het **Engels**, gebiedende wijs, korte onderwerpregel, daaronder kort waarom/wat (zie `git log`). Documentatie en UI-teksten in het Nederlands.
- Auteur: `admin <jerom.dirven@gmail.com>`; staat lokaal in `.git/config` van de dagmap. Bij een verse `git clone` op een andere pc opnieuw instellen:
  ```bash
  git config user.name admin
  git config user.email jerom.dirven@gmail.com
  ```
- Niet in git (bewust): `.claude/`, `Overszichtstekeningen/`, `Voorbeeld foto's plc/`, `examples/Entiteiten-HA.xlsx`. Die komen alleen via de Dropbox-map mee.
- Er is geen testsuite; controleren gebeurt in `demo/plc.html` en daarna in HA.

## Op een andere pc beginnen

- **Met de Dropbox-map:** open de bovenmap `18.Bestruringspagina` en voer `nieuwe-dag.ps1` uit; alles (inclusief `.git` en de niet-geversioneerde bestanden) komt mee.
- **Zonder Dropbox:** `git clone https://github.com/Shipborn/shipborn-panel-card.git <YYMMDD>`, git-auteur instellen (zie boven). Tekeningen, screenshots en de HA-export ontbreken dan.
- Controleer of `python` werkt (anders `python3`) en pas `.claude/launch.json` daarop aan.

## Stand van zaken en open punten (30-10-2026, v0.4.19)

- Views: `sys-diesel`, `sys-fuel`, `sys-generator`, `sys-dcbus`, `sys-bowthruster`, `sys-seawater`, `sys-freshwater`, `sys-wastewater`, `sys-bilge`, `sys-power`, `sys-webasto`, `sys-navlights`, `alarms`. De Main-pagina en de oude tabs (Main/Diesel/Electric/PMS/Tanks) zijn op 29-10 weggehaald.
- **Nog niet gekoppelde placeholders** in het dashboard (bestaan niet in HA): `binary_sensor.plc_lifebeat` (op elke pagina rechtsboven), `binary_sensor.plc_diesel_alarm`, `binary_sensor.plc_generator_alarm`, `binary_sensor.plc_jp1/2/3_alarm`, `binary_sensor.plc_bilge_anchor_box_high` / `_running`, `binary_sensor.plc_shore_water_valve_open`, `binary_sensor.plc_webasto_running`, `sensor.plc_battery_current`, `sensor.plc_bowthruster_setpoint`, `sensor.plc_electric_speed`, `sensor.plc_emotor_rpm`. Zie de CSV voor details en kandidaten.
- **Te bevestigen door de gebruiker** (in de CSV als `controleer`): bowthruster-setpoint = `sensor.er_thruster_status_bow_thruster_lever`? JT input = `sensor.er_thruster_status_jet_lever`? Daarna ook in het schema koppelen.
- De alarmbalk bovenaan (alle pagina's) en het linkervak van de alarmpagina lezen beide de lijst `alarms` van `sensor.er_alarm_status_active_alarms`; tik op de balk = naar de alarmpagina.
- Voor de walstroominstelling (knoppen *Shore current − / +* bij DC-bus) is nog geen sensor met de huidige waarde bekend.
- Knoppen (`pushbutton`) vragen geen bevestiging, behalve waar `confirmation` is ingesteld; pompen en kleppen vragen wel Ja/Nee.
- Veiligheid: de kaart is een bedieningsinterface, geen veiligheidssysteem. Noodstop en hold-to-run moeten in de PLC geborgd zijn.

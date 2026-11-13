# Shipborn Panel Card

Een Home Assistant Lovelace-kaart die een fysiek bedieningspaneel nabootst: zwarte panelen (recht of schuin), knoppen met status-LED's, noodstoppen, throttle-hendels, draaiknoppen en een "scherm" waarin je elke andere HA-kaart kunt tonen.

Verder ontwikkelen of overnemen: lees [CLAUDE.md](CLAUDE.md) (opbouw, workflow, open punten) en [docs/GESCHIEDENIS.md](docs/GESCHIEDENIS.md).

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
| `tap_action` | `toggle` (standaard), `more-info`, `perform-action`, `navigate`, `url`, `none`; met `confirmation: true` voor een bevestiging; `confirmation: { when: "off" }` vraagt alleen vóór uitzetten (`"on"`: alleen vóór aanzetten; zet `off`/`on` tussen aanhalingstekens) |
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
- { type: image, x: 295, y: 70, width: 100, height: 240, image: /local/shipborn/vhf.png }   # of een ingebouwd beeld: image: shipborn-joal (logo), tc90-zijaanzicht, tc90-dekplan, tc90-interieur
```

### Kiosk: HA-balken verbergen

Met `kiosk: true` op de kaart verbergt HA de bovenbalk en de zijbalk zolang die view open is. Op een kaart met `design: tc90` en een `statusbar` is het logo linksboven de knop: één tik toont de balken van HA (om naar andere HA-pagina's te gaan), nog een tik verbergt ze weer. Zonder TC90-statusbalk, of met `kiosk_toggle: edge`, blijf je even met de muis (of een vinger) op de bovenste of linker schermrand staan om ze te tonen; terug op de kaart verdwijnen ze weer. `kiosk_delay` (ms, standaard 800) bepaalt hoe lang. In bewerkmodus blijven de balken zichtbaar. De ruimte die HA voor de verborgen zijbalk vrijhoudt (een witte strook links) haalt de kaart weg, ongeacht hoe de HA-versie die opbouwt: linkermarges en -opvullingen tussen de kaart en de pagina gaan naar 0, een element dat de kaart daarna nog naar rechts houdt wordt teruggetrokken, en een smalle strook die nog over de linkerrand ligt wordt verborgen. Bij het tonen van de balken of het verlaten van de view komt alles terug. Het versienummer van de kaart staat in de tooltip van het logo in de statusbalk.

De pagina rond de kaart (naast of onder het scherm als de verhouding niet past) krijgt de `background` van de kaart, of `page_background` als je een andere kleur wilt.

### Schermpagina's (donker console-ontwerp)

Voor volledige pagina's (1280×800, `panel: true`) zijn er items in de stijl van het canvas-ontwerp; zie `examples/plc-dashboard.yaml`.

| type | belangrijkste opties |
|---|---|
| `panel` | `title`, `led_entity` – donker vlak met kop |
| `gauge` | `entity`, `min`, `max`, `label`, `unit`, `decimals`, `color`, `warn_above` / `warn_below` – halve cirkel, vanaf 0 bij een bereik rond nul |
| `bar` | `entity`, `min`, `max`, `label`, `ticks`, `color` – liggende balk |
| `tank` | `entity`, `label`, `kind`, `color`, `low` / `high`, `marker` of `marker_entity`, `scale`, `frame: false` |
| `value` | `entity`, `label`, `unit`, `decimals`, `style: tile`, `colors` (zie onder) |
| `indicator` | `entity`, `label`, `color`, `blink`, `state_on`, `active_above` / `active_below`, `off_color` – LED met tekst |
| `pushbutton` | `label`, `entity`, `tap_action`, `mode: momentary`, `variant: stop`, `led` + `led_entity`, `active_entity` (oranje rand), `align: left`; `checklist: { title, text, run, close, items: [{ label, entity, state, above, below, unit, decimals }] }`: een tik opent een venster met per stap een bolletje (groen = goed, rood = niet) en de huidige stand (live); *Uitvoeren* voert `tap_action` uit (het venster is de bevestiging), *Sluiten* sluit. Staan alle stappen goed (aan, of `state` zoals `open`, of boven `above` / onder `below`), dan is het bolletje links van de tekst groen, anders grijs. `status_entity` (+ `status_above` / `_below` / `_state`) geeft hetzelfde bolletje zonder checklist (bijv. DC-bus ≥ 700 V). `choice: { title, text, base, options: [{ label, available_entity, entity, note }], fallback: { label, note } }`: een tik opent een keuzevenster; alleen opties waarvan `available_entity` aan is zijn te kiezen (live), `fallback` altijd; *Uitvoeren* zet eerst `base` aan (één of een lijst) en dan de `entity` van de keuze; een optie zonder `entity` toont alleen zijn `note`; zonder beschikbare opties is `fallback` voorgeselecteerd. `require: { title, text, items: [zelfde stappen als checklist] }`: staat een stap niet goed, dan stuurt een tik niets maar opent een venster met de uitleg, de stappen met hun bolletje en alleen *Sluiten* (bijv. boegschroef aan pas als de DC-bus ≥ 700 V is en Battery connect aan). `placeholder: true` (of een eigen tekst): zacht oranje knop die nog nergens aan gekoppeld is; een tik toont alleen *Nog niet gekoppeld* met *Sluiten*, andere acties op de knop (bijv. `choice`) blijven bewaard voor later |
| `nav` | `tabs: [{label, path, match}]`, `style: side` – actieve tab volgt de URL; met `font_size` ook `tab_height`, `tab_padding` en `letter_spacing` |
| `alarm` | `entity` (tekst van het actieve alarm), `active_entity`, `ok_text`; met `attribute` komen de meldingen uit een lijst-attribuut (actief zolang de lijst niet leeg is, meerdere als `(2) A · B`) |
| `block` | PMS-blok: `name`, `kind`, `rating`, `entity` (kW), `alarm_entity`, `active_entity` |
| `line` | lijn/vlak: `color`, `active_entity`, `active_color`, `border`, `radius` |
| `text` | `text` of `entity`, `font_size`, `uppercase`, `mono`, `boxed`; `attribute` toont een attribuut (een lijst als regels met `- `, met `empty_text` als hij leeg is, scrollt binnen `height`) |
| `zone` | tikbaar vlak op een tekening (een ruimte): `points: [[x, y], …]` (de omtrek van de ruimte in paginacoördinaten; zonder `points` een rechthoek met `x`/`y`/`width`/`height`; alleen tikken binnen de vorm tellen), `label_at: [x, y]` (plek van het label), `label`, `value_entity` (+ `unit`, `decimals`, `factor`), `active_entity` (oranje), `alarm_entity` (rood knipperend), `radius`; `zoom: { title, height, items, area, panel, max_scale }` zoomt in op de tekening onder de zone met rechts een (scrollend) paneel met eigen items; `popup: { title, width, height, items }` opent een venster; anders `tap_action` |

`gauge`, `bar`, `tank`, `value`, `block` en `text` met een entiteit kennen `factor` om ruwe waarden om te rekenen, bijv. `factor: 0.00001` voor een Wago-tankniveau (7894954 → 78,9 %) of `factor: 0.001` voor mbar → bar.

`colors` op een `value` kleurt het getal zoals de oude button-card-sjablonen; de eerste regel die klopt wint, een regel zonder voorwaarde is de standaard. Een regel met eigen `entity` test die entiteit (bijv. grijs zolang de pomp geen druk heeft):

```yaml
- type: value
  style: tile
  entity: sensor.engine_room_me_oil_press
  label: Oil pressure
  colors: [{ below: 1.5, color: red }, { below: 1.8, color: amber }, { color: green }]
```

Een checklist-regel is een `indicator` met `off_color: red`: groen als het klopt, rood als het niet klopt, met `state_on: open` voor kleppen of `active_above: 2.49` voor een minimale waarde.

Een `pump` op een schakelaar (`switch`, `input_boolean`, `light`, `fan`) schakelt bij een tik, na de vraag *Wilt u de pomp aanzetten?* of *…uitzetten?*. Een klep (`butterfly_valve`, `ball_valve`, …) op een `valve.`-entiteit doet hetzelfde met *Wilt u de klep openen?* / *…sluiten?*; daarvoor is `active_entity: valve.…` genoeg. Elke `confirmation` verschijnt als donker Ja/Nee-venster; met `text_on` / `text_off` hangt de vraag af van de huidige stand:

```yaml
tap_action: { action: toggle, confirmation: { text_on: "Wilt u de pomp aanzetten?", text_off: "Wilt u de pomp uitzetten?" } }
```

`tap_action` kent ook `fire-dom-event` (browser_mod), zoals de knop *Wierpot aft afsluiten voor legen*.

Een `text` met `boxed: true` wordt een tank met `level_entity`: het vak vult zich van onder tot dat niveau (0–100, of tot `level_max`), in de kleur van `medium` of `level_color`. `level_factor` rekent een ruwe waarde om.

```yaml
- { type: text, x: 743, y: 312, width: 193, height: 136, text: Diesel PS, boxed: true, medium: fuel, level_entity: sensor.diesel_ps_level }
```

Een `zone` legt een tikbaar vlak over een plattegrond. Het venster (`popup`) heeft zijn eigen ontwerpmaat (`width` × `height`, in px vanaf linksboven) en schaalt mee met de kaart; de items erin zijn gewone items (knoppen, waarden, indicatoren). Een scène zet je zo op een knop:

```yaml
- type: zone
  x: 729
  y: 293
  width: 172
  height: 132
  label: Main cabin
  value_entity: sensor.temp_main_temperature
  active_entity: [light.main_cabin_salon_rondom, light.main_cabin_plinten]
  popup:
    width: 760
    height: 200
    items:
      - { type: pushbutton, x: 20, y: 44, width: 170, height: 52, label: Aan, tap_action: { action: perform-action, perform_action: scene.turn_on, data: { entity_id: scene.ctd_008673_main_cabin_aan } } }
      - { type: pushbutton, x: 20, y: 106, width: 350, height: 46, label: Salon rondom, entity: light.main_cabin_salon_rondom, led: green, align: left }
```

Zonder `area` en `panel` past de ingezoomde weergave altijd tussen statusbalk en icoonbalk van het scherm waarop hij geopend wordt (12 px marge), scrolt de pagina niet zolang hij open is en schikt hij zich opnieuw bij een andere schermmaat (iPad draaien). Een zone met `edited: true` is in de layout-editor aangepast en wordt door `tools/interieur_zones.py` niet meer overschreven. Item `lamp` (`entity`, `x`/`y` = midden, `size`, `label`, of `points` voor een ledstrip) is één losse lamp zoals in de zoom; de layout-editor gebruikt het. `lamps: [{ entity, x, y, label }]` zet de lampen van de ruimte als stipjes op de ingezoomde tekening; een ledstrip krijgt `points: [[x, y], …]` in plaats van `x`/`y` en wordt een lijn langs die punten (zelfde kleuren en bediening; alleen de lijn zelf is tikbaar). Dezelfde entiteit mag meer keer voorkomen (een lamp met meer armaturen, bijv. *2 spots*, of meer losse ledstrips op één groep). Overige uitleg: (paginacoördinaten, zelfde maat op elk zoomniveau, `lamp_size` standaard 24 px): geel = aan, grijs = uit; tikken schakelt, lang indrukken opent het more-info-venster van HA (dimmen); de tooltip toont naam en helderheid. `below: { height, items }` zet items onder de ingezoomde tekening (links, in px vanaf linksboven van die strook, breedte 740), bijvoorbeeld de Webasto-blokken; die zijn alleen zichtbaar als er is ingezoomd. Oud gedrag: met `zoom` in plaats van `popup` zoomt een tik vloeiend in op de zone: de afbeelding waar de zone op ligt vult het vak `area` (standaard `[20, 120, 740, hoogte − 140]`, met een wit vel), met maximaal `max_scale` (standaard 3) zodat de omgeving zichtbaar blijft. Rechts schuift een paneel in (`panel`, standaard `[776, 120, 484, hoogte − 140]`) met een kop, een knop *← Terug* en de items; die staan in px vanaf linksboven in het paneel (breedte ±448 binnen de marges) en scrollen als `height` groter is dan het paneel. De ruimtes op het interieurplan worden gemaakt met `tools/interieur_zones.py` uit de HA-export.

### Ontwerp TC90 JOAL (`design: tc90`)

**Telefoon (staand).** Op een telefoon die rechtop wordt gehouden (kortste schermzijde < 600 px, hoger dan breed) maakt de kaart zelf een smalle pagina (390 breed) van de gewone: hij meet waar alles staat en zet de onderdelen in vakken onder elkaar, in leesvolgorde (van boven naar beneden, links naar rechts). Een `panel` (of een grote `line` als wit vel), en een groep losse items die dicht bij elkaar staan, is één vak: past hij (≤ 480 breed), dan houdt hij zijn eigen opbouw, iets vergroot tot de schermbreedte; is hij breder, dan komen zijn kolommen onder elkaar (twee naast elkaar als ze samen ≤ 480 breed zijn). Een schema met `hull` is een strook om opzij te vegen, een `image` met wat erop staat (ruimtes, hotspots) past op de breedte. Statusbalk en icoonbalk worden smal (subtabs op een tweede regel die opzij schuift, geen klok of statusiconen) en blijven vrij van de klok/notch en de veeg-balk van de telefoon. Een ruimte met `zoom` opent als één kolom: tekening met lampen, dan `below` en dan de `items` van het paneel, geschaald op de breedte. Draait de telefoon, dan wisselt de kaart vanzelf van indeling. Bijsturen per kaart: `phone_order: [2, 0, 1]` (volgorde van de vakken, genummerd in de leesvolgorde van de brede pagina), `phone_hide: [3]` (vakken weglaten), `phone: false` (geen telefoonindeling).

Het ontwerp uit het design system *TC90 JOAL Bediening*: rustige donkere schermen, het schip groot in beeld, een statusbalk bovenaan en een icoonbalk onderin. Zet `design: tc90` op de kaart; de kaart krijgt dan de kleuren, letters (Barlow) en iconen van dat ontwerp en drie thema's: **Nacht** (standaard), **Dag** en **Rood nacht**. De themaknop in de statusbalk wisselt ze; de keuze geldt voor alle TC90-pagina's op dat scherm (bewaard in de browser), ook voor pagina's die HA al eerder had geopend (elke kaart controleert het bij elke statusupdate) en voor andere vensters van HA op hetzelfde apparaat. `theme: dag` op de kaart kiest het beginthema.

Iconen (`icon:`): `schip`, `energie`, `motor`, `water`, `klimaat`, `verlichting`, `bilge`, `alarm`, `anker`, `diesel`, `accu`, `walstroom`, `ventilator`, `pomp`, `klep`, `generator`, `verwarming`, `navlicht`, `interieur`, `instellingen`, `zon`, `maan`, `lifebeat`, `aan`, `pijl`, `vink`, `sluit`, `tank`.

| Item | Opties |
|---|---|
| `statusbar` | bovenaan (56 hoog), staat vast bovenaan het scherm (houd de eerste 56 px van de kaart vrij): `title`, `tabs: [{ label, path, match }]` (keuze tussen de subpagina's van een bestemming, in plaats van de titel), `logo` (standaard `shipborn-joal`), `status: [{ icon, label, entity, tone }]` (met `path` (+ `match`) in plaats van `entity` is het icoon een knop naar die pagina, accentkleur zolang een van die pagina's open is, bijv. het tandwiel naar Instellingen; icoon in `tone` – `ok`, `accent`, `warn`, `alarm` – zolang de entiteit aan is; met `value: true` de waarde + `unit`, met `warn_below` / `alarm_below`), `clock: false`, `theme_toggle: false` |
| `alarmbar` | `entity`, `attribute` (lijst), `y`; leeg = "Geen actieve alarmen", anders het nieuwste alarm knipperend in alarmrood met `+N MEER`; tik = `tap_action` (standaard naar `alarms`) |
| `navbar` | icoonbalk (88 hoog), staat altijd onderaan het scherm, ook op lange pagina's die scrollen: `items: [{ icon, label, path, match, badge_entity, badge_attribute }]`; het item van de huidige pagina (of `active: <label>`) is blauw met een streep |
| `tile` | meetwaarde: `icon`, `label`, `entity`, `unit`, `decimals`, `factor`, `sub` en/of `sub_entity` (+ `sub_unit`, `sub_decimals`) voor de regel eronder, `size: lg`; `warn_above` / `warn_below` / `alarm_above` / `alarm_below` kleuren de tegel met driehoek, alleen zolang `tone_entity` actief is (bijv. de motor draait); tik = `tap_action` (standaard more-info) |
| `switch` | schakelaartegel (136×136): `icon`, `label`, `entity` (wat bediend wordt), `state_entity` (wat AAN/UIT toont, bijv. de binary_sensor bij een `button.*`), `tap_action` (standaard toggle, met `confirmation: { title, text, yes, no, danger }`), `fault_entity` (STORING), `text_on` / `text_off`; na een tik BEZIG tot de stand verandert |
| `hotspot` | punt op het schip met een label: `x`/`y` = het punt, `icon`, `label`, `entity` (+ `unit`, `decimals`, `factor`), `side: left`, `active_entity` (blauw), `alarm_entity`, `warn_*` / `alarm_*`, `tap_action` |
| `dial` | ronde meter (270°): `label`, `entity`, `min`, `max`, `unit`, `decimals`, `warn_above` (dunne oranje zone), `width`; `setpoint_entity` zet een streepje op de schaal en "Setpoint 18 °C" onder de waarde (`setpoint_label`, `setpoint_unit`, `setpoint_decimals`); `selected_entity` geeft een groen kader zolang die entiteit aan is (bijv. de aandrijving die met de vaarmodus gekozen is; `selected_above` / `_below` / `_abs` / `_state` zoals bij `active_entity`) |
| `warnlight` | waarschuwingslampje, alleen een icoon (`size`, standaard 44; `icon`, bijv. `oliedruk`, `olietemp`, `koelwater`, `flow`, `uitlaat`, `druk`, `koppeling`; `label` als tooltip): groen, oranje (`warn_above` / `warn_below`) of rood (`alarm_above` / `alarm_below`, knippert). Grijs zolang `tone_entity` niet actief is (systeem staat uit; `tone_above` / `tone_below` / `tone_abs` voor een meetwaarde, bijv. toerental). Geel als het systeem draait (of er geen `tone_entity` is) maar de sensor onbeschikbaar of onbekend is. Een aan/uit-entiteit is groen als hij aan is, anders grijs; `icon_off` is een ander icoon zolang het lampje grijs is (bijv. `koppeling` / `ontkoppeld`). Tik = more-info (of `tap_action`) |
| `webpage` | webpagina in de kaart (iframe): `url`, `x`, `y`, `width`, `height`; `scale` < 1 zoomt uit (meer van de pagina zichtbaar); rechtsonder een knop *Open in nieuw venster* (`open_label`, `open_button: false` om weg te laten). Werkt alleen als HA via http geopend wordt (of de pagina zelf https is): browsers blokkeren een http-pagina in een https-pagina, en een site kan inbedden zelf verbieden |
| `gear` | keerkoppeling: drie vakjes R N D (zoals de gashendel: achteruit links; bijv. 220×40); `fwd_entity` aan = D, `aft_entity` aan = R, geen van beide = N; alleen de actieve letter is groen; `tap_action` (bijv. navigeren naar de Diesel-pagina) |
| `toggle` | `style: pill`: kleine schuifschakelaar (bijv. 52×30, `label` als tooltip), bijv. Webasto aan/uit in de kop van een paneel. Anders een rijknop (bijv. 219×48): `label`, `entity`, `icon`. Een tik schakelt (of `tap_action`), BEZIG tot de terugmelding; een lamp toont zijn helderheid en kleurt zacht geel (`--light`), andere knoppen blauw. Een sensor toont zijn waarde (`unit`, `decimals`); `states: { "on": LEK, "off": DROOG }` hernoemt toestanden en `on_tone: alarm | warn` kleurt de aan-toestand rood of oranje (lek, batterij laag). Lampen krijgen rechts een knop (zon-icoon) die het **standaard more-info-venster van HA** opent om te dimmen (`more_info: false` om weg te laten, `true` om hem bij andere entiteiten te tonen) |
| `light_group` | lichtgroep (448×56): `label`, `entity` (de groepslamp), `icon`, `step` (standaard 5). Tik = hele groep aan/uit; − / + dimmen in stappen van 5 %; + op een uit-groep zet hem aan op 5 %, − op 5 % zet hem uit. Toont de helderheid en hoeveel lampen aan zijn (uit het attribuut `entity_id` van de groep, anders `members: [...]`) |
| `climate` | ronde klimaatmeter (breedte = hoogte): bovenste helft de temperatuur (`entity`, `min`, `max`, `unit`, `decimals`) met een streepje voor `setpoint_entity`, onderste helft de ventilatorstand (`fan_entity`, `fan_min`, `fan_max`, `fan_names: { 6: Aut }` → woord en gestreepte boog), in het midden temperatuur, setpoint en ventilator. Met `setpoint_number` / `fan_number` (de `number`-entiteiten) komen er − en + in de hoeken van het vierkant: boven voor het setpoint, onder voor de ventilator; de gevraagde waarde knippert tot de terugmelding gelijk is (max. 10 s) |
| `stepper` | − waarde + voor een `number`/`input_number`: `label`, `entity` (wat ingesteld wordt), `state_entity` (de terugmelding die getoond wordt), `unit`, `decimals`, `min`/`max`/`step` (standaard uit de entiteit), `value_names: { 6: Aut }` (woord voor een waarde), `stacked: true` (label boven de knoppen). Na een tik knippert de gevraagde waarde tot de terugmelding gelijk is (max. 10 s) |

Met `dock: false` op de kaart blijven statusbalk en icoonbalk gewoon in de kaart (de layout-editor doet dat). Met vaste balken is de kaart zo hoog als zijn inhoud plus ruimte voor de icoonbalk (`height` is dan een bovengrens). Past hij tussen de balken, dan staat scrollen in de kiosk-modus uit. Alle pagina's hebben dezelfde grootte; met `fit_tolerance` (bijv. 1.1) mag een pagina die tot 10 % te lang is krimpen tot hij past, maar dan verspringt de grootte tussen pagina's. **Laptop, telefoon, iPad:** is het scherm breder dan het ontwerp (laptop, monitor), dan schaalt de kaart zo dat een heel ontwerpscherm (`screen_height`, standaard 800) in de hoogte past: geen scrollen, elke pagina even groot, de pagina in het midden en de balken over de volle breedte (`fit_screen: false` zet dat uit). Op een telefoon (kortste zijde < 600 px) schaalt hij op de breedte, zodat tekst leesbaar blijft (liggend scrolt een lange pagina); staand krijgt hij een **eigen telefoonindeling** (zie hieronder; met `phone: false` in plaats daarvan de melding *Draai je telefoon*, met de knop *Toch zo bekijken*). Een iPad schaalt zoals altijd op de breedte. Bestaande items passen zich aan: `panel` wordt een vlak met een kop in kleine kapitalen, `indicator` met `show_state: true` zet AAN/UIT rechts (`color: "var(--ok)"` voor de themakleur), `text` met `style: caption` / `title` / `label` / `body` krijgt de lettergrootte uit het ontwerp. Een `confirmation` toont in dit ontwerp de vraag als titel met werkwoorden op de knoppen (`yes: Inschakelen`, standaard Annuleren / Ja). Afbeeldingen worden in Rood nacht rood gefilterd; `image: tc90-romp` is alleen de romp, vrijstaand.

### Schema's met stromende leidingen

Voor systeemschema's – zie de views `sys-…` in `examples/plc-dashboard.yaml` (de tabs bovenin): Diesel, Fuel, Generator, DC-bus koeling, Bow thruster, Zeewater, Zoetwater, Vuilwater, Bilge, Accu's, Webasto en Navigatie, omgezet uit `Overszichtstekeningen/`. Bovenaan elke view staan de entiteiten die nog niet in de PLC-lijst voorkomen.

Onder elk schema (scrollen) staat de bediening uit het oude HA-dashboard: sensortegels met kleuren, start-checklists, *Prepare start*, schakelaars en automaten. *Webasto* en *Navigatie* zijn tabs zonder schema, alleen met bediening.

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

Symbolen: `pump`, `valve` / `gate_valve` (afsluiter), `ball_valve` (kogelkraan), `globe_valve` (regelklep), `butterfly_valve` (vlinderklep), `check_valve` (terugslagklep), `three_way_valve`, `motor_valve`, `solenoid_valve` (magneetklep), `relief_valve` (veiligheidsklep), `instrument` (meter-bolletje met `letter`, standaard PI), `vessel` (vat), `compressor`, `heater`, `sight_glass` (kijkglas), `reducer` (verloopstuk), `motor` (cirkel met M), `hx` (warmtewisselaar), `filter`, `strainer` (zeewaterinlaat), `propeller` (draait), `jet_thruster` (staande elektromotor op pomphuis met een aansluiting links; de as draait als hij aan staat), `outlet` (overboord), `smoke` (rook bij de uitlaat), `engine`, `generator` (cirkel met `letter`, standaard G; M voor een motor), `converter` (`glyphs: ["~", "="]`), `battery`, `fan` (draait). Ze lichten op (`color`, standaard groen) via `active_entity` of `entity` met dezelfde opties `active_above` / `active_below` / `active_abs` / `active_state`; `alarm_entity` maakt ze rood. Verder `label`, `label_position: above`, `label_offset: [dx, dy]` (label verschuiven), `rotation` (graden), `size` of `width`/`height`.

`hull` tekent de romp van bovenaf (`bow: left` om te spiegelen). `text` met `boxed: true` krijgt `active_entity` (groen) en `alarm_entity` (rood) – gebruikt voor motor, gearbox en e-motor.

De lettertypes (Barlow Condensed, JetBrains Mono) komen van Google Fonts; zonder internet valt de kaart terug op Roboto Condensed / Arial Narrow. Zet `fonts: false` om ze niet te laden.

## Demo zonder Home Assistant

```bash
python3 -m http.server 8765
```

Open daarna http://localhost:8765/demo/ — de demo laadt `examples/dashboard.yaml` met nep-entiteiten, zodat je de layout kunt aanpassen zonder HA.

http://localhost:8765/demo/plc.html?view=sys-diesel (of een ander `sys-…`-pad) toont een systeemschema, met een vinkje per entiteit om leidingen te laten stromen.

## Layout-editor

Schermen aanpassen zonder YAML te typen:

```bash
python3 demo/edit_server.py
```

Open http://localhost:8770/demo/editor.html en kies een view.

- Sleep blokjes, symbolen en leidingen; `Shift`+klik of een kader trekken selecteert meer tegelijk (een kader trekken kan ook óp de romp).
- Pijltjes verschuiven 1 px (`Shift` = 10 px); het raster (1–20 px) staat bovenin.
- Leiding geselecteerd: sleep de bolletjes, dubbelklik op de leiding voegt een knikpunt toe, dubbelklik op een bolletje haalt het weg. Punten klikken recht op hun buurpunt.
- Het label van een symbool (bijv. *Inlet V3* onder een zeewaterinlaat) is los te verslepen; de tekst staat rechts bij `label`.
- Hoekje rechtsonder = groter/kleiner. Romp, panelen en brede balken verschuiven pas als je ze eerst aanklikt.
- **Toevoegen**: kies een type uit de lijst met voorbeelden (leidingen, kleppen, pompen, warmte en filters, tanks en meters, elektrisch, tekst, en het TC90-ontwerp: tegel, schakelaar, hotspot, ronde meter, waardepaneel, romp).
- **TC90-schermen**: statusbalk en icoonbalk liggen vast; klik erop om titel, subtabs of knoppen te wijzigen. Gedeelde lijsten staan rechts als `*naam` (bijv. `tabs: *water_tabs`) en blijven gedeeld na *Toepassen*; met een andere `*naam` hoort de pagina bij een andere groep. Een hotspot sleep je aan het bolletje (`x`/`y`); een ronde meter wordt alleen breder of smaller. **Thema** bovenin toont het scherm in Nacht, Dag of Rood nacht (alleen om te bekijken). De schermachtergrond volgt hier het thema.
- Rechts staan alle opties van het geselecteerde onderdeel (entiteit, kleur, label…) om te bewerken, plus dupliceren, verwijderen, voor/achter en nieuwe onderdelen.
- `Cmd/Ctrl+Z` ongedaan maken, `Cmd/Ctrl+S` opslaan in `examples/plc-dashboard.yaml`. Opmerkingen en opmaak in het bestand blijven staan.
- **Kopieer YAML** zet het hele dashboard op het klembord om in HA te plakken (Raw configuration editor).
- **Kleuren**: kies voor de geselecteerde onderdelen een kleur (of medium bij leidingen); × zet de standaardkleur terug. Onder *Scherm* staat de achtergrond, onder *Leidingkleuren* de kleur per medium voor alle schermen (`media_colors` op de kaart).
- **Nieuw scherm**: titel, pad en soort (systeemschema met romp, leeg, of kopie van het huidige scherm), met statusbalk en icoonbalk. Kies de plaats: als subtab onder Voortstuwing, Energie, Water of Schip (de knop in de icoonbalk licht dan ook op), als eigen knop in de icoonbalk (alleen als er minder dan acht zijn), of niet in de navigatie. **Scherm verwijderen** haalt de pagina ook uit de subtabs en de icoonbalk.

## Veiligheid

Deze kaart is een bedieningsinterface, geen veiligheidssysteem. Noodstoppen en hold-to-run-functies moeten altijd ook hardwarematig (PLC/relais) geborgd zijn, inclusief een timeout als de verbinding met HA wegvalt.

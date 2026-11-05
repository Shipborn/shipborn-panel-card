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
| `TC90 JOAL/*.png` | De juiste interieur- en dektekening (hoge resolutie, transparant), bron van `tc90-interieur` en `tc90-dekplan`. Niet in git. |
| `_ds_bron/*.webp` | Bronnen van de ingebouwde afbeeldingen (logo `shipborn-joal`, `tc90-zijaanzicht`, `tc90-dekplan`, `tc90-interieur`). De kaart bevat ze als base64 in `IMAGES`; alleen nodig om een afbeelding te vervangen. Niet in git. |
| `tools/interieur_zones.py` | Genereert de ruimtes (`zone` met `zoom`) op het interieurplan uit `Entiteiten-HA.xlsx`. |
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

1. Bepaal de juiste view (`sys-…` of `alarms`) en zet de onderdelen in een `panel` onder het schema (op schemapagina's begint de bediening rond `y: 669`; alles daaronder schuift mee). Verhoog `height` van de kaart zodat het past, met 96 px vrij onderaan voor de icoonbalk. Nieuwe bediening liefst met de TC90-items (`tile`, `switch`).
2. Vertaal: `tile` op een sensor → `value` met `style: tile`; aan/uit-sensor → `indicator`; `button.*` → `pushbutton`; `switch.*` → `pushbutton` met `led: green`; Jinja → er is géén template-engine in de kaart, dus de functie nabouwen (bijv. `text` met `attribute` voor een lijst-attribuut).
3. Werk `examples/plc-entiteiten.csv` bij (placeholder vervangen of regel toevoegen, met zekerheid).
4. Controleer in `demo/plc.html?view=…`; voeg zo nodig nep-states toe in `demo/plc.html`.
5. Nieuwe kaart-optie of item → ook `README.md` (tabel bij het item) en `VERSION` bijwerken.

## Opbouw van het dashboard (`plc-dashboard.yaml`)

- Eén view per scherm, `panel: true`, met precies één `custom:shipborn-panel-card` erin. Ontwerpbreedte altijd **1280 px**; de kaart schaalt mee met de schermbreedte. `height` verschilt per view (800 voor alleen een scherm, langer als er bediening onder het schema staat; de pagina scrolt dan).
- Elke kaart heeft `design: tc90` (ontwerp *TC90 JOAL Bediening*) en begint met hetzelfde kader:
  ```yaml
  - { type: statusbar, title: Water, tabs: *water_tabs, status: *tc_status }
  - { type: navbar, items: *tc_nav }
  ```
  De icoonbalk onderin (`&tc_nav`, acht bestemmingen: Schip, Energie, Voortstuwing, Water, Klimaat, Verlichting, Bilge, Alarmen) en de status rechtsboven (`&tc_status`) staan als anker in de eerste view (`sys-diesel`). Een bestemming met meer pagina's heeft subtabs in de statusbalk: `&voort_tabs` (Overzicht `voortstuwing`, Diesel, Generator, Boegschroef, Brandstof), `&energie_tabs` (Accu's `sys-power`, DC-bus), `&water_tabs` (Zeewater, Zoetwater, Vuilwater), `&ship_tabs` (Zijaanzicht, Dek en interieur); het anker staat in de eerste view van die groep. Een nieuwe pagina = view toevoegen, een regel in de juiste `&…_tabs` en het pad in `match` van die bestemming in `&tc_nav`.
- Statusbalk en icoonbalk staan vast boven- en onderaan het scherm (ook bij scrollen); houd de eerste 56 px van elke kaart vrij. De kaart is zo hoog als zijn inhoud plus ruimte voor de icoonbalk (`height` is alleen nog een bovengrens). Past een pagina tussen de balken, dan staat scrollen uit (in kiosk); anders scrolt hij. Pagina's krimpen niet (dan versprong de grootte tussen tabs, bijv. Accu's ↔ DC-bus); `fit_tolerance` zet dat per kaart weer aan. Inhoud tot `y: 700` past op 1280×800 (12 px boven de icoonbalk). Vast op 1280×800 en iPad: Voortstuwing, Zeewater, Bilge, Klimaat, Verlichting, de drie Schip-pagina's en Alarmen; op een iPad Pro (1366×1024) ook Accu's. Er is geen alarmbalk meer (op verzoek weggehaald); actieve alarmen staan als getal op Alarmen in de icoonbalk. Het item `alarmbar` bestaat nog in de kaart.
- Tab-paden zonder `/` (bijv. `sys-fuel`) verwijzen naar een view in hetzelfde dashboard, ongeacht de URL van het dashboard.
- Schema: `hull` (romp) op **precies** `{ type: hull, x: 20, y: 49, width: 1240, height: 600 }` op elke schemapagina (de omtrek moet overal gelijk zijn), met daarin `pipe`-items en symbolen; daaronder vanaf `y: 669` de `panel`s met de bediening. De getekende romplijn ligt 27,5 px onder de bovenkant van zijn vak, dus met het vak op `y: 49` ligt de romplijn 20 px onder de statusbalk (op verzoek, net als de andere pagina's). Overboord-uitlaten op de romplijn staan op `y: 76`. Pagina's zonder romp beginnen op `y: 76` (20 px onder de statusbalk). Schuif je een schema, schuif dan alle coördinaten (ook `points`) mee en laat de romp staan.
- Kiosk: elke kaart heeft `kiosk: true` (HA-balken verborgen). Een tik op het Shipborn JOAL-logo in de statusbalk toont de balken van HA (naar andere HA-pagina's), nog een tik verbergt ze. De oude randstroken (even op de boven-/linkerrand blijven) gelden alleen nog zonder TC90-statusbalk of met `kiosk_toggle: edge`.
- Stijl: items op één regel in flow-stijl (`- { type: …, x: …, y: … }`), opmerkingen in het Nederlands, secties met `# ---- … ----`. De editor bewaart die opmaak.
- Entiteiten met `.plc_` in de naam zijn **placeholders** die (nog) niet in HA bestaan; ze tonen "—" of niets.

## Opbouw van de kaart (`dist/shipborn-panel-card.js`)

Eén custom element, `ShipbornPanelCard extends HTMLElement`, met shadow DOM. Geen framework.

- **Bovenaan:** `VERSION`, kleurtabellen (TC90: `TC_THEMES` met de kleuren per thema uit `tokens.json`, `TC_THEME_ORDER`/`TC_THEME_NAMES`, `TC_ICONS` met de lijn-iconen, `TC_WORDS` voor statuswoorden als AAN/DICHT, `TC_STYLE` met de CSS van het ontwerp), verder (`LED_COLORS`, `DESIGN_COLORS`, `MEDIA` voor leidingkleuren per medium), `STYLE` (alle CSS als string), `SYMBOLS` en `DESIGN_TYPES` (lijsten met item-types), ingebouwde afbeeldingen (`IMAGES`, o.a. het logo `shipborn-joal`) en hulpfuncties: `isOn`, `num` (met `factor`), `fmt`, `unitOf`, `color`, `activeOf` (actief-logica met `*_above` / `*_below` / `*_abs` / `*_state`), `colorOf` (de `colors`-regels), `viewPath`, `stamp`.
- **`setConfig` → `_build()`:** maakt het paneel (vaste ontwerpmaat `width`×`height`, geschaald met CSS `transform` in `_fit()`), tekent de vorm (`_shapeSvg`) en roept per item `_renderItem(item)` aan. Elk DOM-element krijgt `data-i` = index van het item; de editor gebruikt dat.
- **`_renderItem`:** `switch` op `item.type`. Twee families:
  - *Fysiek paneel* (eerste ontwerp): `group`/knop (`_group`, `_button`, `_momentary` voor hold-to-run), `estop`, `throttle`/`_lever`, `knob`, `joystick`, `screen` (andere HA-kaart in een bezel), `box`, `label`, `image`.
  - *Schermontwerp* (`_d…`-methoden): `panel`, `gauge`, `bar`, `tank`, `value`, `indicator`, `pushbutton`, `nav`, `alarm`, `block`, `line`, `text`, `pipe`, `hull`, en alle schema-symbolen via `_dSymbol` (pompen, kleppen, `hx`, `converter`, `generator`, `propeller`, `jet_thruster`, …).
  - *TC90-ontwerp* (`_t…`-methoden, alleen zinvol met `design: tc90`): `statusbar` (`_tStatusbar`: logo-knop, titel, subtabs, statusiconen, klok, themaknop), `navbar` (`_tNavbar`: icoonbalk met alarmbadge), `tile`, `switch` (BEZIG tot de terugmelding), `hotspot`, `dial`, en `alarmbar` (niet meer gebruikt). Plus `zone` (`_dZone`: tikbaar vlak op een tekening met `zoom` of `popup`).
  - Onbekend type → rood vak `? type (vVERSION)`, zodat het opvalt.
- **Updates:** elk item dat van een entiteit afhangt, registreert een functie in `this._updaters`; de `hass`-setter roept ze allemaal aan bij elke statuswijziging. Nieuwe items volgen dat patroon.
- **Plaatsing:** `_place(node, item, defW, defH)` zet `x`, `y`, `width`/`height`/`size`. Let op: HA's YAML 1.1-parser maakt van de sleutel `y` soms `true`; daarom wordt `item.true` als terugval gelezen (ook in de editor).
- **Acties:** `_handleAction` (toggle, more-info, perform-action, navigate, url, fire-dom-event), `_confirm` (eigen donker Ja/Nee-venster, met `text_on`/`text_off`), `_toggle` (kiest de juiste dienst per domein: switch/light/input_boolean, button/input_button → press, valve → toggle, …), `_turn`, `_setValue`.
- **Vaste balken (TC90):** `_dockIt` hangt statusbalk en icoonbalk in een `position: fixed`-laag (`tc-dock`) buiten het geschaalde paneel; `this._docks` houdt ze bij. Met `dock: false` (editor) blijven ze in het paneel.
- **Maat en scrollen:** `_fit()` schaalt het paneel op de breedte. Met vaste balken is de hoogte `_contentBottom()` (gemeten onderkant van de inhoud) + 12 + 88 voor de icoonbalk, met `height` als bovengrens. Krimpen naar de schermhoogte alleen met `fit_tolerance` > 1. `_lockScroll` zet het scrollen van de pagina uit als een pagina in kiosk past. `_fit` zet ook de docks op de juiste plek en schaal.
- **Thema's:** `_setTheme` bewaart de keuze in `localStorage` (`shipborn-tc-theme`) en meldt het aan de andere kaarten; `_applyTheme` zet de variabelen; `_syncTheme` vergelijkt bij elke `hass`-update en bij het `storage`-event het bewaarde thema (HA hergebruikt views, dus alleen bij opbouwen lezen is niet genoeg).
- **Kiosk:** `_kioskOn`/`_kioskOff` verbergen de HA-header en zijbalk en kleuren de pagina rond de kaart (`page_background`); niet in bewerkmodus. Een tik op het logo wisselt dat (`kiosk_toggle: edge` geeft de oude randstroken terug). Omdat HA's zijbalk-opmaak per versie verschilt, meet `_kioskOn` waar de kaart staat en trekt hij hem met negatieve marge naar de linkerrand (`_kioskFlatten`, opnieuw bij elke `_fit`). Op TC90-pagina's gaan ook de bovenmarges naar 0 en houdt de kiosk geen iPad-veilige zone (`safe-area-inset-top`) vrij: de statusbalk staat bovenaan, dus die ruimte gaf alleen een gat eronder.
- **Lettertypes:** Barlow Condensed en JetBrains Mono van Google Fonts (`fonts: false` om uit te zetten).
- Conventies in de code: Engelse commentaarregels boven elke methode in één zin, compacte stijl, geen afhankelijkheden.

## Layout-editor (`demo/editor.html`)

- ES-module die de kaart zelf laadt en `yaml@2.5.1` (`parseDocument`) gebruikt, zodat opmerkingen, ankers (`&tc_status`, `&tc_nav`, `&…_tabs`) en flow-stijl bewaard blijven bij opslaan.
- Werkt op `views[vi].cards[0].items`: selecteren, slepen (met raster), leidingpunten bewerken, labels los verslepen (`label_offset`), formaat wijzigen, eigenschappen rechts bewerken, items toevoegen uit een palet (`PALETTE`), kleuren en `media_colors`, schermen toevoegen/verwijderen (met de gedeelde kop en een tab).
- Opslaan (`Ctrl+S`) doet een `PUT` naar `edit_server.py`, die alleen `examples/plc-dashboard.yaml` mag schrijven en alleen op `127.0.0.1` luistert.
- Komt er een nieuw item-type of optie in de kaart, voeg het dan ook aan het palet en, waar zinvol, aan de eigenschappenlijst van de editor toe.
- TC90 in de editor: de kaart wordt met `dock: false` getekend, dus statusbalk en icoonbalk staan in het werkvlak. Ze zijn alleen selecteerbaar (`FRAME`), niet te verslepen of te dupliceren. Gedeelde lijsten (aliassen) toont het eigenschappenvak als `*naam` en zet *Toepassen* terug als alias. Nieuwe schermen kunnen subtab worden van een `&…_tabs`-lijst (de bijbehorende knop in `&tc_nav` krijgt het pad in `match`). Bekend: het teruglezen van de YAML is niet helemaal gelijk (inspringing van het meerregelige `confirmation`-blok op Diesel en Generator), dus de status springt na elke wijziging op *niet opgeslagen*; de inhoud is gelijk.

## Git en conventies

- Commits vanuit de nieuwste dagmap; berichten in het **Engels**, gebiedende wijs, korte onderwerpregel, daaronder kort waarom/wat (zie `git log`). Documentatie en UI-teksten in het Nederlands.
- Auteur: `admin <jerom.dirven@gmail.com>`; staat lokaal in `.git/config` van de dagmap. Bij een verse `git clone` op een andere pc opnieuw instellen:
  ```bash
  git config user.name admin
  git config user.email jerom.dirven@gmail.com
  ```
- Niet in git (bewust): `.claude/`, `Overszichtstekeningen/`, `TC90 JOAL/`, `Voorbeeld foto's plc/`, `_ds_bron/`, `examples/Entiteiten-HA.xlsx`. Die komen alleen via de Dropbox-map mee.
- Er is geen testsuite; controleren gebeurt in `demo/plc.html` en daarna in HA.

## Op een andere pc beginnen

- **Met de Dropbox-map:** open de bovenmap `18.Bestruringspagina` en voer `nieuwe-dag.ps1` uit; alles (inclusief `.git` en de niet-geversioneerde bestanden) komt mee.
- **Zonder Dropbox:** `git clone https://github.com/Shipborn/shipborn-panel-card.git <YYMMDD>`, git-auteur instellen (zie boven). Tekeningen, screenshots en de HA-export ontbreken dan.
- Controleer of `python` werkt (anders `python3`) en pas `.claude/launch.json` daarop aan.

## Stand van zaken en open punten (05-11-2026, v0.5.12)

- **Nieuw ontwerp in aanbouw:** het design system *TC90 JOAL Bediening* (claude.ai, `https://claude.ai/artifact/6kF93PXWxgEZgw4ChTWkMj`) is de basis voor alle schermen. In de kaart: `design: tc90` (thema's Nacht/Dag/Rood nacht, items `statusbar`, `navbar`, `tile`, `switch`, `hotspot`, `dial`, en het ongebruikte `alarmbar`; zie README). Alle pagina's staan in het nieuwe kader (statusbalk met subtabs, icoonbalk); de systeemschema's en hun bediening zijn verder nog de oude onderdelen, die nu wel de themakleuren volgen. Alleen `voortstuwing` is helemaal in de nieuwe stijl (schip met hotspots, tegels, schakelaars); de andere bestemmingen kunnen zo'n overzichtspagina nog krijgen. Brandstof staat onder Voortstuwing (keuze van Claude, niet van de gebruiker). De kleuren in `TC_THEMES` komen uit `tokens.json` van dat design system: verandert het ontwerp, neem ze dan opnieuw over.
- Views: `sys-diesel`, `sys-fuel`, `sys-generator`, `sys-dcbus`, `sys-bowthruster`, `sys-seawater`, `sys-freshwater`, `sys-wastewater`, `sys-bilge`, `sys-power`, `sys-webasto`, `sys-navlights`, `voortstuwing`, `ship-side`, `ship-deck` (dekplan en interieur samen), `alarms`. De Main-pagina en de oude tabs (Main/Diesel/Electric/PMS/Tanks) zijn op 29-10 weggehaald.
- De `ship-…`-pagina's (tab **Schip**, onderling gewisseld met `&ship_tabs`: *Zijaanzicht* en *Dek en interieur*) tonen de aanzichten uit het canvas "TC 90 aanzichten"; op verzoek staan dekplan (boven) en interieur (onder) samen op `ship-deck`, de aparte pagina `ship-interior` is weg. de tekeningen staan als WebP in `IMAGES` (`tc90-zijaanzicht`, `tc90-dekplan`, `tc90-interieur`). Interieur en dekplan komen sinds v0.5.11 uit de map `TC90 JOAL` (transparant, zonder wit vel, 2200 px breed); beide op `x: 42, width: 1210`: dekplan op `y: 76`, interieur eronder op `y: 377` (romp 16 px onder die van het dek), daaronder het scènepaneel *Algemeen*. De pagina scrolt op 1280×800 iets (inhoud tot 889). De ruimtes in de YAML en de `room(...)`-regels in `tools/interieur_zones.py` horen bij die plaatsen; verschuif je een tekening, schuif dan beide mee. Het script vindt zijn plek aan de markeringen `# ---- dek: zones` … `# ---- einde dek ----` en `# ---- ruimtes:` … `# ---- algemeen:`, nu allemaal in `ship-deck`. Het interieurplan (`ship-interior`) heeft tikbare `zone`s per ruimte met `zoom`: inzoomen op de ruimte en rechts een paneel met alle lampen, groepen en apparaten (plus scènes, Webasto, lekdetectie, bilgepomp/boiler); onderaan scènes voor het hele schip. Die zones worden **gegenereerd** door `tools/interieur_zones.py` (uit `examples/Entiteiten-HA.xlsx`, vereist openpyxl); het script vervangt alles tussen `# ---- ruimtes:` en `# ---- algemeen:` in die view, dus handwerk daar gaat verloren bij opnieuw genereren — pas dan liever het script aan (kamerindeling, labels, volgorde). De zones zijn op het oog geplaatst (`room(...)`-regels in het script); de items in een `zoom`/`popup` toont de layout-editor niet. `popup` (een los venster) bestaat ook nog. De indeling per ruimte (secties en namen) volgt het HA-dashboard van de bemanning; wat daar niet in stond komt onder *Overig*. Het script maakt ook de zones op het **dekplan** (tussen `# ---- dek: zones` en `# ---- einde dek ----`). Het zijaanzicht heeft nog geen bediening (voorstel: mast- en navigatieverlichting op hoogte).
- De compressordruk (`sensor.al1590_er_compressor_manifold_pressure`) is in **bar** (bevestigd door de gebruiker); geen `factor` gebruiken.
- `binary_sensor.engine_room_leak_schroefas_water_leak` (lekdetector schroefas) staat in de Engine room, maar stond nog niet in `Entiteiten-HA.xlsx`; controleer of hij in HA bestaat.
- Een `zone` kan in de demo alleen met de vinkjes oplichten; de temperatuur- en Webasto-waarden zijn daar "—".
- **Nog niet gekoppelde placeholders** in het dashboard (bestaan niet in HA): `binary_sensor.plc_diesel_alarm`, `binary_sensor.plc_generator_alarm`, `binary_sensor.plc_jp1/2/3_alarm`, `binary_sensor.plc_bilge_anchor_box_high` / `_running`, `binary_sensor.plc_shore_water_valve_open`, `binary_sensor.plc_webasto_running`, `sensor.plc_battery_current`, `sensor.plc_bowthruster_setpoint`, `sensor.plc_electric_speed`, `sensor.plc_emotor_rpm`. Zie de CSV voor details en kandidaten.
- **Te bevestigen door de gebruiker** (in de CSV als `controleer`): bowthruster-setpoint = `sensor.er_thruster_status_bow_thruster_lever`? JT input = `sensor.er_thruster_status_jet_lever`? Daarna ook in het schema koppelen.
- Het linkervak van de alarmpagina en het getal op Alarmen in de icoonbalk lezen de lijst `alarms` van `sensor.er_alarm_status_active_alarms`.
- Voor de walstroominstelling (knoppen *Shore current − / +* bij DC-bus) is nog geen sensor met de huidige waarde bekend.
- Knoppen (`pushbutton`) vragen geen bevestiging, behalve waar `confirmation` is ingesteld; pompen en kleppen vragen wel Ja/Nee.
- Veiligheid: de kaart is een bedieningsinterface, geen veiligheidssysteem. Noodstop en hold-to-run moeten in de PLC geborgd zijn.

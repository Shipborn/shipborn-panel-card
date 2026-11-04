# Ontwikkelgeschiedenis

Hoe de besturingspagina van de TC90 tot stand kwam, en waarom het project eruitziet zoals het nu is. Gebouwd met Claude Code; per stap staat de commit erbij (`git show <hash>` voor de details).

## Uitgangspunt

Aan boord van de TC90 draaide een gewoon Home Assistant-dashboard: tegels, `button-card`-sjablonen en `markdown`-kaarten met Jinja, op de Wago-PLC's en andere entiteiten. Het doel was een bedieningsomgeving die eruitziet en werkt als een echt scheepsbedieningspaneel/PLC-scherm:

- donker console-ontwerp, leesbaar op een aanraakscherm van 1280×800 in kiosk-modus;
- per systeem een schema (P&ID-achtig) met leidingen die zichtbaar stromen als een pomp of motor draait, gebaseerd op de overzichtstekeningen (`Overszichtstekeningen/`) en screenshots van het PLC-ontwerp (`Voorbeeld foto's plc/`);
- de bestaande bediening uit het oude dashboard eronder, zodat er niets verloren gaat;
- installeerbaar en updatebaar via HACS, zonder build-stap.

Daarom is gekozen voor één zelfgeschreven Lovelace-kaart in één JavaScript-bestand, met alle onderdelen absoluut gepositioneerd in een vaste ontwerpmaat die meeschaalt. De schermen zelf zijn YAML-configuratie van die kaart.

## 27-10-2026 – fysieke bedieningspanelen

- `6212166` **Shipborn Panel Card**: een kaart die een fysiek bedieningspaneel nabootst – zwarte panelen (recht of schuin), knoppen met status-LED's, hold-to-run, noodstop, throttle-hendels, draaiknoppen, joystick en een "scherm" met een andere HA-kaart erin. `examples/dashboard.yaml` bevat de bedieningspagina (DP, Main Propulsion, Bow/Stern, General, Passerelle, Hatch, Gangway, MFD). HACS-installatie en `demo/index.html` om zonder HA te testen.

## 28-10-2026 – PLC-schermen, systeemschema's, koppelen, editor

Op deze dag verschoof het zwaartepunt van het fysieke paneel naar volledige PLC-schermen.

- `d13c74f` (v0.2.0) Items in het donkere schermontwerp: `gauge`, `bar`, `tank`, `value`, `indicator`, `pushbutton`, `nav`, `alarm`, PMS-`block`, `line`, `text`. Nieuw bestand `examples/plc-dashboard.yaml` met een Main-pagina op placeholder-entiteiten (`*.plc_*`) en `demo/plc.html` met nep-states.
- `497bdf3` Oplossing voor HA's YAML 1.1-parser die de sleutel `y` als `true` leest (alles stond bovenaan): de kaart valt terug op `item.true`.
- `456a59c` Leidingen (`pipe`) met bewegende streepjes, P&ID-symbolen (pomp, klep, warmtewisselaar, filter, zeewaterinlaat, schroef, uitlaat, rook) en de romp (`hull`).
- `8ac3db4` Tien systeemviews (diesel, brandstof, generator, DC-bus koeling, boegschroef, zeewater, zoetwater, vuilwater, bilge, accu's), overgetekend van de overzichtstekeningen. Nieuwe symbolen: motor, generator, converter, accu, ventilator.
- `8bff32f`, `fb66660` Navigatie: systeemviews als subviews, tab-paden relatief aan het huidige dashboard (werkt onafhankelijk van de dashboard-URL).
- `73a20b5` **`examples/plc-entiteiten.csv`**: lijst van alle gebruikte placeholders per pagina, met een kolom voor de echte HA-entiteit. De gebruiker leverde daarnaast een export van alle HA-entiteiten (`Entiteiten-HA.xlsx`).
- `18472a8` Placeholders vervangen door de gevonden HA-entiteiten; `factor` voor ruwe Wago-waarden (tankniveau, mbar). Wat niet gevonden werd, bleef `*.plc_*`.
- `f64a714` Logo Shipborn/JOAL ingebouwd in de kaart (`image: shipborn-joal`).
- `29e704d`, `043ff1a` **Kiosk-modus**: HA-balken verbergen, randen om ze terug te halen, pagina rond de kaart in de kaartkleur.
- `ddbc422`, `532eb3a` **Layout-editor** (`demo/editor.html` + `demo/edit_server.py`): slepen, eigenschappen bewerken, schermen toevoegen/verwijderen, kleuren per medium – en opslaan in de YAML zonder opmerkingen of opmaak te verliezen. Vanaf hier werden layouts vooral visueel aangepast (`4589c34`).
- `874e77c`, `0c02ea3` Uitgebreide symbolenset (afsluiters, kogelkraan, regelklep, vlinderklep, terugslagklep, driewegklep, magneetklep, veiligheidsklep, meter, vat, compressor, verwarmer, kijkglas, verloopstuk) met een palet in de editor; labels los versleepbaar.
- `de773e4` Onbekende item-types als rood vak in plaats van onzichtbaar (helpt bij een kaart die achterloopt op de YAML).
- `3a8c051` Elke zeewaterinlaat een vlinderklep op de echte `valve.er_ventielblok_*`-entiteit.
- `0ee6b1c`, `f45059f`, `ef3dab3` Tankniveaus: HA levert al procenten (factor weg); tankvakken vullen zich tot het niveau (`level_entity`).
- `65e2df2` **Bediening uit het oude dashboard onder elk schema**: sensortegels met drempelkleuren (`colors`, zoals de oude `button-card`-sjablonen), start-checklists (`indicator` met `off_color`), prepare/close-knoppen, schakelaars en automaten. Nieuwe tabs Webasto en Navigatie; `fire-dom-event` voor browser_mod.

## 29-10-2026 – bedienen vanuit het schema, alarmpagina

- `98bf4c4` Pomp aantikken = schakelen na een eigen donker Ja/Nee-venster ("Wilt u de pomp aanzetten?"); alle bevestigingen gebruiken dat venster (`text_on`/`text_off`).
- `dccd42c` Kleppen op `valve.*` openen/sluiten met bevestiging; lage bilge-sensoren zichtbaar; HP1/HP2 als DC-DC-converter.
- `b91ef05` Symbool `jet_thruster` (staande motor op pomphuis).
- `e2e1b1f` **Herindeling**: de Main-pagina en de oude tabs (Main/Diesel/Electric/PMS/Tanks/Systemen) verdwenen; de systeemschermen staan direct in de tabbalk bovenin (YAML-anker `&sys_tabs`). Nieuwe **Alarmen**-pagina. Numerieke states alleen nog bij hele getallen, zodat alarmtekst als "026 Jetvalve 3 …" niet als 26 wordt getoond.

## 30-10-2026 – dagmappen, nieuwe ER-entiteiten

- Lokale werkwijze met **dagmappen** `YYMMDD/` (kopie per werkdag, inclusief `.git`) en het script `nieuwe-dag.ps1` in de bovenmap. Eerste dagmappen: `261029` (stand tot en met 29-10) en `261030`.
- `a4057fd` (v0.4.18) Nieuwe ER-statusblokken uit HA verwerkt:
  - alarmpagina: linkervak toont de lijst `alarms` van `sensor.er_alarm_status_active_alarms` (de Jinja-lus uit het oude dashboard, nagebouwd met de nieuwe `text`-optie `attribute`);
  - DC-bus: paneel *PMS status (BMS & BGC)* (`sensor.er_pms_status2_*`), knoppen Max SoC − / + en Shore current − / +; DC-busspanning overal op de Wago-entiteit;
  - boegschroef: paneel *Thruster status* (`*.er_thruster_status_*`) met aan/uit-knoppen.
- `85d76c2` Koppellijst (`plc-entiteiten.csv`) bijgewerkt met deze entiteiten; overdrachtsdocumentatie (`CLAUDE.md`, deze geschiedenis).
- `28e3ccb` (v0.4.19) De alarmbalk op elke pagina las nog de placeholders `sensor.plc_active_alarm` / `binary_sensor.plc_alarm_active` en meldde daardoor altijd "Geen actieve alarmen". Hij leest nu ook de lijst `alarms` van de ER-alarmstatus (`alarm` met `attribute`) en gaat bij een tik naar de alarmpagina.
- `28e3ccb` Minder loze ruimte: op alle tien schemapagina's staat de romp nu direct onder de alarmbalk (`y: 112` i.p.v. 160) en alles eronder schuift 48 px mee. De romp is op elke pagina exact gelijk gezet (Diesel stond op `y: 158`, Brandstof op `x: 28`).

## 01-11-2026 – aanzichten van het schip

- Dagmap `261101` (op een Mac zonder PowerShell met de hand aangemaakt, zelfde stappen als `nieuwe-dag.ps1`).
- (v0.4.20) Drie nieuwe pagina's onder de tab **Schip**: `ship-side` (zijaanzicht/zeilplan), `ship-deck` (dekplan) en `ship-interior` (interieurplan), uit het canvas "TC 90 aanzichten". Elke pagina heeft de gewone kop, een subnavigatie tussen de drie aanzichten (`&ship_tabs`) en de tekening op een wit vel. De tekeningen zitten als WebP in `IMAGES` (`tc90-zijaanzicht`, `tc90-dekplan`, `tc90-interieur`, samen ±94 kB), zodat HA geen extra bestanden nodig heeft.
- (v0.4.21) Nieuw item **`zone`**: een tikbaar vlak op een tekening dat oranje oplicht als er iets aan staat (`active_entity`) en rood knippert bij een alarm (`alarm_entity`), met een label en optioneel een waarde (temperatuur). Een tik opent een venster (`popup`) met eigen items, in dezelfde schaal als de kaart; het Ja/Nee-venster verschijnt daar bovenop.
- Interieurplan: negen zones (Aft peak, Owners cabin, Engine room, Dining, Galley, Main cabin, Crew cabin, Guest cabin, Front peak) met per ruimte de CTD-verlichtingsscènes (Aan/Uit/50%/Bed), de hoofdlampen, de Webasto-airco (aan/uit, instelling, ventilator, temperatuur), de lekdetectie en waar aanwezig de bilgepomp of boiler. Onder de tekening de scènes voor het hele schip (Alles aan/uit, Nacht 50%, Plinten, Webasto). De plaats van de zones is geschat uit de tekening.
- (v0.4.22) **Inzoomen** in plaats van een venster: `zone` met `zoom` laat de tekening vloeiend inzoomen op de ruimte (max. 3×, anders wordt een kleine ruimte wazig en verdwijnt de omgeving) en schuift rechts een scrollend paneel in met álle lampen, groepen en apparaten van die ruimte uit HA, plus scènes, Webasto, lekdetectie en bilgepomp. *← Terug* zoomt weer uit. De inhoud wordt gegenereerd door `tools/interieur_zones.py` uit `Entiteiten-HA.xlsx` (kamer per entiteit, of naamvoorvoegsel als de kamer leeg is); koelkast, vriezer en watertank vullen vragen bevestiging.
- Indeling per ruimte overgenomen uit het **HA-dashboard van de bemanning** (views Crew, Main, Guest, Galley, Deck Lounge, Owners, Deck, Engine, Batterijen, Automatiseringen): dezelfde secties (bijv. *Zithoek*, *Werkkamer*, *Gang*, *Bad, toilet en douche*, *Stroomvoorziening*) en namen ("Plafond bed (2 spots)", "Afzuigkap", "Oven", "Sanibroyeur (was/droog)"). Wat daar niet genoemd werd staat per ruimte onder *Overig*. Nieuw: zone *Deck lounge* (salonspots, Webasto, beweging, printer) boven de *Engine room* (lekdetector schroefas, temperaturen machinekamer en generator), beweging en batterijen van de sensoren per ruimte, en vier zones op het **dekplan** (Loopplank, Bimini, Mast en giek, Dekverlichting). Onder het interieur *Alle lampen aan/uit* via `input_select.alle_verlichting` met de status ernaast; op de vuilwaterpagina de schakelaar *Legen vuilwatertank nr001*. `binary_sensor.engine_room_leak_schroefas_*` stond nog niet in de HA-export.

## 04-11-2026 – ontwerp TC90 JOAL

- Dagmap `261104` (op de Mac met de hand aangemaakt, zelfde stappen als `nieuwe-dag.ps1`).
- Eerst een instrumentenpaneel en onderhoudsscherm in de stijl van voorbeeldfoto's van jachtbediening (`4645221`); op verzoek teruggedraaid (`c1c0887`) ten gunste van het eigen design system.
- (v0.5.0) **`design: tc90`**: de kaart volgt het design system *TC90 JOAL Bediening* (claude.ai): kleuren als CSS-variabelen uit `tokens.json` (overgenomen in `TC_THEMES`), drie thema's Nacht / Dag / Rood nacht met een knop in de statusbalk (bewaard per scherm, geldt voor alle TC90-pagina's), Barlow-letters, de lijn-iconen van het ontwerp en een eigen Ja/Nee-venster met werkwoorden. Nieuwe items `statusbar`, `alarmbar`, `navbar` (icoonbalk onderin met alarmbadge), `tile`, `switch` (met BEZIG tot de terugmelding), `hotspot` (label op het schip) en `dial`. Tegels kleuren alleen bij een afwijking en alleen zolang `tone_entity` actief is ("rust tot er iets is"). Ingebouwd beeld `tc90-romp` (alleen de romp, transparant).
- **Voorbeeldpagina `voortstuwing`** (tab *Voortstuwing* in de oude tabbalk): romp met hotspots (diesel, e-motor, schroefas, boegschroef; tik = schema), twaalf tegels van de Volvo Penta en generator, vaarmodus als schakelaars met bevestiging, toerentalmeters en de status van de aandrijving. De icoonbalk wijst nog naar de bestaande pagina's.
- Het Ja/Nee-venster van de oude pagina's toont nu regeleinden.
- (v0.5.1) **Alle pagina's in het nieuwe kader.** De oude kop (logo, tabbalk, lifebeat, alarmbalk) is op elke pagina vervangen door statusbalk + alarmbalk, met onderin de icoonbalk. Op verzoek van de gebruiker staan Zeewater, Zoetwater en Vuilwater onder **Water** en Accu's en DC-bus onder **Energie**, met de keuze tussen die pagina's als subtabs in de statusbalk (`statusbar` met `tabs`). Verder: Voortstuwing (Overzicht, Diesel, Generator, Boegschroef, Brandstof), Schip (Zijaanzicht, Dekplan, Interieur), Klimaat, Verlichting, Bilge, Alarmen. De icoonbalk staat vast onderaan het scherm (ook bij scrollen); elke kaart is 96 px langer. De vaste kleuren van de oude onderdelen (schema's, tegels, knoppen, meters) zijn CSS-variabelen geworden met de oude kleur als terugval, zodat ze in een TC90-kaart de thema's volgen en daarbuiten ongewijzigd blijven. De layout-editor maakt nieuwe schermen met het nieuwe kader.
- (v0.5.2) Op verzoek de **alarmbalk weggehaald** op alle pagina's (het aantal alarmen staat op Alarmen in de icoonbalk) en de **statusbalk vastgezet** bovenaan het scherm, net als de icoonbalk onderaan; hij schuift mee onder de HA-kop als die zichtbaar is (`--header-height`). `dock: false` houdt beide balken in de kaart; de layout-editor gebruikt dat.
- (v0.5.3) In de kiosk-modus bleef links een witte strook: de ruimte die HA voor de verborgen zijbalk vrijhoudt. De oude oplossing zocht één vaste structuur (`ha-drawer` / `.mdc-drawer-app-content`) die in nieuwere HA-versies anders is. Nu zet de kaart elke linkermarge en -opvulling tussen zichzelf en de pagina op 0 (en terug bij tonen of verlaten), zodat de kaart de volle breedte gebruikt.
- (v0.5.4) In HA 2026.10 (frontend 20260930) bleef de strook: daar is het geen marge. De kiosk meet nu waar de kaart staat: het buitenste element dat hem nog van de linkerrand houdt krijgt een negatieve marge (en zo nodig meer breedte), en een smalle strook die nog over de linkerrand ligt wordt verborgen. Dat loopt opnieuw als de kaart van maat verandert. Getest met een nagebootste zijbalk als marge, als rasterkolom en als vaste overlay. Het versienummer staat als tooltip op het logo.
- (v0.5.5) Het thema ging niet mee naar een andere pagina: HA bouwt een eerder geopende view niet opnieuw op maar hangt dezelfde kaart terug, en die las het bewaarde thema alleen bij het opbouwen. Nu neemt een kaart bij elke terugkeer op het scherm het bewaarde thema over.
- (v0.5.6) Van Klimaat naar Verlichting ging het thema in HA nog steeds niet mee (in de demo wel; de oorzaak in HA is niet gevonden). Daarom vergelijkt elke TC90-kaart nu bij elke statusupdate van HA het bewaarde thema met het zijne, en reageert hij op een themawissel in een ander venster (`storage`-event), los van hoe HA de view hergebruikt.
- De compressordruk is in bar, niet in mbar zoals in de koppellijst stond (de gebruiker zag de Diesel-pagina goed en Overzicht op 0,0 bar). `factor: 0.001` en de grens `2999` weggehaald op Voortstuwing en Generator; demo en koppellijst op bar gezet.

## Lessen en keuzes die je moet kennen

- **Geen build-stap**: `dist/shipborn-panel-card.js` is de bron. Dat houdt HACS-updates simpel (push = update) en maakt bewerken op elke pc mogelijk zonder Node.
- **De YAML in de repo is leidend**, niet de configuratie in HA: elke update wordt in zijn geheel geplakt.
- **Placeholders `*.plc_*`** markeren onderdelen uit het PLC-ontwerp waarvoor (nog) geen HA-entiteit bestaat; ze worden stap voor stap vervangen zodra de PLC/HA ze levert (zoals de `er_*`-blokken op 30-10).
- **Geen Jinja in de kaart**: functies uit `markdown`-sjablonen worden nagebouwd met kaart-opties.
- **HA-eigenaardigheden**: YAML 1.1 (`y` → `true`), subviews en relatieve paden, de theme-achtergrond rond een panel-view – allemaal in de kaart opgevangen.

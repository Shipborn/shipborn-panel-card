# Generated automations

HA-code die bij het dashboard hoort. Deze map gaat mee in git; Home Assistant leest hem niet zelf: kopieer de bestanden naar HA zoals hieronder.

| Bestand | Inhoud |
|---|---|
| `script_energy_inverters_opstarten.yaml` | Het script *opstarten*, klaar om te plakken in de script-editor van HA (YAML-modus). |
| `script_energy_inverters_afsluiten.yaml` | Het script *afsluiten*, idem. |
| `energy_inverters.yaml` | Alles in één package (alleen nodig als HA packages gebruikt): `input_text.energy_inverters_status` + scripts `script.energy_inverters_opstarten` (veld `bron`: `shore` / `generator` / `battery`) en `script.energy_inverters_afsluiten`. |
| `script_generator_opstarten.yaml` | Het script *Generator opstarten*, klaar om te plakken. |
| `generator_opstarten.yaml` | Package: `input_text.generator_opstarten_status` + `script.generator_opstarten`, met bovenaan de uitleg van stappen en status. |
| `script_generator_afsluiten.yaml` | Het script *Generator afsluiten*, klaar om te plakken (geen eigen helper). |
| `generator_afsluiten.yaml` | Package: `script.generator_afsluiten` (gebruikt `input_text.generator_opstarten_status`), met bovenaan de uitleg. |
| `script_diesel_opstarten.yaml` | Het script achter *Start Diesel*, klaar om te plakken. |
| `diesel_opstarten.yaml` | Package: `input_text.diesel_opstarten_status` + `script.diesel_opstarten`, met bovenaan de uitleg. |
| `script_diesel_stoppen.yaml` / `diesel_stoppen.yaml` | Het script achter *Stop Diesel*: om te plakken / als package. |
| `script_vaarmodus_kiezen.yaml`, `automation_vaarmodus_haven.yaml` / `vaarmodus.yaml` | Vaarmodus Haven, Anker en Zeilen: script en automation om te plakken / alles als package met de helper. |
| `diesel_contact.yaml` | Sensor `binary_sensor.diesel_contact`: contact van de Volvo aan zolang er motordata binnenkomt. Voor `configuration.yaml`. |
| `script_vaarmodus_elektrisch.yaml` | Elektrisch kiezen met controle van de DC-bus, klaar om te plakken. |

## Energy Inverters (DC-bus) opstarten en afsluiten

**Opstarten** (knop op Energie en Voortstuwing):

1. **Charge batteries uit**: staat `switch.…charge_batteries_2` aan, dan wacht het script; het venster biedt *Uitzetten* en *Afbreken* (dan is er niets geschakeld). Deze controle geldt alleen tijdens het opstarten en afsluiten.
2. In het venster kies je *Walstroom* of *Generator* (alleen te kiezen als `…shore_supply_is_on` / `…generator_is_on` aan is) of *Alleen accu* (met waarschuwing).
3. Het script zet `switch.…battery_connect_2` aan en wacht tot `binary_sensor.…bms_is_on` aan is.
4. Daarna zet het `switch.…shore_supply_2` of `switch.…generator_2` aan en wacht tot `binary_sensor.…shore_supply_is_connected` / `…generator_is_connected` aan is.
5. Reageert een drive na **20 s** nog niet, dan vraagt het venster: **Terugdraaien** of **Blijven wachten**. Het script wacht intussen gewoon door. Komt de terugmelding alsnog, dan gaat het verder met de volgende stap. Na *Blijven wachten* blijft het venster open (stap staat op WACHT) en kan je nog steeds terugdraaien. *Terugdraaien* zet alles van deze opdracht terug, laatste stap eerst (de kaart schrijft `…:rollback` in de statushelper, het script ziet dat en draait terug).
6. Lukt alles, dan toont het venster 1 s *Startup complete* en sluit daarna.

**Afsluiten** (knop op Energie, met Ja/Nee):

1. **Charge batteries uit**: dezelfde controle als bij opstarten.
2. Eerst gaat de externe voeding af die gekoppeld is: walstroom en/of generator (`…_is_connected` aan of de switch aan). Het script wacht tot `…_is_connected` uit is.
3. Daarna gaat `switch.…battery_connect_2` uit, en het script wacht tot `…bms_is_on` uit is.
4. Ook hier geldt per stap 20 s, met dezelfde keuze; terugdraaien zet weer aan wat bij dit afsluiten is uitgezet.

Het groene bolletje in de knop *Energy Inverters opstarten* staat los van het script: het is groen zolang de DC-bus > 700 V is.

## Generator opstarten

Knop *Generator opstarten* op Voortstuwing (vak Generator, in plaats van *Prepair Generator Start*) en op de pagina Generator (naast *Prepare generator start*). Het script loopt de stappen door en het venster toont ze. De zeewaterpomp glycol zit er niet meer in: die regelt het opstarten van de Energy Inverters.

1. **Mainswitch op direct van wal**: foto `DirectvanWal.png`, de bediener tikt *Gedaan*.
2. **Wierpot front open** (`valve.er_ventielblok_1tm4_l1`): staat hij dicht, dan opent *Openen* hem.
3. **DC-bus aan** (≥ 700 V): staat hij uit, dan opent *Start DC-bus* het gewone Energy Inverters-venster; daarna gaat het vanzelf verder. **Charge batteries uit**: staat hij aan, dan zet *Uitzetten* hem uit.
4. **Switches naar de omvormers**: foto `VanafOmvormerPLC.png`, *Gedaan*.
5. **Generator starten**: keuze *Via HA* (`switch.…manual_start_aux_generator_2` aan, blijft aan; 60 s) of *Handmatig* (aan het lokale paneel; geen tijdslimiet). Wacht op `…generator_is_on`, dan 2 s.
6. **Walstroom-drive uit** (`switch.…shore_supply_2` uit), wacht tot `…shore_supply_is_connected` uit is, dan 2 s. De boot draait nu op de accu.
7. **Generator-drive aan** (`switch.…generator_2` aan), wacht op `…generator_is_connected`, dan 2 s.
8. **Accu laden aan** (`switch.…charge_batteries_2` aan), wacht op `…bms_charging_mode`, dan 2 s.
9. 1 s *Generator online*, daarna sluit het venster.

Zolang het script loopt is er geen *Sluiten*. In stap 1–5 kan de bediener *Afbreken* (het script heeft dan nog niets geschakeld; alleen wat de bediener zelf met de knoppen in het venster deed, blijft zo). Bij 6–8 (en de start via HA) volgt na 20 s (60 s) zonder terugmelding de keuze *Terugdraaien* of *Blijven wachten*; terugdraaien zet terug wat het script in deze run schakelde, laatste eerst. Stappen die al goed staan worden overgeslagen; draait de generator al, dan vervalt de keuze in stap 5. Staat de DC-bus na afbreken of terugdraaien nog aan (≥ 700 V), dan biedt het venster *DC-bus uitzetten*: dat start het gewone script *Energy Inverters afsluiten* met zijn eigen venster.

**Foto's:** in HA in `www/Pictures/Instructions/` naast `configuration.yaml`. In de add-ons (File editor, Samba, Studio Code Server, SSH) is dat `/homeassistant/www/…`; een map `/config` in de root hoort bij de add-on zelf en wordt door HA niet gezien. Maak je `www` voor het eerst aan, herstart HA dan één keer (adres `/local/Pictures/Instructions/…`; hoofdlettergevoelig). Zet kopieën in `www/Pictures/Instructions/` in de dagmap: de demo (`demo/edit_server.py`) serveert `/local/` uit die map, zoals HA.

**Installeren:** helper *Tekst* met naam `Generator opstarten status`, maximale lengte **255**, entiteit `input_text.generator_opstarten_status`; daarna een nieuw script met de inhoud van `script_generator_opstarten.yaml` (entiteit `script.generator_opstarten`), zoals hieronder bij de Energy Inverters.

## Generator afsluiten

Knop *Generator afsluiten* op de pagina Generator (onder *Generator opstarten*) en *Afsluiten* op Voortstuwing (vak Generator, naast *Opstarten*), met eerst een Ja/Nee. Het script zet de boot terug op walstroom:

1. **Walstroom aanwezig** (`…shore_supply_is_on`, nog niet gekoppeld): zo niet, dan wacht het script tot hij er is (alleen *Afbreken*).
2. **Charge batteries uit**: staat hij aan, dan zet *Uitzetten* hem uit.
3. **Accu gekoppeld** (`…bms_is_on`): zo niet, dan zet *Koppelen* `switch.…battery_connect_2` aan.
4. **Generator-drive uit** (`switch.…generator_2` uit), wacht tot `…generator_is_connected` uit is, dan 2 s. De boot draait nu op de accu.
5. **Generator uit** (`switch.…manual_start_aux_generator_2` uit), wacht tot `…generator_is_on` uit is (60 s), dan 2 s. Is de generator handmatig gestart, dan zet je hem uit aan het lokale paneel; het venster zegt dat na 60 s en het script wacht door.
6. **Walstroom-drive aan** (`switch.…shore_supply_2` aan), wacht op `…shore_supply_is_connected`, dan 2 s.
7. 1 s *Generator uit, walstroom gekoppeld*, daarna sluit het venster.

In stap 1–3 kan de bediener afbreken (er is dan niets geschakeld). Bij 4–6 volgt na 20 s (60 s) zonder terugmelding *Terugdraaien* of *Blijven wachten*; terugdraaien zet terug wat het script schakelde, laatste eerst. Stappen die al goed staan worden overgeslagen.

**Installeren:** alleen een nieuw script met de inhoud van `script_generator_afsluiten.yaml` (entiteit `script.generator_afsluiten`). Het gebruikt de helper van Generator opstarten.

## Vaarmodus Haven, Anker en Zeilen

De PLC kent alleen havenmodus. Anker en Zeilen bestaan alleen in HA: alle drie zetten de PLC in havenmodus, en `input_select.vaarmodus_haven` onthoudt de keuze (`Geen` = de PLC staat niet in havenmodus). `script.vaarmodus_kiezen` zet de keuze en drukt zo nodig de havenknop in; de automation *Vaarmodus haven volgt PLC* houdt de helper gelijk aan de PLC.

**Installeren:** helper *Keuzelijst* met naam `Vaarmodus haven` en opties `Geen`, `Haven`, `Anker`, `Zeilen` (entiteit `input_select.vaarmodus_haven`); een nieuw script met `script_vaarmodus_kiezen.yaml`; een nieuwe automatisering met `automation_vaarmodus_haven.yaml`.

## Vaarmodus Elektrisch

De knoppen *Elektrisch* (Voortstuwing) en *Electric* (Diesel) starten `script.vaarmodus_elektrisch`. Staat de DC-bus onder 700 V, dan toont het venster *Start DC-bus* (het keuzevenster en de stappen van Energy Inverters opstarten). Zodra de bus aan is, gaat de PLC vanzelf in elektrische modus. *Afbreken* laat de vaarmodus zoals hij was.

**Installeren:** helper *Tekst* met naam `Vaarmodus elektrisch status`, maximale lengte **255**, entiteit `input_text.vaarmodus_elektrisch_status`; daarna een nieuw script met `script_vaarmodus_elektrisch.yaml` (entiteit `script.vaarmodus_elektrisch`).

## Diesel contact

Er is geen signaal van het contact (Ignition) zelf. Met het contact aan stuurt de Volvo boost, koelwatertemperatuur, oliedruk en toerental continu door, ook als de waarde gelijk blijft. HA noteert elke ontvangen waarde in `last_reported`, ook zonder verandering. `binary_sensor.diesel_contact` kijkt elke seconde of een van die vier in de laatste 2 s binnenkwam. Hij gaat aan na 2 s live data en uit na 2 s zonder.

**Installeren:** de inhoud van `diesel_contact.yaml` onderaan `/homeassistant/configuration.yaml` zetten (staat er al `template:`, dan alleen het deel vanaf `- trigger:` daaronder), dan *Ontwikkelhulpmiddelen → YAML → Sjabloonentiteiten* herladen. Testen: contact aan en uit en kijken of de sensor meegaat.

**Vooraf testen** of de waarden echt live binnenkomen (Ontwikkelhulpmiddelen → Sjabloon):

```jinja
{% for s in expand(['sensor.engine_room_main_engine_me_boost', 'sensor.engine_room_main_engine_me_coolant_temp', 'sensor.engine_room_me_oil_press', 'sensor.engine_room_main_engine_me_rpm']) %}
{{ s.entity_id }}: {{ (now() - s.last_reported).total_seconds() | round(1) }} s geleden
{% endfor %}
```

Het sjabloon rekent opnieuw bij elke wijziging in het vak; typ een spatie om te verversen. Met het contact aan horen de getallen onder 2 s te blijven, met het contact uit horen ze op te lopen.

## Start Diesel

Knop *Start Diesel* op Voortstuwing (in plaats van *Prepair Volvo Start*) en op de pagina Diesel (vak *Propulsion mode*). Zolang het script loopt is er geen *Sluiten*.

1. **Systemen voorbereiden**: het venster toont inlaat, uitlaat, wierpot aft en front, zeewaterpomp glycol, koelwaterflow (≥ 2,5), compressor en compressordruk (≥ 3 bar). Staat niet alles goed, dan start *Voorbereiden* `automation.prepvolvostart`; het script gaat verder zodra alles groen is.
2. **Motor starten**: foto `VolvoAanUit.jpeg`. Het script wacht onbeperkt op `…diesel_running`, dan 2 s.
3. **Noodstop**, alleen als het alarm *001 Emergency Stop* actief is (lijst `alarms` van `sensor.er_alarm_status_active_alarms`): foto `Volvohandle.jpeg`. Het script gaat vanzelf verder zodra het alarm weg is.
4. **Gashendel recht**: staat `…lever_position` binnen ±5 %, dan is de stap vanzelf goed. Anders vraagt het venster of de hendel rechtop staat en toont het de positie live. *Doorgaan* controleert opnieuw (nog buiten ±5 %: de vraag blijft staan); *Kalibreren* is nog een placeholder.
5. **Vaarmodus kiezen**: *Diesel*, *Zeilen* of *Anker* (verplicht). Na 20 s zonder terugmelding opnieuw kiezen of afbreken.
6. 1 s *Diesel online*, daarna sluit het venster.

*Afbreken* kan in elke stap en zet niets terug. Staat de motor dan zeker stil (`diesel_running` uit en < 50 rpm) en is inlaat of uitlaat open, dan biedt het venster *Inlaat en uitlaat dicht* (alleen `…_l4` en `…_l3`).

**Installeren:** helper *Tekst* met naam `Diesel opstarten status`, maximale lengte **255**, entiteit `input_text.diesel_opstarten_status`; daarna een nieuw script met `script_diesel_opstarten.yaml` (entiteit `script.diesel_opstarten`). Foto's `VolvoAanUit.jpeg` en `Volvohandle.jpeg` in `/homeassistant/www/Pictures/Instructions/` (hoofdlettergevoelig).

## Stop Diesel

Knop *Stop Diesel* onder *Start Diesel*, op Voortstuwing en Diesel. Zelfde helper als Start Diesel.

1. **Motor stoppen** met de Start/Stop-knop: foto `VolvoAanUit.jpeg`. Het script wacht tot `…diesel_running` uit is en de motor onder 50 rpm draait, dan 2 s.
2. **Vaarmodus kiezen**: *Elektrisch*, *Haven*, *Anker* of *Zeilen*. Bij *Elektrisch* wordt eerst de DC-bus gecontroleerd (≥ 700 V); staat die uit, dan biedt het venster *Start DC-bus* en gaat het daarna vanzelf verder.
3. **Contact uit**, alleen bij Haven of Anker: zelfde foto. Het script gaat vanzelf verder zodra `binary_sensor.diesel_contact` uit gaat (zie *Diesel contact*); *Gedaan* kan ook. Bij Elektrisch en Zeilen blijft het contact aan en vervalt deze stap.
4. Het venster blijft open met *Diesel gestopt*. Alleen na Haven is er de knop *Inlaat en uitlaat dicht*; na Elektrisch, Anker of Zeilen niet. De bediener sluit het venster zelf.

**Installeren:** een nieuw script met `script_diesel_stoppen.yaml` (entiteit `script.diesel_stoppen`).

## Installeren in Home Assistant

**Via de UI (zo staat het nu op de TC90, zonder map `packages`):**

1. **Helper:** ga naar *Instellingen → Apparaten en diensten → Helpers → + Helper maken → Tekst*.
   - Naam: `Energy Inverters status`.
   - Bij *Geavanceerde instellingen*: maximale lengte `100`.
   - Na het opslaan moet de entiteit `input_text.energy_inverters_status` heten. Controleer dat, en pas de entiteits-ID zo nodig aan.
2. **Script opstarten:** ga naar *Instellingen → Automatiseringen en scènes → Scripts → + Script toevoegen → Nieuw script maken*.
   - Kies rechtsboven *⋮ → Bewerken in YAML* en vervang alles door de inhoud van `script_energy_inverters_opstarten.yaml`. De regels met `#` mogen mee.
   - Sla op. Vraagt HA om een naam of ID, gebruik dan `energy_inverters_opstarten`.
   - Controleer daarna in de lijst of het script `script.energy_inverters_opstarten` heet.
3. **Script afsluiten:** doe hetzelfde met `script_energy_inverters_afsluiten.yaml`. De ID is `energy_inverters_afsluiten`.

Herstarten is niet nodig. Een UI-helper onthoudt zijn laatste waarde na een herstart; dat is geen probleem, want de kaart kijkt of het script nog loopt (`script.…` aan) voordat hij een oude "busy" volgt.

**Als package (alleen als HA packages gebruikt):**

1. Zet in `configuration.yaml` `homeassistant: packages: !include_dir_named packages` en maak de map `/config/packages/`.
2. Kopieer `energy_inverters.yaml` erin, kies *Configuratie controleren* en herstart.
3. Gebruik niet beide manieren tegelijk: dan bestaan de scripts twee keer.

Verander je iets aan een script, pas dan zowel het losse bestand als `energy_inverters.yaml` aan, zodat ze gelijk blijven.

## Testen

- Voer in **Ontwikkelaarshulpmiddelen → Acties** `script.energy_inverters_opstarten` uit met `bron: battery`. Kijk daarna bij **Toestanden** of `input_text.energy_inverters_status` de waarden `lad_uit,battery:battery:busy` en daarna `lad_uit,battery::complete` krijgt (met Charge batteries uit).
- De status heeft de vorm `<plan>:<stap>:<toestand>`; de uitleg staat bovenaan `energy_inverters.yaml`.

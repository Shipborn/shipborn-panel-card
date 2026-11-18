# Generated automations

HA-code die bij het dashboard hoort. Deze map gaat mee in git; Home Assistant leest hem niet zelf: kopieer de bestanden naar HA zoals hieronder.

| Bestand | Inhoud |
|---|---|
| `script_energy_inverters_opstarten.yaml` | Het script *opstarten*, klaar om te plakken in de script-editor van HA (YAML-modus). |
| `script_energy_inverters_afsluiten.yaml` | Het script *afsluiten*, idem. |
| `energy_inverters.yaml` | Alles in één package (alleen nodig als HA packages gebruikt): `input_text.energy_inverters_status` + scripts `script.energy_inverters_opstarten` (veld `bron`: `shore` / `generator` / `battery`) en `script.energy_inverters_afsluiten`. |

## Energy Inverters (DC-bus) opstarten en afsluiten

**Opstarten** (knop op Energie en Voortstuwing):

1. In het venster kies je *Walstroom* of *Generator* (alleen te kiezen als `…shore_supply_is_on` / `…generator_is_on` aan is) of *Alleen accu* (met waarschuwing).
2. Het script zet `switch.…battery_connect_2` aan en wacht tot `binary_sensor.…bms_is_on` aan is.
3. Daarna zet het `switch.…shore_supply_2` of `switch.…generator_2` aan en wacht tot `binary_sensor.…shore_supply_is_connected` / `…generator_is_connected` aan is.
4. Reageert een drive na **20 s** nog niet, dan vraagt het venster: **Terugdraaien** of **Blijven wachten**. Het script wacht intussen gewoon door. Komt de terugmelding alsnog, dan gaat het verder met de volgende stap. Na *Blijven wachten* blijft het venster open (stap staat op WACHT) en kan je nog steeds terugdraaien. *Terugdraaien* zet alles van deze opdracht terug, laatste stap eerst (de kaart schrijft `…:rollback` in de statushelper, het script ziet dat en draait terug).
5. Lukt alles, dan toont het venster 1 s *Startup complete* en sluit daarna.

**Afsluiten** (knop op Energie, met Ja/Nee):

1. Eerst gaat de externe voeding af die gekoppeld is: walstroom en/of generator (`…_is_connected` aan of de switch aan). Het script wacht tot `…_is_connected` uit is.
2. Daarna gaat `switch.…battery_connect_2` uit, en het script wacht tot `…bms_is_on` uit is.
3. Ook hier geldt per stap 20 s, met dezelfde keuze; terugdraaien zet weer aan wat bij dit afsluiten is uitgezet.

Het groene bolletje in de knop *Energy Inverters opstarten* staat los van het script: het is groen zolang de DC-bus > 700 V is.

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

- Voer in **Ontwikkelaarshulpmiddelen → Acties** `script.energy_inverters_opstarten` uit met `bron: battery`. Kijk daarna bij **Toestanden** of `input_text.energy_inverters_status` de waarden `battery:battery:busy` en daarna `battery::complete` krijgt.
- De status heeft de vorm `<plan>:<stap>:<toestand>`; de uitleg staat bovenaan `energy_inverters.yaml`.

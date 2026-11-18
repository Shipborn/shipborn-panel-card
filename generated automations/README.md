# Generated automations

HA-code die bij het dashboard hoort. Deze map gaat mee in git; Home Assistant leest hem niet zelf: kopieer de bestanden naar HA zoals hieronder.

| Bestand | Inhoud |
|---|---|
| `energy_inverters.yaml` | Package: `input_text.energy_inverters_status` + scripts `script.energy_inverters_opstarten` (veld `bron`: `shore` / `generator` / `battery`) en `script.energy_inverters_afsluiten`. |

## Energy Inverters (DC-bus) opstarten en afsluiten

**Opstarten** (knop op Energie en Voortstuwing):

1. In het venster kies je *Walstroom* of *Generator* (alleen te kiezen als `…shore_supply_is_on` / `…generator_is_on` aan is) of *Alleen accu* (met waarschuwing).
2. Het script zet `switch.…battery_connect_2` aan en wacht tot `binary_sensor.…bms_is_on` aan is.
3. Daarna zet het `switch.…shore_supply_2` of `switch.…generator_2` aan en wacht tot `binary_sensor.…shore_supply_is_connected` / `…generator_is_connected` aan is.
4. Per stap wacht het maximaal 5 s. Reageert een drive niet, dan stopt het script, toont het venster een waarschuwing en blijft staan wat al aan is.
5. Lukt alles, dan toont het venster 1 s *Startup complete* en sluit daarna.

**Afsluiten** (knop op Energie, met Ja/Nee):

1. Eerst gaat de externe voeding af die gekoppeld is: walstroom en/of generator (`…_is_connected` aan of de switch aan). Het script wacht tot `…_is_connected` uit is.
2. Daarna gaat `switch.…battery_connect_2` uit, en het script wacht tot `…bms_is_on` uit is.
3. Ook hier geldt per stap maximaal 5 s; bij geen reactie stopt het script met een waarschuwing.

Het groene bolletje in de knop *Energy Inverters opstarten* staat los van het script: het is groen zolang de DC-bus > 700 V is.

## Installeren in Home Assistant

**Als package (aanbevolen):**

1. Zet in `configuration.yaml` (eenmalig):
   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```
2. Kopieer `energy_inverters.yaml` naar `/config/packages/energy_inverters.yaml` (bijv. met de File editor- of Studio Code Server-add-on).
3. Kies **Ontwikkelaarshulpmiddelen → YAML → Configuratie controleren** en daarna **Herstarten**. Alleen *Scripts herladen* is niet genoeg: de `input_text` is nieuw.

**Zonder packages (via de UI):**

1. Ga naar **Instellingen → Apparaten en diensten → Helpers → Helper maken → Tekst**. Naam *Energy Inverters status*, max. lengte 100. Controleer dat de entiteit `input_text.energy_inverters_status` heet.
2. Ga naar **Instellingen → Automatiseringen en scènes → Scripts → Script toevoegen → ⋮ → Bewerken in YAML**. Plak daar alles onder `energy_inverters_opstarten:`, één niveau minder ingesprongen (dus vanaf `alias:`), en sla op met script-ID `energy_inverters_opstarten`.
3. Doe hetzelfde voor `energy_inverters_afsluiten`.

De entiteitnamen moeten precies zo heten, want de kaart gebruikt ze (`examples/plc-dashboard.yaml`, ankers `&ei_start`, `&ei_progress_on` en `&ei_progress_off`).

## Testen

- Voer in **Ontwikkelaarshulpmiddelen → Acties** `script.energy_inverters_opstarten` uit met `bron: battery`. Kijk daarna bij **Toestanden** of `input_text.energy_inverters_status` de waarden `battery:battery:busy` en daarna `battery::complete` krijgt.
- De status heeft de vorm `<plan>:<stap>:<toestand>`; de uitleg staat bovenaan `energy_inverters.yaml`.

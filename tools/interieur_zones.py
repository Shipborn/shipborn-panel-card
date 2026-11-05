"""Generates the room zones (zone + zoom panel) on the deck plan and the interior plan below it (view ship-deck) in examples/plc-dashboard.yaml.

Usage (from the day folder): python tools/interieur_zones.py examples/Entiteiten-HA.xlsx examples/plc-dashboard.yaml
Needs openpyxl. Replaces everything between "# ---- ruimtes:" and "# ---- algemeen:" in the interior view, and between
"# ---- dek: zones" and "# ---- einde dek ----" in the deck view (inserted after the deck drawing on the first run).

The layout per room follows the crew's own HA dashboard (sections and names per room). Entities of a room that
are not named there end up under "Overig", so nothing disappears.
"""
import re
import sys

import openpyxl

xlsx, yaml_path = sys.argv[1], sys.argv[2]
rows = list(openpyxl.load_workbook(xlsx, read_only=True).active.iter_rows(values_only=True))[1:]
NAME = {str(r[0]): str(r[1]) for r in rows if r[0]}


def ents(pattern, domain="light"):
    return sorted(e for e in NAME if e.startswith(domain + ".") and re.search(pattern, e))


def label(e):
    if e == "light.mc_4a_g":
        return "Groep 4A (galley)"
    n = NAME.get(e, e)
    m = re.search(r"\(([^)]*)\)", n)
    if m:
        n = m.group(1)
    else:
        n = re.sub(r"^(Owners|Main|Crew|Guest) Cabin\s+", "", n, flags=re.I)
        n = re.sub(r"\s+Geheel$", "", n, flags=re.I)
        n = re.sub(r"^(Oc|Mc|Cc|Gc|Er|G)_(\w+)$", lambda k: "Groep " + k.group(2).replace("_", " "), n)
    n = n.replace("_", " ").strip()
    return n[:1].upper() + n[1:]


def q(s):
    return '"' + s.replace('"', '\\"') + '"' if re.search(r"[:#,\[\]{}&*!|>'\"%@`?]", s) or s[:1].isdigit() else s


PUMP = ', tap_action: { action: toggle, confirmation: { text_on: "Wilt u de pomp aanzetten?", text_off: "Wilt u de pomp uitzetten?" } }'
CONFIRM = ', tap_action: { action: toggle, confirmation: { text_on: "Aanzetten?", text_off: "Uitzetten?" } }'
LEAK = {
    "ap": ("binary_sensor.0x28dba7fffe752d09_water_leak", "binary_sensor.0x8c65a3fffecea649_water_leak"),
    "er": ("binary_sensor.0x8c65a3fffeda603c_water_leak", "binary_sensor.0x0ceff6fffe901b4e_water_leak"),
    "d": ("binary_sensor.0x0ceff6fffe76dcea_water_leak", "binary_sensor.0x0ceff6fffe9009c8_water_leak"),
    "cc": ("binary_sensor.0x44e2f8fffe0be6ed_water_leak", "binary_sensor.0x8c65a3fffee0f85d_water_leak"),
    "fp": ("binary_sensor.fp_waterleaksensor_laag_water_leak", "binary_sensor.fp_waterleaksensor_hoog_water_leak"),
}
SCHROEFAS = "binary_sensor.engine_room_leak_schroefas_water_leak"


class Panel:
    X0, W = 18, 448
    W2 = (448 - 10) // 2

    def __init__(self):
        self.items, self.y, self.used = [], 12, set()
        self.below = []  # items under the zoomed drawing (the Webasto blocks), side by side

    def add(self, s):
        self.items.append(s)
        self.used.update(re.findall(r"entity(?:_id)?: ([a-z_]+\.[a-z0-9_]+)", s))

    def title(self, t):
        self.add(f'{{ type: text, x: {self.X0}, y: {self.y}, text: {q(t)}, font_size: 13, uppercase: true, color: "var(--ink-muted, #a3a29c)" }}')
        self.y += 30

    def note(self, t):
        self.add(f'{{ type: text, x: {self.X0}, y: {self.y}, width: {self.W}, text: {q(t)}, font_size: 13, color: "var(--ink-muted, #8f8e88)" }}')
        self.y += 24 * (1 + len(t) // 60) + 6

    def scenes(self, sc):
        per = 2 if len(sc) in (2, 4) else 3
        for i in range(0, len(sc), per):
            row = sc[i:i + per]
            w = (self.W - 10 * (len(row) - 1)) // len(row)
            for j, (lbl, sid) in enumerate(row):
                self.add(f"{{ type: pushbutton, x: {self.X0 + j * (w + 10)}, y: {self.y}, width: {w}, height: 48, label: {q(lbl)}, font_size: 15, "
                         f"tap_action: {{ action: perform-action, perform_action: scene.turn_on, data: {{ entity_id: scene.ctd_008673_{sid} }} }} }}")
            self.y += 58
        self.y += 6

    def grid(self, buttons):
        """(label, entity) or (label, entity, extra) in two columns."""
        for i, b in enumerate(buttons):
            lbl, e, extra = (*b, "")[:3]
            x = self.X0 + (i % 2) * (self.W2 + 10)
            self.add(f"{{ type: pushbutton, x: {x}, y: {self.y}, width: {self.W2}, height: 44, label: {q(lbl)}, entity: {e}, led: green, align: left, font_size: 14{extra} }}")
            if i % 2 == 1 or i == len(buttons) - 1:
                self.y += 52
        self.y += 6

    def values(self, rows):
        for lbl, e, *opt in rows:
            extra = opt[0] if opt else ""
            self.add(f"{{ type: value, x: {self.X0}, y: {self.y}, width: {self.W}, height: 36, label: {q(lbl)}, entity: {e}, font_size: 15, box_width: 110{extra} }}")
            self.y += 42
        self.y += 6

    def inds(self, rows):
        for i, (lbl, e, col) in enumerate(rows):
            x = self.X0 + (i % 2) * (self.W2 + 10)
            blink = ", blink: true" if col == "red" else ""
            self.add(f"{{ type: indicator, x: {x}, y: {self.y}, entity: {e}, label: {q(lbl)}, color: {col}{blink}, font_size: 16, tap_action: {{ action: more-info }} }}")
            if i % 2 == 1 or i == len(rows) - 1:
                self.y += 36
        self.y += 8

    def climate(self, key, label_=None):
        if label_:
            self.title(label_)
        x2 = self.X0 + self.W2 + 10
        self.add(f"{{ type: value, style: tile, x: {self.X0}, y: {self.y}, width: {self.W2}, height: 64, label: Temperatuur nu, entity: sensor.webasto_bluecool_noder_{key}_temp, value_size: 22 }}")
        self.add(f"{{ type: pushbutton, x: {x2}, y: {self.y}, width: {self.W2}, height: 64, label: Airco, entity: switch.webasto_bluecool_noder_{key}_ac, led: green, align: left, font_size: 15 }}")
        self.y += 74
        self.add(f'{{ type: value, x: {self.X0}, y: {self.y}, width: {self.W2}, height: 36, label: "Instelling °C", entity: number.webasto_bluecool_noder_{key}, font_size: 15, box_width: 80 }}')
        self.add(f'{{ type: value, x: {x2}, y: {self.y}, width: {self.W2}, height: 36, label: "Fan (6 = auto)", entity: number.webasto_bluecool_noder_{key}_fan_speed, font_size: 15, decimals: 0, box_width: 70 }}')
        self.y += 52

    def leaks(self, key, pumps=()):
        lo, hi = LEAK[key]
        self.inds([("Water laag", lo, "red"), ("Water hoog", hi, "red")])
        if pumps:
            self.grid([(l, e, PUMP) for l, e in pumps])

    def sensors(self, temp=None, motion=None, batteries=()):
        """Temperature / motion of a room plus the batteries of its sensors."""
        if temp:
            self.values([(temp[0], temp[1], ", decimals: 1")])
        if motion:
            self.inds([("Beweging", motion, "amber")])
        num = [(l, e) for l, e in batteries if not e.endswith("_battery_low")]
        low = [(f"{l}: batterij laag", e, "amber") for l, e in batteries if e.endswith("_battery_low")]
        if num:
            self.values([(f"{l} batterij", e, ', decimals: 0, unit: "%"') for l, e in num])
        if low:
            self.inds(low)

    # ---- TC90 building blocks (new room layout, so far only the Owners cabin) ----

    def lights(self, rows, indent=0):
        """(label, light) as row buttons in two columns: tap = on/off, the sun button opens HA's own dialog to dim."""
        x0, w = self.X0 + indent, (self.W - indent - 10) // 2
        for i, (lbl, e) in enumerate(rows):
            self.add(f"{{ type: toggle, x: {x0 + (i % 2) * (w + 10)}, y: {self.y}, width: {w}, height: 48, label: {q(lbl)}, entity: {e} }}")
            if i % 2 == 1 or i == len(rows) - 1:
                self.y += 56

    def group(self, lbl, entity, members):
        """Light group (tap = all on/off, − / + dim in 5 % steps) with its own lights indented below it, joined by a line."""
        ids = ", ".join(e for _, e in members)
        self.add(f"{{ type: light_group, x: {self.X0}, y: {self.y}, width: {self.W}, height: 56, label: {q(lbl)}, entity: {entity}, members: [{ids}] }}")
        self.y += 64
        top = self.y
        self.lights(members, indent=22)
        self.add(f'{{ type: line, x: {self.X0 + 8}, y: {top - 8}, width: 3, height: {self.y - top}, color: "var(--line-strong, #3a3a38)", radius: 2 }}')
        self.y += 8

    def power(self, rows):
        """(label, switch, icon) in two columns; switching on and off both ask first (yes/no)."""
        for i, (lbl, e, icon) in enumerate(rows):
            x = self.X0 + (i % 2) * (self.W2 + 10)
            on, off = q(f"{lbl} aanzetten?"), q(f"{lbl} uitzetten?")
            self.add(f"{{ type: toggle, x: {x}, y: {self.y}, width: {self.W2}, height: 48, icon: {icon}, label: {q(lbl)}, entity: {e}, "
                     f"tap_action: {{ action: toggle, confirmation: {{ title_on: {on}, title_off: {off} }} }} }}")
            if i % 2 == 1 or i == len(rows) - 1:
                self.y += 56
        self.y += 6

    BW, BH = 280, 236  # one Webasto block in the strip under the zoomed drawing

    def webasto(self, key, title, lo=10, hi=35):
        """Webasto unit as a compact block under the zoomed drawing (next to the previous one): on/off as a small switch in
        the header, and a round dial (temperature + setpoint above, fan speed below) with − / + in its corners: top for
        the setpoint, bottom for the fan."""
        b = f"webasto_bluecool_noder_{key}"
        x = len([i for i in self.below if "type: panel" in i]) * (self.BW + 12)
        add = self.below.append
        add(f"{{ type: panel, x: {x}, y: 0, width: {self.BW}, height: {self.BH}, title: {q(title)} }}")
        add(f"{{ type: toggle, style: pill, x: {x + self.BW - 12 - 52}, y: 6, width: 52, height: 30, label: Airco, entity: switch.{b}_ac }}")
        add(f'{{ type: climate, x: {x + (self.BW - 186) // 2}, y: 42, width: 186, entity: sensor.{b}_temp, min: {lo}, max: {hi}, unit: "°C", decimals: 1, '
            f'setpoint_entity: sensor.{b}_setpoint_feedback, setpoint_number: number.{b}, '
            f'fan_entity: sensor.{b}_fan_speed_feedback, fan_number: number.{b}_fan_speed, fan_min: 1, fan_max: 6, fan_names: {{ 6: Aut }} }}')
        self.used.update([f"switch.{b}_ac", f"number.{b}", f"number.{b}_fan_speed", f"sensor.{b}_temp"])

    def info(self, rows):
        """(label, entity, extra) as row buttons in two columns that show the state or value; a tap opens HA's more-info
        (with the history graph)."""
        for i, (lbl, e, *opt) in enumerate(rows):
            x = self.X0 + (i % 2) * (self.W2 + 10)
            extra = opt[0] if opt else ""
            self.add(f"{{ type: toggle, x: {x}, y: {self.y}, width: {self.W2}, height: 48, label: {q(lbl)}, entity: {e}, more_info: false, "
                     f"tap_action: {{ action: more-info }}{extra} }}")
            if i % 2 == 1 or i == len(rows) - 1:
                self.y += 56
        self.y += 6

    def motion(self, occupancy=None, temp=None, note=None):
        """Motion & temperature of a room (as on the crew's HA pages); the graphs are in HA's more-info dialog."""
        self.title("Beweging en temperatuur")
        if note:
            self.note(note)
        rows = []
        if occupancy:
            rows.append(("Beweging", occupancy, ', icon: lifebeat, states: { "on": BEWEGING, "off": RUST }'))
        if temp:
            rows.append(("Temperatuur", temp, ", icon: klimaat"))
        self.info(rows)

    def bilge(self, key, pump=None, batteries=()):
        """Leak sensors (red while wet), the bilge pump (yes/no) and the sensor batteries, in the row-button style."""
        lo, hi = LEAK[key]
        self.title("Bilge")
        wet = ', icon: bilge, on_tone: alarm, states: { "on": LEK, "off": DROOG }'
        rows = [("Water laag", lo, wet), ("Water hoog", hi, wet)]
        for lbl, e in batteries:
            rows.append((f"{lbl} batterij", e, ', on_tone: warn, states: { "on": LAAG, "off": OK }' if e.endswith("_battery_low") else ', unit: "%"'))
        self.info(rows)
        if pump:
            self.power([(pump[0], pump[1], "pomp")])

    def rest(self, pattern, domain="light"):
        left = [e for e in ents(pattern, domain) if e not in self.used]
        if left:
            self.title("Overig")
            self.grid([(label(e), e) for e in left])


ROOMS = {"interior": [], "deck": []}


def room(plan, label_, rect, build, value=None, leak=None, active=(), alarm=(), outline=None, label_at=None):
    # outline: the room's contour as [(x, y), …] in page coordinates (traced from the drawing); otherwise the rectangle.
    ROOMS[plan].append(dict(label=label_, rect=rect, build=build, value=value, leak=leak, active=list(active), alarm=list(alarm),
                            outline=OUTLINES.get(label_, outline), label_at=label_at))


# ---------- interior ----------

def owners(p):
    # Layout from the crew's HA page "Owners" (dashboardOverview/overview.yaml): light groups with their own lights below
    # them, power supply, motion & temperature; the two Webasto units sit under the zoomed drawing. No scenes or "Overig".
    p.title("Owners cabin – verlichting")
    p.group("Rondom laag plafond", "light.owners_cabin_rondom_laag_plafond",
            [("BBA (2 spots)", "light.oc_s_1b_laag_bba_d11"), ("SBA (2 spots)", "light.oc_s_1b_laag_sba_d16"),
             ("BBM (2 spots)", "light.oc_s_1b_laag_bbm_d10"), ("SBM (2 spots)", "light.oc_s_1b_laag_sbm_d15"),
             ("BBV (2 spots)", "light.oc_s_1b_laag_bbv_d9"), ("SBV (2 spots)", "light.oc_s_1b_laag_sbv_d14")])
    p.group("Plinten", "light.owners_cabin_plinten",
            [("Plinten bed", "light.oc_s_1b2_led_bed_d12"), ("Plinten trappen", "light.oc_s_1b2_led_vloer_d8")])
    p.title("Bad, toilet en douche – verlichting")
    p.group("Douche ruimte", "light.owners_cabin_douche_ruimte",
            [("Douche (spot)", "light.oc_s_2a_douche_d18_1"), ("Wasbak (spot)", "light.oc_s_2a_wasbak_d17"),
             ("WC (2 spots)", "light.oc_s_2a_wc_d18")])
    p.lights([("Ledstrip wastafel", "light.oc_s_1b_kaptafel_d13"), ("Hal bad (6)", "light.oc_1c2"), ("Plint badkamer", "light.oc_1c3")])
    p.y += 6
    p.title("Stroomvoorziening")
    p.power([("Webasto klimaat (bad)", "switch.oc_e1_2_l1", "klimaat"), ("Sanibroyeur 1", "switch.oc_w_e3", "pomp"),
             ("Sanibroyeur 2", "switch.oc_w_e4", "pomp"), ("Toilet", "switch.oc_w_e5", "water"),
             ("Wandcontactdozen (TV)", "switch.oc_k1", "energie"), ("Stopcontact (plug)", "switch.0xa4c138b105c39a71", "energie")])
    p.motion("binary_sensor.motion_sensor_ownerscabin_occupancy", "sensor.motion_sensor_ownerscabin_temperature",
             "Sensor ligt bij het kastje aan stuurboord.")
    p.webasto("owners_cabin", "Webasto owners cabin")
    p.webasto("owners_cabin_bad", "Webasto owners cabin bad")


def deck_lounge(p):
    # Crew's HA pages: salon lights (page "Main", section Deck Lounge), printer, motion and Webasto (page "Deck Lounge").
    p.title("Salon – verlichting")
    p.group("Salon rondom", "light.main_cabin_salon_rondom",
            [("BBA (2 spots)", "light.mc_s_3a_dl_bba_d11_1"), ("SBA (2 spots)", "light.mc_s_3a_dl_sba_d11_7"),
             ("BBM (2 spots)", "light.mc_s_3a_dl_bbm_d11_2"), ("SBM (2 spots)", "light.mc_s_3a_dl_sbm_d11_6"),
             ("BBV (2 spots)", "light.mc_s_3a_dl_bbv_d11_3"), ("SBV (2 spots)", "light.mc_s_3a_dl_sbv_d11_5"),
             ("Voor (2 spots)", "light.mc_s_3a_dl_v_d11_4")])
    p.group("Plinten", "light.main_cabin_plinten", [("Salon plinten", "light.mc_s_3b_trap_d9")])
    p.motion("binary_sensor.0x001788010df593f4_occupancy", "sensor.0x001788010df593f4_temperature")
    p.title("Printer HP Smart Tank 5100")
    p.info([("Status", "sensor.hp_smart_tank_5100_series"), ("Zwart", "sensor.hp_smart_tank_5100_series_black_ink", ', unit: "%"'),
            ("Cyaan", "sensor.hp_smart_tank_5100_series_cyan_ink", ', unit: "%"'),
            ("Magenta", "sensor.hp_smart_tank_5100_series_magenta_ink", ', unit: "%"'),
            ("Geel", "sensor.hp_smart_tank_5100_series_yellow_ink", ', unit: "%"')])
    p.webasto("deck_lounge", "Webasto deck lounge")


def engine(p):
    p.add(f"{{ type: pushbutton, x: {p.X0}, y: {p.y}, width: {p.W}, height: 48, label: Naar Diesel, font_size: 15, tap_action: {{ action: navigate, navigation_path: sys-diesel }} }}")
    p.y += 60
    p.title("Verlichting")
    p.grid([("Engine room lights", "light.er_s_13a1")])
    p.title("Lekdetectie")
    p.leaks("er", [("Bilgepomp", "switch.0xe4b063fffe6d51d8")])
    p.inds([("Lek schroefas", SCHROEFAS, "red")])
    p.note("De lekdetector bij de schroefas stuurt ook een melding naar de telefoon van Alber.")
    p.title("Temperatuur")
    p.values([("Machinekamer", "sensor.0x001788010cdae144_temperature", ", decimals: 1"),
              ("Naast dagtank-vulsensoren", "sensor.engineroom_naast_dagtankvulsensoren_temperature", ", decimals: 1"),
              ("Buiten lounge", "sensor.buitenlounchetemp_temperature", ", decimals: 1")])
    p.title("Stroomvoorziening")
    p.grid([("Er 13A", "switch.er_13a"), ("Er S 13A2", "switch.er_s_13a2"), ("Ventilatie", "light.0xa4c138066737a09a")])
    p.title("Generator – temperaturen")
    p.values([("Zeewater in", "sensor.temp_generator_zeewater_in_temperature", ", decimals: 1"),
              ("Zeewater uit", "sensor.temp_generator_zeewater_uit_temperature", ", decimals: 1"),
              ("Blok generator", "sensor.temp_generator_blok_temperature", ", decimals: 1"),
              ("Koelvloeistof uit", "sensor.temp_generator_koelvloeistof_in_temperature", ", decimals: 1"),
              ("Koelvloeistof in", "sensor.temp_generator_koelvloeistof_uit_temperature", ", decimals: 1"),
              ("Temp-GEN-monitor", "input_number.temp_gen_monitor", ", decimals: 0")])
    p.title("Sensorbatterijen")
    p.sensors(batteries=[("Bewegingssensor", "sensor.0x001788010cdae144_battery"),
                         ("Temp naast dagtank", "sensor.engineroom_naast_dagtankvulsensoren_battery"),
                         ("Lek schroefas", "sensor.engine_room_leak_schroefas_battery"),
                         ("Lek laag", "binary_sensor.0x8c65a3fffeda603c_battery_low"),
                         ("Lek hoog", "binary_sensor.0x0ceff6fffe901b4e_battery_low")])
    p.rest(r"^light\.er_")
    left = [e for e in ["switch.er_k1", "switch.socket_engine_room"] if e not in p.used]
    p.grid([(label(e) if e != "switch.socket_engine_room" else "Stopcontact", e) for e in left])


def dining(p):
    # Crew's HA page "Main", section Eetkamer: three single lights; the dining bilge stays (leak sensors and pump).
    p.title("Eetkamer – verlichting")
    p.lights([("Scheiding lounge", "light.mc_s_5a_d_lr_d18"), ("Kast + patrijspoort", "light.mc_s_5b_raam_kast_d13"),
              ("Plinten kast", "light.mc_s_5c_plint_d14")])
    p.y += 6
    p.bilge("d", ("Bilgepomp", "switch.0xccba97fffeeb6ddc"),
            [("Lek laag", "binary_sensor.0x0ceff6fffe76dcea_battery_low"), ("Lek hoog", "binary_sensor.0x0ceff6fffe9009c8_battery_low")])


def galley(p):
    # Crew's HA page "Galley".
    p.title("Galley – verlichting")
    p.group("Aanrecht", "light.main_cabin_aanrecht_geheel",
            [("Achterzijde", "light.g_s_4a_achter_d1"), ("Kookplaat", "light.g_s_4a_kookplaat_d3"),
             ("Patrijs (2)", "light.g_s_4a_raam_d2"), ("Vaatwasser", "light.g_s_4a_vaatw_d4")])
    p.lights([("Onder kastjes", "light.g_s_4b_led_kast_d5")])
    p.y += 6
    p.title("Stroomvoorziening")
    p.power([("Webasto klimaat", "switch.g_w_e1", "klimaat"), ("Sanibroyeur (wastafel)", "switch.g_w_e3", "pomp"),
             ("Sanibroyeur (was/droog)", "switch.g_w_e4", "pomp"), ("Wandcontactdozen", "switch.g_k2", "energie"),
             ("Afzuigkap", "switch.g_k1", "ventilator"), ("Vaatwasser", "switch.g_k3", "water"), ("Oven", "switch.g_k4", "verwarming"),
             ("Koelkast", "switch.g_k5", "energie"), ("Vriezer", "switch.g_k6", "energie"), ("Was-droog", "switch.g_k7", "water"),
             ("Smart plug keuken", "switch.socketgally", "energie")])
    p.title("Temperatuur omvormer schakelkast")
    p.info([("Temperatuur", "sensor.boiler_water_temp_temperature", ", icon: klimaat")])
    p.webasto("galley", "Webasto galley")


def main(p):
    # Crew's HA page "Main": zithoek, werkkamer, gang, power supply, temperature (the salon is in Deck lounge, the
    # eetkamer in Dining); the salon bilge pump stays.
    p.title("Zithoek – verlichting")
    p.group("Lounge bank", "light.main_cabin_lounge_bank_geheel",
            [("Tafel (2 spots)", "light.mc_s_7a_tafel_d25"), ("Dwars 1 (2 spots)", "light.mc_s_7ab_bank_1_d31"),
             ("Dwars 2 (spot)", "light.mc_s_7ac_bank_2_d30"), ("Bank 1 (spot)", "light.mc_s_7ad_bank_3_d29"),
             ("Bank 2 (spot)", "light.mc_s_7ae_bank_4_d28"), ("Bank 3 (spot)", "light.mc_s_7af_bank_5_d27"),
             ("Bank 4 (spot)", "light.mc_s_7ag_bank_6_d26")])
    p.group("Plinten", "light.main_cabin_plinten", [("Lounge plinten", "light.mc_s_7ak_plint_d34")])
    p.lights([("Lounge patrijspoort", "light.mc_s_7ai_raam_d33")])
    p.y += 6
    p.title("Werkkamer – verlichting")
    p.group("Werkplek plafond", "light.main_cabin_workplace_plafond",
            [("Gang (2)", "light.mc_s_7b_gang_d36"), ("Kast (2)", "light.mc_s_7b_kast_d35")])
    p.lights([("Werkplek plinten", "light.mc_s_7b_plint_d37")])
    p.y += 6
    p.title("Gang – verlichting")
    p.group("Gangpad", "light.main_cabin_gangpad_geheel",
            [("Gang 1 (2)", "light.mc_s_6a_gang1_d19"), ("Gang 2 (2)", "light.mc_s_6a_gang2_d21"),
             ("Gang 3 (2)", "light.mc_s_6a_gang3_d22"), ("Gang 4", "light.mc_s_6a_gang4_d23")])
    p.lights([("Mast", "light.mc_s_7aj_mast_d24")])
    p.y += 6
    p.title("Stroomvoorziening")
    p.power([("Webasto klimaat", "switch.mc_w_e1_2", "klimaat"), ("Wandcontactdozen", "switch.mc_k1", "energie"),
             ("Stopcontact (plug)", "switch.0xa4c138269e44b698", "energie")])
    p.motion(temp="sensor.temp_main_temperature", note="Sensor ligt bij de mast.")
    p.title("Bilge")
    p.power([("Bilgepomp salon", "switch.0xe4b063fffe78d1e0", "pomp")])
    p.webasto("main_cabin", "Webasto main cabin")


def crew(p):
    # Crew's HA page "Crew"; the crew cabin bilge stays (leak sensors and pump).
    p.title("Crew cabin – verlichting")
    p.group("Plafond", "light.crew_cabin_plafond",
            [("Bed (2 spots)", "light.cc_s_11a_bed_d6"), ("Zitjes (2 spots)", "light.cc_s_11a_zitje_d5"),
             ("Tafel (spot)", "light.cc_s_11a_tafel_d7")])
    p.group("Hal en plinten", "light.crew_cabin_hal_en_plinten",
            [("Hal (2 spots)", "light.cc_s_11b_gang_d11"), ("Plinten", "light.cc_s_11b_plint_d8")])
    p.lights([("Toilet (4 spots)", "light.cc_12a"), ("Kasten ledstrip", "light.cc_s_11b_kasten_d12")])
    p.y += 6
    p.title("Stroomvoorziening")
    p.power([("Klimaat", "fan.cc_w_e1", "klimaat"), ("Sanibroyeur", "switch.cc_w_e2", "pomp"), ("Toilet", "switch.cc_w_e3", "water"),
             ("Wandcontactdozen", "switch.cc_k1", "energie"), ("Stopcontact (plug)", "switch.0xa4c138f65edc9815", "energie")])
    p.motion("binary_sensor.motionsensorcrew_occupancy", "sensor.motionsensorcrew_temperature")
    p.bilge("cc", ("Bilgepomp", "switch.0xccba97fffeea6c90"),
            [("Lek laag", "binary_sensor.0x44e2f8fffe0be6ed_battery_low"), ("Lek hoog", "binary_sensor.0x8c65a3fffee0f85d_battery_low")])
    p.webasto("crew_cabin", "Webasto crew cabin")


def guest(p):
    # Crew's HA page "Guest".
    p.title("Guest cabin – verlichting")
    p.group("Plafond", "light.guest_cabin_plafond",
            [("Gang (2 spots)", "light.gc_s_9a_gang_d5"), ("Bed achter (spot)", "light.gc_s_9b_bed_a_d9"),
             ("Bed voor (2 spots)", "light.gc_s_9b_bed_v_d8")])
    p.lights([("Plint", "light.gc_s_9b_plint_d10")])
    p.y += 6
    p.title("Toilet – verlichting")
    p.group("Toilet", "light.guest_cabin_toilet", [("Toilet (2 spots)", "light.gc_s_10a_wc_d7"), ("Wasbak (2 spots)", "light.gc_s_10a_wasbak_d6")])
    p.title("Stroomvoorziening")
    p.power([("Klimaat", "switch.gc_w_e1", "klimaat"), ("Sanibroyeur", "switch.gc_w_e2", "pomp"), ("Toilet", "switch.gc_w_e3", "water"),
             ("Wandcontactdozen", "switch.gc_k1", "energie")])
    p.webasto("guest_cabin", "Webasto guest cabin")


def aft(p):
    # No HA page of its own: leak sensors, bilge pump and sensor batteries in the new style.
    p.bilge("ap", ("Bilgepomp", "switch.ap_bilgepumpcontrol_01"),
            [("Lek laag", "binary_sensor.0x28dba7fffe752d09_battery_low"), ("Lek hoog", "binary_sensor.0x8c65a3fffecea649_battery_low")])


def front(p):
    # No HA page of its own: leak sensors, bilge pump, sensor batteries and the boiler in the new style.
    p.bilge("fp", ("Bilgepomp", "switch.fp_bilgepumpcontrol_01"),
            [("Lek laag", "sensor.fp_waterleaksensor_laag_battery"), ("Lek hoog", "binary_sensor.fp_waterleaksensor_hoog_battery_low")])
    p.title("Boiler")
    p.power([("Boiler", "switch.fp_boiler", "verwarming"), ("Boiler (relais)", "switch.0xa4c138dd3d53bb57", "verwarming")])



# Room contours (page coordinates, traced along the walls of the drawings in "TC90 JOAL"). A room listed here is drawn
# as that shape instead of its rectangle; LABEL_AT puts its label inside the shape.
OUTLINES = {
    # interior (drawing at x 42, y 377, 1210 × 287), aft → bow
    "Aft peak": [(54, 518), (64, 470), (150, 446), (262, 421), (262, 622), (150, 598), (64, 566)],
    "Owners cabin": [(264, 421), (360, 407), (480, 398), (480, 487), (410, 487), (410, 547), (505, 547), (505, 636), (400, 632), (264, 622)],
    "Engine room": [(482, 398), (612, 390), (612, 545), (412, 545), (412, 489), (482, 489)],
    "Dining": [(614, 389), (732, 397), (732, 545), (614, 545)],
    "Galley": [(590, 549), (735, 549), (735, 634), (640, 642), (590, 642)],
    "Main cabin": [(734, 397), (840, 412), (905, 424), (905, 545), (734, 545)],
    "Guest cabin": [(737, 549), (905, 549), (905, 602), (840, 617), (737, 634)],
    "Crew cabin": [(910, 425), (1000, 452), (1040, 462), (1040, 567), (1000, 577), (910, 602)],
    "Front peak": [(1042, 463), (1140, 487), (1235, 514), (1140, 542), (1042, 567)],
    # deck (drawing at x 42, y 76, 1210 × 319)
    "Loopplank": [(46, 250), (52, 205), (100, 186), (100, 312), (52, 296)],
    "Bimini": [(130, 215), (150, 196), (495, 186), (495, 311), (150, 302), (130, 282)],
    "Deck lounge": [(504, 166), (640, 166), (646, 172), (646, 320), (640, 326), (504, 326), (498, 320), (498, 172)],
    "Mast en giek": [(655, 200), (790, 200), (790, 300), (655, 300)],
    "Dekverlichting": [(800, 142), (900, 166), (1050, 198), (1185, 246), (1050, 294), (900, 331), (800, 352)],
}
LABEL_AT = {"Aft peak": (78, 505), "Owners cabin": (272, 430), "Engine room": (490, 404), "Dining": (620, 396),
            "Galley": (596, 555), "Main cabin": (740, 404), "Guest cabin": (743, 555), "Crew cabin": (916, 434),
            "Front peak": (1048, 505), "Loopplank": (52, 192), "Bimini": (152, 200), "Deck lounge": (504, 172),
            "Mast en giek": (661, 206), "Dekverlichting": (830, 180)}

room("interior", "Aft peak", (63, 414, 189, 206), aft, leak="ap")
room("interior", "Owners cabin", (258, 402, 247, 230), owners, value="sensor.temp_ownerscabin_temperature",
     active=ents(r"^light\.(oc_|owners_cabin_)"))
room("deck", "Deck lounge", (493, 164, 153, 165), deck_lounge,  # the deckhouse on the deck plan
     value="sensor.0x001788010df593f4_temperature",
     active=ents(r"^light\.(main_cabin_salon|mc_s_3)"))
room("interior", "Engine room", (505, 517, 109, 115), engine, value="sensor.0x001788010cdae144_temperature", leak="er",
     active=ents(r"^light\.er_"), alarm=[SCHROEFAS])
room("interior", "Dining", (614, 402, 115, 127), dining, leak="d", active=ents(r"^light\.mc_(5a$|5b$|s_5)"))
room("interior", "Galley", (614, 529, 115, 103), galley, active=ents(r"^light\.(g_s_4|mc_4a_g$|main_cabin_aanrecht)"))
room("interior", "Main cabin", (729, 402, 172, 132), main, value="sensor.temp_main_temperature",
     active=ents(r"^light\.(main_cabin_(lounge|workplace|gangpad|plinten)|mc_(6a|7a|7b|led)$|mc_s_(6|7))"))
room("interior", "Crew cabin", (901, 419, 132, 207), crew, value="sensor.motionsensorcrew_temperature", leak="cc",
     active=ents(r"^light\.(cc_|crew_cabin_)"))
room("interior", "Guest cabin", (729, 534, 172, 98), guest, active=ents(r"^light\.(gc_|guest_cabin_)"))
room("interior", "Front peak", (1039, 454, 172, 126), front, leak="fp", active=["switch.fp_boiler"])


# ---------- deck ----------

def gangway(p):
    p.title("Loopplank")
    p.grid([("Loopplank", "light.loopplank")])


def bimini(p):
    p.title("Scènes")
    p.scenes([("Bimini aan", "bimini_aan"), ("Bimini uit", "bimini_uit")])
    p.title("Bimini – verlichting")
    p.grid([("Bimini tafel", "light.bimini_14b_1tafel_d28"), ("Bimini bank", "light.bimini14a_bank_d18_2_d22")])
    p.title("Buitentemperatuur")
    p.note("Sensor ligt op de bimini.")
    p.sensors(("Temperatuur", "sensor.temp_buiten_temperature"),
              batteries=[("Temp-sensor", "sensor.temp_buiten_battery"), ("Temp buiten lounge", "sensor.buitenlounchetemp_battery")])


def mast(p):
    p.title("Scènes")
    p.scenes([("Mast aan", "mast_aan"), ("Mast uit", "mast_uit")])
    p.title("Mast en giek – verlichting")
    p.grid([("Spreader 3", "light.mc_s_15b_spreader_1_d42"), ("Spreader 2", "light.mc_s_15b_spreader_2_d43"),
            ("Spreader 1", "light.mc_s_15b_spreader_3_d44"), ("Spreader bovenin (alleen BB)", "light.mc_s_15b_spreader_4_d45"),
            ("Giek", "light.mc_s_15a0_giek"), ("Windex", "light.mc_s_15c_windex_d46")])
    p.note("De mastverlichting en de giekspot gaan automatisch aan bij zonsondergang en uit bij zonsopgang.")


def deck_lights(p):
    p.title("Scènes")
    p.scenes([("Deklicht aan", "deck_licht_aan"), ("Deklicht uit", "deck_licht_uit")])
    p.title("Dekverlichting")
    p.grid([("Deklicht BB naar beneden", "light.mc_s_15a_deck_bb_d40"), ("Deklicht SB naar beneden", "light.mc_s_15a_deck_sb_d41"),
            ("Decklight BB", "light.decklight_bb")])


room("deck", "Loopplank", (57, 178, 83, 100), gangway, active=["light.loopplank"])
room("deck", "Bimini", (145, 155, 337, 144), bimini, value="sensor.temp_buiten_temperature",
     active=["light.bimini_14b_1tafel_d28", "light.bimini14a_bank_d18_2_d22"])
room("deck", "Mast en giek", (659, 189, 133, 88), mast,
     active=ents(r"^light\.mc_s_15(a0|b|c)_"))
room("deck", "Dekverlichting", (814, 144, 332, 166), deck_lights,
     active=["light.mc_s_15a_deck_bb_d40", "light.mc_s_15a_deck_sb_d41", "light.decklight_bb"])


def render(plan):
    out = []
    for r in ROOMS[plan]:
        p = Panel()
        r["build"](p)
        if r["outline"]:
            pts = r["outline"]
            lx, ly = r["label_at"] or LABEL_AT.get(r["label"]) or (min(p[0] for p in pts) + 6, min(p[1] for p in pts) + 6)
            out += ["          - type: zone", f"            points: [{', '.join(f'[{x}, {y}]' for x, y in pts)}]",
                    f"            label_at: [{lx}, {ly}]", f"            label: {q(r['label'])}"]
        else:
            x, y, w, hh = r["rect"]
            out += ["          - type: zone", f"            x: {x}", f"            y: {y}", f"            width: {w}", f"            height: {hh}",
                    f"            label: {q(r['label'])}"]
        if r["value"]:
            out.append(f"            value_entity: {r['value']}")
        if r["active"]:
            out.append(f"            active_entity: [{', '.join(r['active'])}]")
        alarm = (list(LEAK[r["leak"]]) if r["leak"] else []) + r["alarm"]
        if alarm:
            out.append(f"            alarm_entity: [{', '.join(alarm)}]")
        out += ["            zoom:", f"              height: {p.y + 12}", "              items:"]
        out += [f"                - {s}" for s in p.items]
        if p.below:
            out += ["              below:", f"                height: {Panel.BH}", "                items:"]
            out += [f"                  - {s}" for s in p.below]
    return out


text = open(yaml_path, encoding="utf-8").read()

head = ["          # ---- ruimtes: tik = inzoomen, rechts alle lampen en apparaten van die ruimte ----",
        "          # Oranje = er brandt licht, rood knipperend = lekalarm. Plaats en maat per ruimte zijn een eerste schatting.",
        "          # Gegenereerd door tools/interieur_zones.py (indeling volgens het HA-dashboard van de bemanning); niet met de hand aanpassen."]
start = text.index("          # ---- ruimtes:")
end = text.index("          # ---- algemeen:")
text = text[:start] + "\n".join(head + render("interior")) + "\n\n" + text[end:]

deck = ["          # ---- dek: zones (gegenereerd door tools/interieur_zones.py) ----"] + render("deck") + ["          # ---- einde dek ----"]
if "# ---- dek: zones" in text:
    start = text.index("          # ---- dek: zones")
    end = text.index("          # ---- einde dek ----") + len("          # ---- einde dek ----")
    text = text[:start] + "\n".join(deck) + text[end:]
else:
    anchor = text.index("image: tc90-dekplan }")
    nl = text.index("\n", anchor) + 1
    text = text[:nl] + "\n" + "\n".join(deck) + "\n" + text[nl:]

open(yaml_path, "w", encoding="utf-8").write(text)
for plan, rs in ROOMS.items():
    for r in rs:
        p = Panel()
        r["build"](p)
        print(f"{plan:8} {r['label']:15} items {len(p.items):3}  hoogte {p.y + 12}")

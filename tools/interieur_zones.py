"""Generates the room zones (zone + zoom panel) on the interior and deck plans in examples/plc-dashboard.yaml.

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
    return '"' + s.replace('"', '\\"') + '"' if re.search(r"[:#,\[\]{}&*!|>'\"%@`]", s) or s[:1].isdigit() else s


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

    def rest(self, pattern, domain="light"):
        left = [e for e in ents(pattern, domain) if e not in self.used]
        if left:
            self.title("Overig")
            self.grid([(label(e), e) for e in left])


ROOMS = {"interior": [], "deck": []}


def room(plan, label_, rect, build, value=None, leak=None, active=(), alarm=()):
    ROOMS[plan].append(dict(label=label_, rect=rect, build=build, value=value, leak=leak, active=list(active), alarm=list(alarm)))


# ---------- interior ----------

def owners(p):
    p.title("Scènes")
    p.scenes([("Aan", "owners_cabin_aan"), ("Uit", "owners_cabin_uit"), ("50%", "oc_50"),
              ("Bed", "oc_bed"), ("Sanitair aan", "oc_sanitair_aan"), ("Sanitair uit", "oc_sanitair_uit")])
    p.title("Owners cabin – verlichting")
    p.grid([("Rondom laag plafond", "light.owners_cabin_rondom_laag_plafond"), ("Plinten", "light.owners_cabin_plinten")])
    p.grid([("Laag plafond BBA (2 spots)", "light.oc_s_1b_laag_bba_d11"), ("Laag plafond BBM (2 spots)", "light.oc_s_1b_laag_bbm_d10"),
            ("Laag plafond BBV (2 spots)", "light.oc_s_1b_laag_bbv_d9"), ("Laag plafond SBA (2 spots)", "light.oc_s_1b_laag_sba_d16"),
            ("Laag plafond SBM (2 spots)", "light.oc_s_1b_laag_sbm_d15"), ("Laag plafond SBV (2 spots)", "light.oc_s_1b_laag_sbv_d14"),
            ("Plinten bed", "light.oc_s_1b2_led_bed_d12"), ("Plinten trappen", "light.oc_s_1b2_led_vloer_d8")])
    p.title("Bad, toilet en douche – verlichting")
    p.grid([("Douche ruimte", "light.owners_cabin_douche_ruimte"), ("Douche (spot)", "light.oc_s_2a_douche_d18_1"),
            ("Wasbak (spot)", "light.oc_s_2a_wasbak_d17"), ("WC (2 spots)", "light.oc_s_2a_wc_d18"),
            ("Ledstrip wastafel", "light.oc_s_1b_kaptafel_d13"), ("Hal bad (6)", "light.oc_1c2"), ("Plint badkamer", "light.oc_1c3")])
    p.title("Stroomvoorziening")
    p.grid([("Webasto klimaat (bad)", "switch.oc_e1_2_l1"), ("Sanibroyeur 1", "switch.oc_w_e3"), ("Sanibroyeur 2", "switch.oc_w_e4"),
            ("Toilet", "switch.oc_w_e5"), ("Wandcontactdozen (TV)", "switch.oc_k1"), ("Stopcontact (plug)", "switch.0xa4c138b105c39a71")])
    p.climate("owners_cabin", "Webasto owners cabin")
    p.climate("owners_cabin_bad", "Webasto owners cabin bad")
    p.title("Beweging en temperatuur")
    p.note("Sensor ligt bij het kastje aan stuurboord.")
    p.sensors(("Temperatuur", "sensor.motion_sensor_ownerscabin_temperature"), "binary_sensor.motion_sensor_ownerscabin_occupancy",
              [("Bewegingssensor", "sensor.motion_sensor_ownerscabin_battery"), ("Temp-sensor", "sensor.temp_ownerscabin_battery")])
    p.rest(r"^light\.(oc_|owners_cabin_)")


def deck_lounge(p):
    p.title("Scènes")
    p.scenes([("Aan", "decklounge_aan"), ("Uit", "deck_lounge_uit")])
    p.title("Salon – verlichting")
    p.grid([("Salon rondom", "light.main_cabin_salon_rondom"), ("Plinten", "light.main_cabin_plinten")])
    p.grid([("Salon hoek BB achter (2 spots)", "light.mc_s_3a_dl_bba_d11_1"), ("Salon hoek BB midden (2 spots)", "light.mc_s_3a_dl_bbm_d11_2"),
            ("Salon hoek BB voor (2 spots)", "light.mc_s_3a_dl_bbv_d11_3"), ("Salon hoek SB achter (2 spots)", "light.mc_s_3a_dl_sba_d11_7"),
            ("Salon hoek SB midden (2 spots)", "light.mc_s_3a_dl_sbm_d11_6"), ("Salon hoek SB voor (2 spots)", "light.mc_s_3a_dl_sbv_d11_5"),
            ("Salon voor (2 spots)", "light.mc_s_3a_dl_v_d11_4"), ("Salon plinten", "light.mc_s_3b_trap_d9")])
    p.climate("deck_lounge", "Webasto deck lounge")
    p.title("Beweging en temperatuur")
    p.sensors(("Temperatuur", "sensor.0x001788010df593f4_temperature"), "binary_sensor.0x001788010df593f4_occupancy",
              [("Bewegingssensor", "sensor.0x001788010df593f4_battery")])
    p.title("Printer HP Smart Tank 5100")
    p.values([("Status", "sensor.hp_smart_tank_5100_series"), ("Zwart", "sensor.hp_smart_tank_5100_series_black_ink", ", decimals: 0"),
              ("Cyaan", "sensor.hp_smart_tank_5100_series_cyan_ink", ", decimals: 0"),
              ("Magenta", "sensor.hp_smart_tank_5100_series_magenta_ink", ", decimals: 0"),
              ("Geel", "sensor.hp_smart_tank_5100_series_yellow_ink", ", decimals: 0")])
    p.rest(r"^light\.mc_s_3c_")


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
    p.title("Scènes")
    p.scenes([("Aan", "dining_aan"), ("Uit", "dining_uit")])
    p.title("Eetkamer – verlichting")
    p.grid([("Scheiding eetkamer – lounge (spot)", "light.mc_s_5a_d_lr_d18"), ("Eetkamer kast + patrijspoort", "light.mc_s_5b_raam_kast_d13"),
            ("Eetkamer plinten kast", "light.mc_s_5c_plint_d14")])
    p.title("Bilge")
    p.leaks("d", [("Bilgepomp", "switch.0xccba97fffeeb6ddc")])
    p.sensors(batteries=[("Lek laag", "binary_sensor.0x0ceff6fffe76dcea_battery_low"), ("Lek hoog", "binary_sensor.0x0ceff6fffe9009c8_battery_low")])
    p.rest(r"^light\.mc_(5a$|5b$|s_5)")


def galley(p):
    p.title("Scènes")
    p.scenes([("Aan", "galley_aan"), ("Uit", "galley_uit"), ("Apparatuur aan", "keuken_apparatuur_aan"), ("Apparatuur uit", "keuken_apparatuur_uit")])
    p.title("Verlichting")
    p.grid([("Aanrecht", "light.main_cabin_aanrecht_geheel")])
    p.grid([("Aanrecht achterzijde", "light.g_s_4a_achter_d1"), ("Aanrecht kookplaat", "light.g_s_4a_kookplaat_d3"),
            ("Patrijs (2)", "light.g_s_4a_raam_d2"), ("Aanrecht vaatwasser", "light.g_s_4a_vaatw_d4"),
            ("Aanrecht onder kastjes", "light.g_s_4b_led_kast_d5")])
    p.title("Stroomvoorziening")
    p.grid([("Webasto klimaat", "switch.g_w_e1"), ("Sanibroyeur (wastafel)", "switch.g_w_e3"), ("Sanibroyeur (was/droog)", "switch.g_w_e4"),
            ("Wandcontactdozen", "switch.g_k2"), ("Afzuigkap", "switch.g_k1"), ("Vaatwasser", "switch.g_k3", CONFIRM), ("Oven", "switch.g_k4"),
            ("Koelkast", "switch.g_k5", CONFIRM), ("Vriezer", "switch.g_k6", CONFIRM), ("Was-droog", "switch.g_k7", CONFIRM),
            ("Smart plug keuken", "switch.socketgally")])
    p.climate("galley", "Webasto galley")
    p.title("Temperatuur omvormer schakelkast")
    p.sensors(("Temperatuur", "sensor.boiler_water_temp_temperature"), batteries=[("Temp-sensor", "sensor.boiler_water_temp_battery")])
    p.rest(r"^light\.(g_s_4|mc_4a_g$)")
    left = [e for e in ["switch.g_k8", "switch.0xa4c1384510c26c59", "switch.0xa4c1386689af54dc"] if e not in p.used]
    names = {"switch.0xa4c1384510c26c59": "Koelkast (relais)", "switch.0xa4c1386689af54dc": "Vriezer (relais)"}
    p.grid([(names.get(e, label(e)), e, CONFIRM if e in names else "") for e in left])


def main(p):
    p.title("Scènes")
    p.scenes([("Aan", "main_cabin_aan"), ("Uit", "main_cabin_uit"), ("Nacht", "living_room_nacht"),
              ("Werkplek aan", "mc_workplace_aan"), ("Werkplek uit", "mc_workplace_uit"), ("Patrijspoorten", "patrijspoorten")])
    p.title("Zithoek – verlichting")
    p.grid([("Lounge bank", "light.main_cabin_lounge_bank_geheel"), ("Plinten", "light.main_cabin_plinten")])
    p.grid([("Lounge tafel (2 spots)", "light.mc_s_7a_tafel_d25"), ("Lounge bank dwars 1 (2 spots)", "light.mc_s_7ab_bank_1_d31"),
            ("Lounge bank dwars 2 (spot)", "light.mc_s_7ac_bank_2_d30"), ("Lounge bank 1 (spot)", "light.mc_s_7ad_bank_3_d29"),
            ("Lounge bank 2 (spot)", "light.mc_s_7ae_bank_4_d28"), ("Lounge bank 3 (spot)", "light.mc_s_7af_bank_5_d27"),
            ("Lounge bank 4 (spot)", "light.mc_s_7ag_bank_6_d26"), ("Lounge patrijspoort", "light.mc_s_7ai_raam_d33"),
            ("Lounge plinten", "light.mc_s_7ak_plint_d34")])
    p.title("Werkkamer – verlichting")
    p.grid([("Werkplek plafond", "light.main_cabin_workplace_plafond"), ("Werkplek gang (2)", "light.mc_s_7b_gang_d36"),
            ("Werkplek kast (2)", "light.mc_s_7b_kast_d35"), ("Werkplek plinten", "light.mc_s_7b_plint_d37")])
    p.title("Gang – verlichting")
    p.grid([("Gangpad", "light.main_cabin_gangpad_geheel"), ("Gang 1 (2)", "light.mc_s_6a_gang1_d19"), ("Gang 2 (2)", "light.mc_s_6a_gang2_d21"),
            ("Gang 3 (2)", "light.mc_s_6a_gang3_d22"), ("Gang 4", "light.mc_s_6a_gang4_d23"), ("Mast", "light.mc_s_7aj_mast_d24")])
    p.climate("main_cabin", "Webasto main cabin")
    p.title("Stroomvoorziening")
    p.grid([("Webasto klimaat", "switch.mc_w_e1_2"), ("Wandcontactdozen", "switch.mc_k1"), ("Stopcontact (plug)", "switch.0xa4c138269e44b698"),
            ("Schoonwaterpomp", "switch.0x781c9dfffeb6cfcd"), ("Watertank vullen via wal", "valve.lr_dwp_wal_vulpunt", CONFIRM),
            ("Groep 5, 6, 7", "switch.main_cabin_mc_567"), ("Wandcontactdozen W-E3", "switch.mc_w_e3")])
    p.title("Bilge")
    p.grid([("Bilgepomp salon", "switch.0xe4b063fffe78d1e0", PUMP)])
    p.title("Temperatuur")
    p.note("Sensor ligt bij de mast.")
    p.sensors(("Temperatuur", "sensor.temp_main_temperature"), batteries=[("Temp-sensor", "sensor.temp_main_battery")])
    p.rest(r"^light\.(main_cabin_(?!aanrecht|salon)|mc_(3a|3b|6a|7a|7b|led)$|mc_s_(6|7))")


def crew(p):
    p.title("Scènes")
    p.scenes([("Aan", "crewcabin_aan"), ("Uit", "crewcabin_uit"), ("50%", "crew_cabin_50"), ("Bed", "crew_cabin_bed")])
    p.title("Verlichting")
    p.grid([("Plafond", "light.crew_cabin_plafond"), ("Hal en plinten", "light.crew_cabin_hal_en_plinten")])
    p.grid([("Plafond bed (2 spots)", "light.cc_s_11a_bed_d6"), ("Plafond zitjes (2 spots)", "light.cc_s_11a_zitje_d5"),
            ("Hal (2 spots)", "light.cc_s_11b_gang_d11"), ("Tafel (spot)", "light.cc_s_11a_tafel_d7"), ("Toilet (4 spots)", "light.cc_12a"),
            ("Plinten", "light.cc_s_11b_plint_d8"), ("Kasten ledstrip", "light.cc_s_11b_kasten_d12")])
    p.title("Stroomvoorziening")
    p.grid([("Climate control", "fan.cc_w_e1"), ("Sanibroyeur", "switch.cc_w_e2"), ("Toilet", "switch.cc_w_e3"),
            ("Wandcontactdozen", "switch.cc_k1"), ("Stopcontact (plug)", "switch.0xa4c138f65edc9815")])
    p.climate("crew_cabin", "Webasto crew cabin")
    p.title("Bilge")
    p.leaks("cc", [("Bilgepomp", "switch.0xccba97fffeea6c90")])
    p.title("Beweging en temperatuur")
    p.sensors(("Temperatuur", "sensor.motionsensorcrew_temperature"), "binary_sensor.motionsensorcrew_occupancy",
              [("Bewegingssensor", "sensor.motionsensorcrew_battery"), ("Lek laag", "binary_sensor.0x44e2f8fffe0be6ed_battery_low"),
               ("Lek hoog", "binary_sensor.0x8c65a3fffee0f85d_battery_low")])
    p.rest(r"^light\.(cc_|crew_cabin_)")


def guest(p):
    p.title("Scènes")
    p.scenes([("Aan", "guestcabin_aan"), ("Uit", "guestcabin_uit"), ("50%", "guest_cabin_50"), ("Bed", "guest_cabin_bed")])
    p.title("Guest cabin – verlichting")
    p.grid([("Plafond", "light.guest_cabin_plafond"), ("Gang (2 spots)", "light.gc_s_9a_gang_d5"), ("Bed achterzijde (spot)", "light.gc_s_9b_bed_a_d9"),
            ("Bed voorzijde (2 spots)", "light.gc_s_9b_bed_v_d8"), ("Plint", "light.gc_s_9b_plint_d10")])
    p.title("Toilet – verlichting")
    p.grid([("Toilet", "light.guest_cabin_toilet"), ("Toilet (2 spots)", "light.gc_s_10a_wc_d7"), ("Wasbak (2 spots)", "light.gc_s_10a_wasbak_d6")])
    p.title("Stroomvoorziening")
    p.grid([("Climate control", "switch.gc_w_e1"), ("Sanibroyeur", "switch.gc_w_e2"), ("Toilet", "switch.gc_w_e3"), ("Wandcontactdozen", "switch.gc_k1")])
    p.climate("guest_cabin", "Webasto guest cabin")
    p.rest(r"^light\.(gc_|guest_cabin_)")


def aft(p):
    p.title("Bilge")
    p.leaks("ap", [("Bilgepomp", "switch.ap_bilgepumpcontrol_01")])
    p.sensors(batteries=[("Lek laag", "binary_sensor.0x28dba7fffe752d09_battery_low"), ("Lek hoog", "binary_sensor.0x8c65a3fffecea649_battery_low")])


def front(p):
    p.title("Bilge")
    p.leaks("fp", [("Bilgepomp", "switch.fp_bilgepumpcontrol_01")])
    p.sensors(batteries=[("Lek laag", "sensor.fp_waterleaksensor_laag_battery"), ("Lek hoog", "binary_sensor.fp_waterleaksensor_hoog_battery_low")])
    p.title("Boiler")
    p.scenes([("Boiler aan", "boiler_aan"), ("Boiler uit", "boiler_uit")])
    p.grid([("Boiler", "switch.fp_boiler"), ("Boiler (relais)", "switch.0xa4c138dd3d53bb57")])


room("interior", "Aft peak", (63, 140, 189, 206), aft, leak="ap")
room("interior", "Owners cabin", (258, 128, 247, 230), owners, value="sensor.temp_ownerscabin_temperature",
     active=ents(r"^light\.(oc_|owners_cabin_)"))
room("interior", "Deck lounge", (505, 128, 109, 115), deck_lounge, value="sensor.0x001788010df593f4_temperature",
     active=ents(r"^light\.(main_cabin_salon|mc_s_3)"))
room("interior", "Engine room", (505, 243, 109, 115), engine, value="sensor.0x001788010cdae144_temperature", leak="er",
     active=ents(r"^light\.er_"), alarm=[SCHROEFAS])
room("interior", "Dining", (614, 128, 115, 127), dining, leak="d", active=ents(r"^light\.mc_(5a$|5b$|s_5)"))
room("interior", "Galley", (614, 255, 115, 103), galley, active=ents(r"^light\.(g_s_4|mc_4a_g$|main_cabin_aanrecht)"))
room("interior", "Main cabin", (729, 128, 172, 132), main, value="sensor.temp_main_temperature",
     active=ents(r"^light\.(main_cabin_(lounge|workplace|gangpad|plinten)|mc_(6a|7a|7b|led)$|mc_s_(6|7))"))
room("interior", "Crew cabin", (729, 260, 172, 98), crew, value="sensor.motionsensorcrew_temperature", leak="cc",
     active=ents(r"^light\.(cc_|crew_cabin_)"))
room("interior", "Guest cabin", (901, 145, 132, 207), guest, active=ents(r"^light\.(gc_|guest_cabin_)"))
room("interior", "Front peak", (1039, 180, 172, 126), front, leak="fp", active=["switch.fp_boiler"])


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


room("deck", "Loopplank", (57, 174, 83, 100), gangway, active=["light.loopplank"])
room("deck", "Bimini", (145, 151, 337, 144), bimini, value="sensor.temp_buiten_temperature",
     active=["light.bimini_14b_1tafel_d28", "light.bimini14a_bank_d18_2_d22"])
room("deck", "Mast en giek", (659, 185, 133, 88), mast,
     active=ents(r"^light\.mc_s_15(a0|b|c)_"))
room("deck", "Dekverlichting", (814, 140, 332, 166), deck_lights,
     active=["light.mc_s_15a_deck_bb_d40", "light.mc_s_15a_deck_sb_d41", "light.decklight_bb"])


def render(plan):
    out = []
    for r in ROOMS[plan]:
        p = Panel()
        r["build"](p)
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

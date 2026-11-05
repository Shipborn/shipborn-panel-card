"""Cuts the hull image (tc90-romp, the ship on Voortstuwing) out of the side view drawing.

Usage (needs Pillow, numpy, scipy):
  python tools/romp_uitsnede.py "TC90 JOAL/Side view.jpg" _ds_bron/tc90-romp.webp preview.png 135 2380 2700 200 700
Arguments after the paths: railing band height, mast columns from/to, railing band height at the stern, stern ends at column.
White background (and the light sails/boom) connected to the edge becomes transparent; thin lines (rigging) are
dropped except the railing in a band above the deck; nothing solid stays above the deck at the mast; the flag is
closed so its white stripe stays. Then embed the WebP as base64 under "tc90-romp" in IMAGES.
"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage
src, out, prev = sys.argv[1:4]
BAND, MAST0, MAST1, BAND_STERN, STERN = map(int, sys.argv[4:9])
im = Image.open(src).convert("RGB")
f = 4961 / 850
x0, y0 = int(40 * f), int(870 * f)
L, T = x0 + 60, y0 + 100          # 120 px higher than before, for the flag top
R, B = x0 + 4 * 1090, y0 + 4 * 168
c = np.asarray(im.crop((L, T, R, B))).astype(int)
H, W = c.shape[:2]
r, g, b = c[..., 0], c[..., 1], c[..., 2]
lum = c.mean(2); sat = c.max(2) - c.min(2)
bgish = (lum > 215) & (sat < 18)
bgish[:120, 300:] = True   # above the old crop top (boom, sails) counts as background
lab, n = ndimage.label(bgish)
edge = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0}
bg = np.isin(lab, list(edge))
fg = ~bg
# thick parts: hull, deckhouses, fittings
thick = ndimage.binary_opening(fg, structure=np.ones((5, 5)))
lab2, n2 = ndimage.label(thick); sizes = ndimage.sum(thick, lab2, range(1, n2 + 1))
thick = np.isin(lab2, 1 + np.where(sizes > 4000)[0])
# deck line per column: lowest brown (toerail) pixel
brown = (r > 80) & (r - b > 45) & (g < r - 20) & (g < 110) & (lum < 170)
deck = np.full(W, np.nan)
for x in range(W):
    ys = np.where(brown[:, x])[0]
    if len(ys): deck[x] = ys.max()
ok = ~np.isnan(deck); xs = np.arange(W)
deck = np.interp(xs, xs[ok], deck[ok]); deck = ndimage.median_filter(deck, 61)
m0, m1 = MAST0 - 40, MAST1 + 40
deck[m0:m1] = np.interp(xs[m0:m1], [m0, m1], [deck[m0], deck[m1]])
print("deck at mast", deck[m0], deck[(m0+m1)//2], deck[m1])
Y = np.arange(H)[:, None]
above = Y < deck[None, :] - 4
# band height: higher at the stern (pushpit), none over the deckhouses
top = np.full(W, np.nan)
for x in range(W):
    ys = np.where(brown[:, x])[0]
    if len(ys): top[x] = ys.min()
house = ndimage.binary_closing(np.nan_to_num(deck - top) > 40, structure=np.ones(15))
bh = np.where(xs < STERN, BAND_STERN, BAND).astype(float)
bh[house] = 0
band = (Y >= deck[None, :] - bh[None, :]) & (Y < deck[None, :])
# railing: thin dark lines in a band above the deck
lines = fg & (lum < 225) & band
keep = thick | lines
# mast base: nothing solid above the deck, only the railing lines
mcols = (xs >= MAST0) & (xs <= MAST1)
keep[:, mcols] &= ~(above[:, mcols] & ~lines[:, mcols])
# flag: colored parts, closed and hole-filled so its white band stays
FX = 300
flagc = np.zeros_like(fg); flagc[:, :FX] = (sat[:, :FX] > 40) & (lum[:, :FX] < 235) & ~brown[:, :FX]
flagc[int(deck[:FX].min()) - 10:, :] = False
flag = ndimage.binary_closing(flagc, structure=np.ones((61, 61)), border_value=0)
flag = ndimage.binary_fill_holes(flag | flagc)
# the white stripe at the top of the flag has no outline: fill it by hand (crop coordinates)
from PIL import ImageDraw
wm = Image.new("L", (W, H), 0)
ImageDraw.Draw(wm).polygon([(150, 99), (191, 161), (140, 188), (133, 158), (95, 149)], fill=255)
keep |= flag | (np.asarray(wm) > 0)
# above the old crop top: only the flag
keep[:120, FX:] = False
alpha = ndimage.gaussian_filter(keep.astype(float), 0.8) * 255
o = Image.fromarray(np.dstack([c, alpha]).astype(np.uint8), "RGBA")
bb = o.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox(); o = o.crop(bb)
print("bbox", bb, o.size, round(o.width / o.height, 3), "deck range", deck.min(), deck.max())
o.thumbnail((1700, 1700), Image.LANCZOS); o.save(out, "WEBP", quality=85, method=6)
bgc = Image.new("RGBA", o.size, (13, 14, 16, 255)); bgc.alpha_composite(o)
bgc.save(prev)

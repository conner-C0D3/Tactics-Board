#!/usr/bin/env python3
"""Compose each captured pitch into a 1920x1080 video frame and render it.

tour.js photographed the LIVE <svg> out of the running app, so each .svgbody is
the real pitch markup, not a redraw of it. All this does is put that markup on a
canvas at a fixed scale and letter it.

Two details are load-bearing:

  .stop-hit is an invisible click target. The app makes it transparent from its
  stylesheet, which did not come along with the markup, so without the rule
  below every ball-path stop paints as a solid black disc.

  Every frame is its own file, so the app's fixed gradient/marker ids cannot
  collide the way they do when several pitches share one composed sheet.

The pitch is 342x279 and the canvas is 16:9, so fitting the pitch by height
leaves a column spare. That column is where the captions live -- an overlay
across the grass would sit on top of the thing being explained.

Run it in slices: `python3 compose.py 0 800`. A full pass is over a minute and
the shell here is capped below that, so each call renders a range and skips any
PNG already written.
"""
import json, glob, os, sys, html, re
from multiprocessing import Pool
import cairosvg

OUT = '/sessions/gracious-epic-cerf/mnt/outputs'
SRC = '/tmp/frames'
DST = '/tmp/png'                 # scratch: the mounted outputs dir will not let
                                 # a re-run delete the previous pass's frames
# 1080p, not 720p: eleven against eleven puts twenty-two shirt numbers on a full
# pitch, and at 720p they are grey smudges.
W, H = 1920, 1080
PANEL = 522                      # caption column on the left
PAD = 21
FONT = 'DejaVu Sans'
BG = '#0f1417'
os.makedirs(DST, exist_ok=True)

files = sorted(glob.glob(SRC + '/*.svgbody'))
N = len(files)

# ---------------------------------------------------------------- the camera
#
# A full pitch is 342 x 279 and a rondo is twelve yards across, so filming the
# whole pitch every beat makes the thing being explained about forty pixels
# wide. So the camera frames what the beat actually draws.
#
# Bounds come only from the layers the user's own work lands in. ref-lines and
# the pitch furniture are excluded on purpose: the halfway line spans the whole
# pitch, so including it would pin every shot back out to the full view.
DRAW = ('item-layer', 'path-layer', 'run-layer', 'tape-layer',
        'play-layer', 'unit-layer', 'ghost-layer', 'sel-layer')
NUM = r'-?\d+(?:\.\d+)?'
RE_LAYER = re.compile(r'<g [^>]*class="(' + '|'.join(DRAW) + r')"[^>]*>(.*?)</g>\s*(?=<g |$)', re.S)
RE_TR = re.compile(r'translate\((' + NUM + r')[ ,](' + NUM + r')\)')
RE_C = re.compile(r'c([xy])="(' + NUM + r')"')
RE_LN = re.compile(r'\b([xy])([12])="(' + NUM + r')"')
RE_D = re.compile(r'\bd="([^"]+)"')


def points(body):
    """Every point the user drew, in pitch units."""
    xs, ys = [], []
    # Layers nest (an .item sits inside item-layer), so rather than parse the
    # tree, cut from each layer's opening tag to the next top-level one.
    idx = [(m.start(), m.group(1)) for m in
           re.finditer(r'<g [^>]*class="([\w-]+)"', body)]
    for i, (pos, cls) in enumerate(idx):
        if cls not in DRAW:
            continue
        end = len(body)
        for pos2, cls2 in idx[i + 1:]:
            if cls2 in DRAW or cls2 == 'ref-lines':
                end = pos2; break
        chunk = body[pos:end]
        for m in RE_TR.finditer(chunk):
            xs.append(float(m.group(1))); ys.append(float(m.group(2)))
        for m in RE_LN.finditer(chunk):
            (xs if m.group(1) == 'x' else ys).append(float(m.group(3)))
        # d="" is deliberately NOT read. Passes, runs and tape all render as
        # <line>, so the only path data in these layers is a player's nose
        # triangle and feet, drawn inside the item's own translate and so
        # measured from the player, not from the corner flag. Reading it as
        # absolute dragged every crop back towards 0,0 and left each beat
        # filmed from about twice as far away as it should have been.
        #
        # A circle's cx/cy is only a pitch coordinate in the play layer. Inside
        # an .item it is measured from the item's own translate, so reading it
        # as absolute would drag the bounds towards 0,0 -- the corner flag.
        if cls == 'play-layer':
            for m in RE_C.finditer(chunk):
                (xs if m.group(1) == 'x' else ys).append(float(m.group(2)))
    return xs, ys


def solve_camera():
    """One crop per beat, then glided so the cut is a move rather than a jump.

    Per FRAME bounds would judder: a ball leaving a player changes the bounding
    box every frame and the pitch would breathe. So the crop is decided once per
    caption -- what that beat is about -- and a low-pass filter carries the
    camera from one to the next over about half a second.
    """
    meta = json.load(open(OUT + '/tour-manifest.json'))
    vx, vy, vw, vh = [float(t) for t in json.load(open(files[0]))['vb'].split()]
    AR = (W - PANEL - PAD) / (H - PAD * 2)
    MINW = 78.0                            # ~26 yd: closer than this looks silly

    beats, cur = [], None                  # [start, end) index per caption
    for i, f in enumerate(meta):
        k = (f.get('cap'), f.get('sub'))
        if k != cur: beats.append([i, i + 1]); cur = k
        else: beats[-1][1] = i + 1

    target = [None] * N
    for lo, hi in beats:
        xs, ys = [], []
        for i in range(lo, hi):
            a, b = points(json.load(open(files[i]))['body'])
            xs += a; ys += b
        if not xs:                          # an empty pitch: show all of it
            r = (vx, vy, vw, vh)
        else:
            m = 14.0
            x0, x1 = min(xs) - m, max(xs) + m
            y0, y1 = min(ys) - m, max(ys) + m
            cw, ch = max(x1 - x0, MINW), max(y1 - y0, MINW / AR)
            if cw / ch > AR: ch = cw / AR
            else: cw = ch * AR
            cw, ch = min(cw, vw), min(ch, vh)   # never wider than the pitch
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            r = (min(max(cx - cw / 2, vx), vx + vw - cw),
                 min(max(cy - ch / 2, vy), vy + vh - ch), cw, ch)
        for i in range(lo, hi): target[i] = r

    cam, out = list(target[0]), []
    for t in target:
        for j in range(4):
            cam[j] += (t[j] - cam[j]) * 0.10
        # The four numbers are smoothed one at a time, so mid-glide the crop
        # drifts off the frame's shape. Re-impose it, or the pitch squashes.
        out.append((cam[0], cam[1], cam[2], cam[2] / AR))
    return out


def wrap(s, n):
    """Greedy wrap. The panel is narrow and the subtitles are a line of prose."""
    out, line = [], ''
    for word in s.split():
        t = (line + ' ' + word).strip()
        if len(t) > n and line:
            out.append(line); line = word
        else:
            line = t
    if line: out.append(line)
    return out


def uniq(markup, n):
    """The app names its gradients and markers after the field, so two drill
    pictures on one sheet are two elements answering to id="grass-big". Give
    each card its own suffix, or the second paints with the first's fill."""
    markup = re.sub(r'id="([\w-]+)"', r'id="\1_c%d"' % n, markup)
    return re.sub(r'url\(#([\w-]+)\)', r'url(#\1_c%d)' % n, markup)


_PLAN = None


def plan_sheet(aw, ah):
    """The printed plan, filling the frame where the pitch usually goes.

    The drill pictures are not redrawn here: each card holds the <svg> the app
    itself put on the sheet when Print plan was clicked, so if the print view
    ever stops picturing a drill, this goes blank rather than lying about it.
    """
    global _PLAN
    if _PLAN is None:
        _PLAN = json.load(open(OUT + '/plan.json'))
    p = _PLAN
    x0, y0, m = PANEL, PAD, 44
    parts = [f'<rect x="{x0}" y="{y0}" width="{aw}" height="{ah}" rx="9" fill="#f7f7f4"/>',
             f'<text x="{x0+m}" y="{y0+84}" font-family="{FONT}" font-size="42" '
             f'font-weight="bold" fill="#15201a">{html.escape(p["title"])}</text>',
             f'<text x="{x0+m}" y="{y0+126}" font-family="{FONT}" font-size="24" '
             f'fill="#6b7a72">{html.escape(p["sub"])}</text>',
             f'<line x1="{x0+m}" y1="{y0+152}" x2="{x0+aw-m}" y2="{y0+152}" '
             f'stroke="#d8dcd6" stroke-width="2"/>']
    top = y0 + 186
    ch = (ah - (top - y0) - m) / max(1, len(p['cards']))
    pw = 470
    for n, c in enumerate(p['cards']):
        cy = top + n * ch
        if c['svg']:
            parts.append(re.sub(r'^<svg', f'<svg x="{x0+m}" y="{cy+8:.0f}" width="{pw}" '
                                          f'height="{ch-52:.0f}"', uniq(c['svg'], n), count=1))
        tx = x0 + m + pw + 34
        parts.append(f'<text x="{tx}" y="{cy+56:.0f}" font-family="{FONT}" font-size="32" '
                     f'font-weight="bold" fill="#15201a">{html.escape(c["h"])}</text>')
        parts.append(f'<text x="{tx}" y="{cy+94:.0f}" font-family="{FONT}" font-size="21" '
                     f'fill="#6b7a72">{html.escape(c["meta"])}</text>')
        y = cy + 144
        for ln in wrap(c['note'], 32):
            parts.append(f'<text x="{tx}" y="{y:.0f}" font-family="{FONT}" font-size="23" '
                         f'fill="#2c3a33">{html.escape(ln)}</text>')
            y += 33
    return '\n'.join(parts)


def build(i, path, cam):
    d = json.load(open(path))
    vx, vy, vw, vh = cam                           # what the camera is looking at
    aw, ah = W - PANEL - PAD, H - PAD * 2          # the pitch's share of the canvas
    sc = min(aw / vw, ah / vh)
    ox = PANEL + (aw - vw * sc) / 2
    oy = PAD + (ah - vh * sc) / 2

    cap = html.escape(d.get('cap') or '')
    sub = d.get('sub') or ''
    lines = wrap(sub, 27)
    prog = (i / max(1, N - 1))

    # Wrap widths are set by what fits the panel, not by taste: at 51px a line
    # of fifteen characters is already at the panel's edge, and a title that
    # overflows is a title with its last word cut off.
    t = []
    y = 450
    for ln in wrap(cap, 14):
        t.append(f'<text x="{PAD+21}" y="{y}" font-family="{FONT}" font-size="51" '
                 f'font-weight="bold" fill="#f2f6f4">{html.escape(ln)}</text>')
        y += 63
    y += 15
    for ln in lines:
        t.append(f'<text x="{PAD+21}" y="{y}" font-family="{FONT}" font-size="28" '
                 f'fill="#8fa39b">{html.escape(ln)}</text>')
        y += 42
    caption = '\n'.join(t)
    stage = (plan_sheet(aw, ah) if d.get('kind') == 'plan' else
             f'<g clip-path="url(#vp)"><g transform="translate({ox:.2f} {oy:.2f}) '
             f'scale({sc:.5f}) translate({-vx:.3f} {-vy:.3f})">{d["body"]}</g></g>')

    return f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<style>.stop-hit{{fill:transparent}}</style>
<defs><clipPath id="vp"><rect x="{PANEL}" y="{PAD}" width="{aw}" height="{ah}" rx="9"/></clipPath></defs>
<rect width="{W}" height="{H}" fill="{BG}"/>
<text x="{PAD+21}" y="87" font-family="{FONT}" font-size="25" font-weight="bold" fill="#5f7a6e" letter-spacing="3">SOCCER FIELD PLANNER</text>
{caption}
<rect x="{PAD+21}" y="{H-84}" width="{PANEL-PAD*2-21}" height="6" rx="3" fill="#26312c"/>
<rect x="{PAD+21}" y="{H-84}" width="{max(3.0,(PANEL-PAD*2-21)*prog):.1f}" height="6" rx="3" fill="#4f9a76"/>
{stage}
</svg>'''


def one(arg):
    i, path, cam = arg
    dst = f'{DST}/f{i:05d}.png'
    if os.path.exists(dst) and os.path.getsize(dst) > 0:
        return 0
    cairosvg.svg2png(bytestring=build(i, path, cam).encode(), write_to=dst,
                     output_width=W, output_height=H)
    return 1


if __name__ == '__main__':
    lo = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    hi = int(sys.argv[2]) if len(sys.argv) > 2 else N
    cams = (json.load(open('/tmp/camera.json')) if os.path.exists('/tmp/camera.json')
            else None)
    if cams is None:
        cams = solve_camera()
        json.dump(cams, open('/tmp/camera.json', 'w'))
    work = [(i, f, cams[i]) for i, f in enumerate(files)][lo:hi]
    with Pool(4) as p:
        for k, _ in enumerate(p.imap_unordered(one, work, chunksize=8)):
            if k % 100 == 0:
                print(k, flush=True)
    print('done', lo, hi, flush=True)

# Bölge mankeni: her bölgenin kas path'lerini tek, temiz bir şekle birleştirir → src/data/bodyRegions.ts
# Parçalar rasterlanır, aralarındaki boşluk morfolojik kapamayla (genişlet + daralt) kapanır, dış kontur geri çizilir.
# Böylece kalın kontur hilesindeki dışa taşmalar olmaz. Çalıştırma: python scripts/build-body-regions.py
import json, math, re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
S = 3  # raster ölçeği (viewBox birimi başına piksel)
GAP = 14  # kapanacak en geniş boşluk, viewBox birimi

src = (ROOT / 'src/data/bodyPaths.ts').read_text(encoding='utf-8')
body = json.loads(src[src.index('= {') + 2:].rstrip().rstrip(';'))
mm = (ROOT / 'src/data/muscleMap.ts').read_text(encoding='utf-8')
region_of = dict(re.findall(r"id: '(\w+)',[^}]*?regionId: '(\w+)'", mm, re.S))


def flatten(d):
    """SVG path → kapalı çokgen listesi (eğriler örneklenir)."""
    toks = re.findall(r'[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?', d)
    i, cmd = 0, ''
    x = y = sx = sy = 0.0
    px = py = None  # son kontrol noktası (S/T için)
    polys, cur = [], []

    def num():
        nonlocal i
        i += 1
        return float(toks[i - 1])

    def flag():
        nonlocal i
        t = toks[i]
        if t in ('0', '1'):
            i += 1
            return int(t)
        toks[i] = t[1:]
        return int(t[0])

    def cubic(x0, y0, x1, y1, x2, y2, x3, y3):
        for k in range(1, 13):
            t = k / 12
            mt = 1 - t
            cur.append((mt**3 * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t**3 * x3,
                        mt**3 * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t**3 * y3))

    def arc(x1, y1, rx, ry, phi, fa, fs, x2, y2):
        rx, ry = abs(rx), abs(ry)
        if rx == 0 or ry == 0:
            cur.append((x2, y2)); return
        c, s = math.cos(math.radians(phi)), math.sin(math.radians(phi))
        dx, dy = (x1 - x2) / 2, (y1 - y2) / 2
        x1p, y1p = c * dx + s * dy, -s * dx + c * dy
        lam = x1p**2 / rx**2 + y1p**2 / ry**2
        if lam > 1:
            rx, ry = rx * math.sqrt(lam), ry * math.sqrt(lam)
        num_ = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
        den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
        co = math.sqrt(max(0, num_ / den)) * (-1 if fa == fs else 1)
        cxp, cyp = co * rx * y1p / ry, -co * ry * x1p / rx
        cx, cy = c * cxp - s * cyp + (x1 + x2) / 2, s * cxp + c * cyp + (y1 + y2) / 2
        a1 = math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx)
        a2 = math.atan2((-y1p - cyp) / ry, (-x1p - cxp) / rx)
        da = a2 - a1
        if fs and da < 0: da += 2 * math.pi
        if not fs and da > 0: da -= 2 * math.pi
        n = max(4, int(abs(da) / 0.2))
        for k in range(1, n + 1):
            a = a1 + da * k / n
            cur.append((c * rx * math.cos(a) - s * ry * math.sin(a) + cx, s * rx * math.cos(a) + c * ry * math.sin(a) + cy))

    while i < len(toks):
        if re.match(r'[a-zA-Z]', toks[i]):
            cmd = toks[i]; i += 1
        rel = cmd.islower()
        ox, oy = (x, y) if rel else (0, 0)
        C = cmd.upper()
        if C == 'M':
            if len(cur) > 2: polys.append(cur)
            x, y = ox + num(), oy + num(); sx, sy = x, y
            cur = [(x, y)]
            cmd = 'l' if rel else 'L'; px = None
        elif C == 'L':
            x, y = ox + num(), oy + num(); cur.append((x, y)); px = None
        elif C == 'H':
            x = (x if rel else 0) + num(); cur.append((x, y)); px = None
        elif C == 'V':
            y = (y if rel else 0) + num(); cur.append((x, y)); px = None
        elif C == 'C':
            x1, y1, x2, y2, x3, y3 = ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num()
            cubic(x, y, x1, y1, x2, y2, x3, y3); px, py = x2, y2; x, y = x3, y3
        elif C == 'S':
            x1, y1 = (2 * x - px, 2 * y - py) if px is not None else (x, y)
            x2, y2, x3, y3 = ox + num(), oy + num(), ox + num(), oy + num()
            cubic(x, y, x1, y1, x2, y2, x3, y3); px, py = x2, y2; x, y = x3, y3
        elif C == 'Q':
            qx, qy, x3, y3 = ox + num(), oy + num(), ox + num(), oy + num()
            cubic(x, y, x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), x3 + 2 / 3 * (qx - x3), y3 + 2 / 3 * (qy - y3), x3, y3)
            px, py = qx, qy; x, y = x3, y3
        elif C == 'T':
            qx, qy = (2 * x - px, 2 * y - py) if px is not None else (x, y)
            x3, y3 = ox + num(), oy + num()
            cubic(x, y, x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), x3 + 2 / 3 * (qx - x3), y3 + 2 / 3 * (qy - y3), x3, y3)
            px, py = qx, qy; x, y = x3, y3
        elif C == 'A':
            rx, ry, phi = num(), num(), num()
            fa, fs = flag(), flag()
            x2, y2 = ox + num(), oy + num()
            arc(x, y, rx, ry, phi, fa, fs, x2, y2); x, y = x2, y2; px = None
        elif C == 'Z':
            if len(cur) > 2: polys.append(cur)
            x, y = sx, sy; cur = [(x, y)]; px = None
        else:
            raise ValueError(cmd)
    if len(cur) > 2: polys.append(cur)
    return polys


def trace(mask):
    """Tek bileşenli maskenin dış konturu (Moore komşu izleme), piksel köşe koordinatlarında."""
    h, w = mask.shape
    m = np.zeros((h + 2, w + 2), bool); m[1:-1, 1:-1] = mask
    ys, xs = np.nonzero(m)
    start = (ys[0], xs[0])
    dirs = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]
    pts, cur, back = [start], start, 6  # başlangıçta batıdan gelinmiş say
    for _ in range(10_000_000):
        for k in range(8):
            dd = (back + 1 + k) % 8
            ny, nx = cur[0] + dirs[dd][0], cur[1] + dirs[dd][1]
            if m[ny, nx]:
                back = (dd + 4) % 8
                cur = (ny, nx)
                break
        if cur == start: break
        pts.append(cur)
    return [((x - 1 + 0.5) / S, (y - 1 + 0.5) / S) for y, x in pts]


def dp(pts, eps):
    """Douglas-Peucker sadeleştirme (kapalı çokgen için iki yarıya bölerek)."""
    def rec(a):
        if len(a) < 3: return a
        (x1, y1), (x2, y2) = a[0], a[-1]
        L = math.hypot(x2 - x1, y2 - y1) or 1e-9
        dmax, idx = 0, 0
        for j in range(1, len(a) - 1):
            d = abs((y2 - y1) * a[j][0] - (x2 - x1) * a[j][1] + x2 * y1 - y2 * x1) / L
            if d > dmax: dmax, idx = d, j
        if dmax <= eps: return [a[0], a[-1]]
        return rec(a[:idx + 1])[:-1] + rec(a[idx:])
    h = len(pts) // 2
    return rec(pts[:h + 1])[:-1] + rec(pts[h:] + [pts[0]])[:-1]


def chaikin(pts, n=2):
    for _ in range(n):
        out = []
        for j in range(len(pts)):
            (x0, y0), (x1, y1) = pts[j], pts[(j + 1) % len(pts)]
            out += [(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1), (0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1)]
        pts = out
    return pts


r = GAP * S // 2
yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
disk = xx * xx + yy * yy <= r * r
out = {}
for side, data in body.items():
    vb = data['viewBox']
    W, H = vb['w'] * S + 2 * r + 4, vb['h'] * S + 2 * r + 4
    ox, oy = vb['x'] - (r + 2) / S, vb['y'] - (r + 2) / S
    groups = {}
    for mus in data['muscles']:
        groups.setdefault(region_of[mus['id']], []).append(mus['d'])
    shapes = []
    for rid, ds in groups.items():
        img = Image.new('L', (int(W), int(H)), 0)
        dr = ImageDraw.Draw(img)
        for d in set(ds):  # kırpmalı parçalar aynı path'i tekrar kullanır
            for poly in flatten(d):
                dr.polygon([((px - ox) * S, (py - oy) * S) for px, py in poly], fill=255)
        mask = np.array(img) > 127
        mask = ndimage.binary_fill_holes(ndimage.binary_closing(mask, structure=disk))
        lab, n = ndimage.label(mask)
        parts = []
        for k in range(1, n + 1):
            comp = lab == k
            if comp.sum() < (4 * S) ** 2: continue
            pts = chaikin(dp(trace(comp), 0.9), 2)
            parts.append('M' + 'L'.join(f'{px + ox:.1f} {py + oy:.1f}' for px, py in pts) + 'Z')
        shapes.append({'id': rid, 'd': ''.join(parts)})
    out[side] = shapes
    print(side, [(s['id'], len(s['d'])) for s in shapes])

(ROOT / 'src/data/bodyRegions.ts').write_text(
    '// scripts/build-body-regions.py tarafından üretildi — elle düzenleme.\n'
    '// Bölge mankeni: her bölge kas path\'lerinin (MuscleMap, MIT) birleşiminden tek şekil.\n\n'
    'export const bodyRegions: Record<\'front\' | \'back\', { id: string; d: string }[]> = '
    + json.dumps(out, ensure_ascii=False) + ';\n', encoding='utf-8')

# MVM logosu: tek çizgi, yuvarlak uçlu kalın "M". Tüm ikon/açılış görsellerini üretir. Çalıştırma: python tools/make_logo.py
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'images'
BG_TOP, BG_BOTTOM = (122, 31, 50), (58, 12, 22)  # şarap tonları
MARK = (246, 238, 226)
# 100×100 birimlik çizim: M'nin köşe noktaları ve çizgi kalınlığı (src/components/Logo.tsx ile aynı)
POINTS = [(24, 72), (24, 30), (50, 56), (76, 30), (76, 72)]
STROKE = 13


def mark(size, scale, color, offset=(0, 0)):
    """size×size saydam tuvale, 100 birim = scale piksel olacak şekilde ortalanmış M çizer (4x örnekleme)."""
    ss = 4
    im = Image.new('RGBA', (size * ss, size * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    k = scale * ss / 100
    ox = (size * ss - 100 * k) / 2 + offset[0] * ss
    oy = (size * ss - 100 * k) / 2 + offset[1] * ss
    pts = [(ox + x * k, oy + y * k) for x, y in POINTS]
    w = STROKE * k
    d.line(pts, fill=color, width=round(w), joint='curve')
    for x, y in pts:
        d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=color)
    return im.resize((size, size), Image.LANCZOS)


def background(size, radius=0):
    g = Image.new('RGBA', (size, size))
    d = ImageDraw.Draw(g)
    for y in range(size):
        t = y / (size - 1)
        d.line([(0, y), (size, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(BG_TOP, BG_BOTTOM)) + (255,))
    if radius:
        m = Image.new('L', (size * 4, size * 4), 0)
        ImageDraw.Draw(m).rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius * 4, fill=255)
        g.putalpha(m.resize((size, size), Image.LANCZOS))
    return g


icon = background(1024)
icon.alpha_composite(mark(1024, 640, MARK))
icon.save(OUT / 'icon.png')
background(512).save(OUT / 'android-icon-background.png')
mark(512, 250, MARK).save(OUT / 'android-icon-foreground.png')  # uyarlanabilir ikonun güvenli alanı içinde
mark(432, 210, (255, 255, 255)).save(OUT / 'android-icon-monochrome.png')
splash = background(288, radius=72)
splash.alpha_composite(mark(288, 180, MARK))
splash.save(OUT / 'splash-icon.png')
fav = background(48, radius=12)
fav.alpha_composite(mark(48, 30, MARK))
fav.save(OUT / 'favicon.png')
print('ok')

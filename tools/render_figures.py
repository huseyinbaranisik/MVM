"""README figures for MVM, rendered from real emulator screenshots and a real recording in assets/src/.

usage (from the repo root):
  uv run --with pillow --with imageio-ffmpeg python tools/render_figures.py

Writes assets/hero.png, assets/demo.gif, assets/screens.png, assets/widget.png (if the widget captures exist)
and assets/terminal.png. Colours come from the app's logo and its default "Şarap" theme.
"""
import os

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "src")
OUT = os.path.join(ROOT, "assets")
FONTS = os.path.join(ROOT, "tools", "fonts")

BG = (14, 12, 11)
PANEL = (27, 23, 22)
BEZEL = (34, 30, 29)
WINE_TOP, WINE_BOTTOM = (122, 31, 50), (58, 12, 22)
MARK = (246, 238, 226)
TEXT = (243, 237, 226)
TEXT_2 = (160, 150, 140)
ACCENT = (201, 86, 106)
DIVIDER = (48, 42, 40)


def font(size, weight=600, name="Manrope.ttf"):
    f = ImageFont.truetype(os.path.join(FONTS, name), size)
    if name == "Manrope.ttf":
        f.set_variation_by_axes([weight])
    return f


MONO = lambda s: ImageFont.truetype(os.path.join(FONTS, "IBMPlexMono-Regular.ttf"), s)
MONO_B = lambda s: ImageFont.truetype(os.path.join(FONTS, "IBMPlexMono-SemiBold.ttf"), s)


def rounded_mask(size, r):
    m = Image.new("L", (size[0] * 2, size[1] * 2), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] * 2 - 1, size[1] * 2 - 1), r * 2, fill=255)
    return m.resize(size, Image.LANCZOS)


def shadow(canvas, box, r, blur=36, alpha=170, offset=(0, 22)):
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    x0, y0, x1, y1 = box
    ImageDraw.Draw(layer).rounded_rectangle((x0 + offset[0], y0 + offset[1], x1 + offset[0], y1 + offset[1]), r, fill=(0, 0, 0, alpha))
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur)))


def glow(canvas, center, radius, color, alpha=90):
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    cx, cy = center
    ImageDraw.Draw(layer).ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=color + (alpha,))
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(radius * 0.6)))


def logo(size):
    """The app logo: a single-stroke "M" on a wine gradient tile (same geometry as src/components/Logo.tsx)."""
    ss = 4
    s = size * ss
    tile = Image.new("RGBA", (s, s))
    d = ImageDraw.Draw(tile)
    for y in range(s):
        t = y / (s - 1)
        d.line([(0, y), (s, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(WINE_TOP, WINE_BOTTOM)) + (255,))
    k = s / 100
    pts = [(x * k, y * k) for x, y in [(24, 72), (24, 30), (50, 56), (76, 30), (76, 72)]]
    w = 13 * k
    d.line(pts, fill=MARK, width=round(w), joint="curve")
    for x, y in pts:
        d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=MARK)
    tile.putalpha(rounded_mask((s, s), int(26 * k)))
    return tile.resize((size, size), Image.LANCZOS)


def phone(shot, height, bezel=14, radius=56):
    """A real screenshot in a plain phone frame."""
    shot = shot.convert("RGBA")
    w = round(shot.width * height / shot.height)
    screen = shot.resize((w, height), Image.LANCZOS)
    frame = Image.new("RGBA", (w + bezel * 2, height + bezel * 2), (0, 0, 0, 0))
    ImageDraw.Draw(frame).rounded_rectangle((0, 0, frame.width - 1, frame.height - 1), radius + bezel, fill=BEZEL)
    frame.paste(screen, (bezel, bezel), rounded_mask(screen.size, radius))
    return frame


def chip(draw, x, y, label, f):
    tw = draw.textlength(label, font=f)
    draw.rounded_rectangle((x, y, x + tw + 36, y + 46), 23, fill=PANEL, outline=DIVIDER, width=2)
    draw.text((x + 18, y + 23), label, font=f, fill=TEXT, anchor="lm")
    return x + tw + 36 + 12


def src(name):
    return Image.open(os.path.join(SRC, name))


def hero():
    W, H = 1800, 920
    c = Image.new("RGBA", (W, H), BG + (255,))
    glow(c, (330, 260), 420, WINE_TOP, 70)
    glow(c, (1350, 640), 380, WINE_TOP, 55)
    d = ImageDraw.Draw(c)

    c.alpha_composite(logo(132), (110, 150))
    d.text((110, 318), "MVM", font=font(132, 800), fill=TEXT)
    d.text((114, 478), "Workouts, habits and daily tracking", font=font(40, 700), fill=TEXT)
    body = font(28, 500)
    lines = ["Plan the week, log every set, and keep water, steps,",
             "sleep, calories and a daily streak on one home screen.",
             "Android app in Turkish, built with Expo."]
    for i, line in enumerate(lines):
        d.text((114, 548 + i * 42), line, font=body, fill=TEXT_2)
    x = 114
    for label in ["Expo SDK 58", "React Native", "TypeScript", "Supabase", "Home widget"]:
        x = chip(d, x, 700, label, font(22, 600))

    back = phone(src("v14-level.png"), 640)
    front = phone(src("v14-home.png"), 720)
    bx, by = 1080, 70
    fx, fy = 1340, 150
    shadow(c, (bx, by, bx + back.width, by + back.height), 70)
    c.alpha_composite(back, (bx, by))
    shadow(c, (fx, fy, fx + front.width, fy + front.height), 70)
    c.alpha_composite(front, (fx, fy))
    c.convert("RGB").save(os.path.join(OUT, "hero.png"))


def demo():
    """Fig. 2: the real recording, sped up 1.6×, in the phone frame on a flat background (flat for the GIF palette)."""
    reader = imageio_ffmpeg.read_frames(os.path.join(SRC, "demo-v14.mp4"))
    meta = next(reader)
    sw, sh = meta["size"]
    fps_in = meta["fps"]
    step = fps_in * 1.6 / 8  # 8 fps out, 1.6× speed
    frames, i, nxt = [], 0, 0.0
    for raw in reader:
        if i >= nxt:
            img = Image.frombytes("RGB", (sw, sh), raw)
            framed = phone(img, 620, bezel=10, radius=36)
            canvas = Image.new("RGB", (framed.width + 60, framed.height + 60), BG)
            canvas.paste(framed, (30, 30), framed)
            frames.append(canvas.convert("P", palette=Image.ADAPTIVE, colors=96))
            nxt += step
        i += 1
    durations = [125] * (len(frames) - 1) + [1200]
    frames[0].save(os.path.join(OUT, "demo.gif"), save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True)


def screens():
    """Fig. 3: four screens with captions."""
    items = [("v14-library.png", "Region body map"), ("v14-level.png", "Level path"),
             ("v14-stats.png", "Statistics"), ("v14-custom-theme.png", "Custom theme")]
    phones = [phone(src(n), 760, bezel=12, radius=46) for n, _ in items]
    gap = 40
    W = sum(p.width for p in phones) + gap * (len(phones) + 1)
    H = 760 + 24 + 140
    c = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(c)
    x = gap
    for p, (_, cap) in zip(phones, items):
        shadow(c, (x, 30, x + p.width, 30 + p.height), 58, blur=24, alpha=150, offset=(0, 14))
        c.alpha_composite(p, (x, 30))
        d.text((x + p.width / 2, 30 + p.height + 50), cap, font=font(30, 700), fill=TEXT, anchor="mm")
        x += p.width + gap
    c.convert("RGB").save(os.path.join(OUT, "screens.png"))


def widget():
    """Fig. 4: the home-screen widget at 3×1, 3×2 and 4×2, cropped from emulator screenshots."""
    names = [("v14-widget-3x1.png", "3×1"), ("v14-widget-3x2.png", "3×2"), ("v14-widget-4x2.png", "4×2")]
    names = [(n, cap) for n, cap in names if os.path.exists(os.path.join(SRC, n))]
    if not names:
        print("widget captures missing, skipping widget.png")
        return
    ims = [src(n).convert("RGBA") for n, _ in names]
    scale = 0.62
    ims = [im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS) for im in ims]
    gap = 60
    W = sum(im.width for im in ims) + gap * (len(ims) + 1)
    H = max(im.height for im in ims) + 160
    c = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(c)
    x = gap
    for im, (_, cap) in zip(ims, names):
        y = H - 110 - im.height
        c.alpha_composite(im, (x, y))
        d.text((x + im.width / 2, H - 60), cap, font=font(30, 700), fill=TEXT_2, anchor="mm")
        x += im.width + gap
    c.convert("RGB").save(os.path.join(OUT, "widget.png"))


def terminal():
    """Fig. 5: the real output of the checks (assets/src/checks-*.txt)."""
    def lines(name):
        with open(os.path.join(SRC, name), encoding="utf-8") as f:
            return [l.rstrip() for l in f if l.strip()]
    blocks = [("npx tsc --noEmit", lines("checks-tsc.txt")),
              ("npx expo lint", lines("checks-lint.txt")),
              ("npx jest", lines("checks-jest.txt"))]
    W, lh = 1800, 40
    n = sum(len(b) + 2 for _, b in blocks)
    H = 110 + n * lh + 40
    c = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(c)
    d.rounded_rectangle((30, 20, W - 30, H - 20), 22, fill=PANEL, outline=DIVIDER, width=2)
    for i, col in enumerate([(201, 86, 106), (201, 162, 90), (110, 139, 91)]):
        d.ellipse((66 + i * 34, 48, 86 + i * 34, 68), fill=col)
    d.text((W / 2, 58), "MVM — checks", font=font(24, 600), fill=TEXT_2, anchor="mm")
    y = 110
    for cmd, out in blocks:
        d.text((70, y), "$", font=MONO_B(28), fill=ACCENT)
        d.text((104, y), cmd, font=MONO_B(28), fill=TEXT)
        y += lh
        for l in out:
            col = (130, 170, 110) if ("passed" in l or l == "exit 0") else TEXT_2
            d.text((104, y), l, font=MONO(26), fill=col)
            y += lh
        y += lh
    c.convert("RGB").save(os.path.join(OUT, "terminal.png"))


if __name__ == "__main__":
    hero()
    screens()
    widget()
    terminal()
    demo()
    print("ok")

"""README figures for MVM, rendered from real screenshots and a real emulator recording in assets/src/.

usage (from the repo root):
  uv run --with pillow --with imageio-ffmpeg python tools/render_figures.py

Writes assets/hero.png, assets/demo.gif, assets/terminal.png, assets/clip-*.gif, assets/themes.png, assets/dialogs.png.
Colours are the app's default "Bordo & Bej" theme (src/theme/colors.ts).
"""
import os
import subprocess
import tempfile

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "src")
OUT = os.path.join(ROOT, "assets")
FONTS = os.path.join(ROOT, "tools", "fonts")

# src/theme/colors.ts (Bordo & Bej)
BG = (14, 12, 11)
SURFACE = (26, 23, 22)
ELEVATED = (36, 31, 29)
PRIMARY = (122, 31, 43)
PRIMARY_LIGHT = (163, 53, 69)
ACCENT = (232, 220, 196)
ACCENT_MUTED = (184, 170, 144)
TEXT = (243, 237, 226)
TEXT_2 = (156, 146, 134)
DIVIDER = (46, 40, 38)
SUCCESS = (110, 139, 91)


def font(name, size, weight=None):
    f = ImageFont.truetype(os.path.join(FONTS, name), size)
    if weight is not None:
        f.set_variation_by_axes([weight])
    return f


TITLE = lambda s: font("ArchivoBlack-Regular.ttf", s)
BODY = lambda s, w=500: font("Manrope.ttf", s, w)
MONO = lambda s: font("IBMPlexMono-Regular.ttf", s)
MONO_B = lambda s: font("IBMPlexMono-SemiBold.ttf", s)


def rounded_mask(size, r):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), r, fill=255)
    return m


def shadow(canvas, box, r, blur=40, alpha=150, offset=(0, 24)):
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    x0, y0, x1, y1 = box
    ImageDraw.Draw(layer).rounded_rectangle((x0 + offset[0], y0 + offset[1], x1 + offset[0], y1 + offset[1]), r, fill=(0, 0, 0, alpha))
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur)))


def phone(screen, width):
    """Real screenshot inside a simple phone frame (bezel + rounded corners)."""
    pad = max(10, width // 28)
    sw = width - 2 * pad
    sh = round(screen.height * sw / screen.width)
    shot = screen.convert("RGB").resize((sw, sh), Image.LANCZOS)
    frame = Image.new("RGBA", (width, sh + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(frame)
    r = width // 9
    d.rounded_rectangle((0, 0, width - 1, sh + 2 * pad - 1), r, fill=(24, 21, 20), outline=(58, 51, 48), width=3)
    frame.paste(shot, (pad, pad), rounded_mask((sw, sh), r - pad))
    return frame


def glow(canvas, center, radius, color, alpha):
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    cx, cy = center
    ImageDraw.Draw(layer).ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=color + (alpha,))
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(radius // 2)))


def chip(d, xy, text, fg, f):
    x, y = xy
    w = d.textlength(text, font=f)
    d.rounded_rectangle((x, y, x + w + 44, y + 64), 18, fill=SURFACE, outline=DIVIDER, width=2)
    d.text((x + 22, y + 32), text, font=f, fill=fg, anchor="lm")
    return x + w + 44


def check(d, x, y, s, color, width=4):
    """✓ drawn as strokes (IBM Plex Mono has no tick glyph at this weight)."""
    d.line([(x, y + s * 0.55), (x + s * 0.38, y + s * 0.9), (x + s, y + s * 0.1)], fill=color, width=width, joint="curve")


# ---------------------------------------------------------------- hero
def hero():
    W, H = 1800, 920
    c = Image.new("RGBA", (W, H), BG + (255,))
    glow(c, (1380, 470), 360, PRIMARY, 90)
    glow(c, (250, 160), 260, PRIMARY, 40)
    d = ImageDraw.Draw(c)

    d.text((110, 110), "MVM", font=TITLE(220), fill=ACCENT)
    d.text((116, 370), "Workouts and daily habits", font=BODY(54, 800), fill=TEXT)
    for i, line in enumerate([
        "A weekly program, a live set logger and rest timer,",
        "water, steps, sleep and calories on one screen,",
        "a streak that keeps it going. Turkish UI, 9 themes.",
    ]):
        d.text((116, 470 + i * 50), line, font=BODY(34, 500), fill=TEXT_2)

    x = 116
    for text, fg in [("Expo SDK 58", ACCENT), ("React Native", ACCENT), ("TypeScript", ACCENT),
                     ("Supabase", (124, 196, 140))]:
        x = chip(d, (x, 636), text, fg, BODY(28, 700)) + 16

    # result card: numbers from assets/src/checks-*.txt
    card = (116, 740, 660, 864)
    shadow(c, card, 22, blur=20, alpha=120, offset=(0, 10))
    d = ImageDraw.Draw(c)
    d.rounded_rectangle(card, 22, fill=SURFACE, outline=DIVIDER, width=2)
    d.text((146, 766), "JEST · TSC · LINT", font=BODY(22, 800), fill=PRIMARY_LIGHT)
    d.text((146, 798), "48 / 48", font=TITLE(40), fill=ACCENT)
    d.text((350, 800), "tests pass, no type\nor lint errors", font=BODY(23, 600), fill=TEXT_2, spacing=6)

    shot = Image.open(os.path.join(SRC, "home-bordo.png"))
    ph = phone(shot, 400)
    px, py = 1230, (H - ph.height) // 2
    shadow(c, (px, py, px + ph.width, py + ph.height), 56)
    c.alpha_composite(ph, (px, py))
    c.convert("RGB").save(os.path.join(OUT, "hero.png"), optimize=True)


# ---------------------------------------------------------------- video helpers
def video_frames(start, end, fps, speed=1.0):
    """Frames of assets/src/demo.mp4 between start and end (seconds), sped up by `speed`."""
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    tmp = tempfile.mkdtemp()
    subprocess.run([ff, "-loglevel", "error", "-ss", str(start), "-to", str(end), "-i", os.path.join(SRC, "demo.mp4"),
                    "-vf", f"setpts=PTS/{speed},fps={fps}", os.path.join(tmp, "f%04d.png")], check=True)
    return [Image.open(os.path.join(tmp, f)).convert("RGB") for f in sorted(os.listdir(tmp))]


def save_gif(frames, path, fps, hold_last=1.0, colors=128):
    pal = frames[len(frames) // 2].quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
    q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
    durations = [round(1000 / fps)] * len(q)
    durations[-1] = int(hold_last * 1000)
    q[0].save(path, save_all=True, append_images=q[1:], duration=durations, loop=0, optimize=True, disposal=1)


# ---------------------------------------------------------------- demo gif (Fig. 2)
def demo():
    fps = 6
    frames = video_frames(0, 54, fps, speed=1.5)
    W, H = 420, 860
    out = []
    for f in frames:
        c = Image.new("RGBA", (W, H), BG + (255,))  # flat: GIF palette bands gradients
        ph = phone(f, 360)
        c.alpha_composite(ph, ((W - ph.width) // 2, (H - ph.height) // 2))
        out.append(c.convert("RGB"))
    save_gif(out, os.path.join(OUT, "demo.gif"), fps, hold_last=1.5)


# ---------------------------------------------------------------- clips (Fig. 4)
def clips():
    for name, (a, b) in {"home": (2, 11), "program": (11, 16.5), "library": (17, 27), "theme": (44, 54)}.items():
        frames = [f.resize((240, 533), Image.LANCZOS) for f in video_frames(a, b, 6)]
        save_gif(frames, os.path.join(OUT, f"clip-{name}.gif"), 6, hold_last=1.0, colors=96)


# ---------------------------------------------------------------- terminal (Fig. 3)
def terminal():
    def lines_of(name):
        with open(os.path.join(SRC, name), encoding="utf-8") as fh:
            return [l.rstrip() for l in fh if l.strip()]

    jest = [l for l in lines_of("checks-jest.txt") if l.split(":")[0] in ("Test Suites", "Tests", "Snapshots", "Ran all test suites.") or l.startswith("Ran all")]
    lint = [l for l in lines_of("checks-lint.txt") if not l.startswith("lint rc")]
    rows = [("cmd", "$ npx tsc --noEmit"), ("ok", "no type errors (exit 0)"),
            ("cmd", "$ npx expo lint")] + [("out", l) for l in lint] + [("ok", "no lint problems (exit 0)"),
            ("cmd", "$ npx jest")] + [("out", l) for l in jest] + [("ok", "all suites passed (exit 0)")]

    W = 1700
    lh, top = 44, 110
    H = top + lh * len(rows) + 50
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(c)
    d.rounded_rectangle((0, 0, W - 1, H - 1), 26, fill=(20, 17, 16))
    d.rounded_rectangle((0, 0, W - 1, 64), 26, fill=SURFACE)
    d.rectangle((0, 40, W - 1, 64), fill=SURFACE)
    for i, col in enumerate([(236, 95, 87), (229, 187, 72), (98, 196, 92)]):
        d.ellipse((28 + i * 34, 20, 50 + i * 34, 42), fill=col)
    d.text((W // 2, 32), "MVM · checks", font=BODY(26, 700), fill=TEXT_2, anchor="mm")
    for i, (kind, text) in enumerate(rows):
        y = top + i * lh
        if kind == "cmd":
            d.text((40, y), text, font=MONO_B(30), fill=ACCENT, anchor="lm")
        elif kind == "ok":
            check(d, 40, y - 12, 24, SUCCESS)
            d.text((80, y), text, font=MONO(30), fill=(150, 196, 122), anchor="lm")
        else:
            d.text((40, y), text, font=MONO(30), fill=TEXT_2, anchor="lm")
    c.save(os.path.join(OUT, "terminal.png"), optimize=True)


# ---------------------------------------------------------------- themes and dialogs (Fig. 5, 6)
THEMES = [("bordo", "Bordo & Bej"), ("gece", "Gece & Kiremit"), ("sarap", "Şarap"),
          ("erik", "Erik & Bal"), ("karpuz", "Karpuz"), ("domates", "Domates"),
          ("mandalina", "Mandalina"), ("deniz", "Deniz"), ("mocha", "Mocha")]


def grid(items, cols, phone_w, crop_h, path):
    gap, label = 36, 56
    cell_h = None
    tiles = []
    for name, title in items:
        shot = Image.open(os.path.join(SRC, f"{name}.png"))
        if crop_h:
            shot = shot.crop((0, 0, shot.width, crop_h))
        ph = phone(shot, phone_w)
        tiles.append((ph, title))
        cell_h = ph.height
    rows = (len(tiles) + cols - 1) // cols
    W = cols * phone_w + (cols + 1) * gap
    H = rows * (cell_h + label) + (rows + 1) * gap
    c = Image.new("RGBA", (W, H), BG + (255,))
    d = ImageDraw.Draw(c)
    for i, (ph, title) in enumerate(tiles):
        x = gap + (i % cols) * (phone_w + gap)
        y = gap + (i // cols) * (cell_h + label + gap)
        c.alpha_composite(ph, (x, y))
        d.text((x + phone_w // 2, y + cell_h + 30), title, font=BODY(30, 700), fill=TEXT, anchor="mm")
    c.convert("RGB").save(path, optimize=True)


def themes():
    grid([(f"theme-{k}", t) for k, t in THEMES], 3, 300, 860, os.path.join(OUT, "themes.png"))


def dialogs():
    grid([("confirm", "Confirm"), ("time", "Time picker"), ("number", "Number input"),
          ("picker-closed", "Theme picker"), ("picker-open", "Theme picker, open")], 5, 260, None,
         os.path.join(OUT, "dialogs.png"))


if __name__ == "__main__":
    hero()
    terminal()
    themes()
    dialogs()
    demo()
    clips()
    print("figures ->", OUT)

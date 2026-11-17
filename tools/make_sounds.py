# Ses efektlerini üretir (sentez, telifsiz) → assets/sounds/*.wav. Çalıştırma: python tools/make_sounds.py
import wave
from pathlib import Path

import numpy as np

SR = 22050
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'sounds'


def tone(freq, dur, vol=0.5, attack=0.004, decay=None, harmonics=(1, 0.3, 0.12)):
    t = np.arange(int(SR * dur)) / SR
    f = np.interp(t, [0, dur], freq) if isinstance(freq, tuple) else np.full_like(t, freq)
    phase = 2 * np.pi * np.cumsum(f) / SR
    w = sum(a * np.sin(phase * (i + 1)) for i, a in enumerate(harmonics))
    env = np.minimum(1, t / attack) * np.exp(-t / (decay or dur / 4))
    return vol * w * env


def seq(*parts, gap=0.0):
    out = np.zeros(0)
    for start, p in parts:
        n = int(start * SR)
        if len(out) < n + len(p):
            out = np.pad(out, (0, n + len(p) - len(out)))
        out[n:n + len(p)] += p
    return out


def save(name, x):
    x = x / max(1e-9, np.abs(x).max()) * 0.8
    tail = int(0.01 * SR)
    x[-tail:] *= np.linspace(1, 0, tail)
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


C5, E5, G5, C6, E6, G6 = 523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0
save('tap', tone(1800, 0.03, decay=0.006, harmonics=(1, 0.2)))
save('pop', tone((420, 980), 0.11, decay=0.035, harmonics=(1, 0.15)))
save('check', seq((0, tone(E5 * 2, 0.16, decay=0.05)), (0.07, tone(G5 * 2, 0.22, decay=0.08))))
save('complete', seq((0, tone(C5, 0.5, decay=0.15)), (0.09, tone(E5, 0.5, decay=0.15)), (0.18, tone(G5, 0.5, decay=0.15)),
                     (0.27, tone(C6, 0.7, decay=0.25))))
save('levelup', seq((0, tone(G5, 0.18, decay=0.06)), (0.1, tone(C6, 0.18, decay=0.06)), (0.2, tone(E6, 0.18, decay=0.06)),
                    (0.3, tone(G6, 0.7, decay=0.25)), (0.3, tone(C6, 0.7, decay=0.25, vol=0.3))))
print('ok')

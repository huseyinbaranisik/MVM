import { colors, contrast, customPalette, derive, hsl, mix, PALETTES } from '@/theme/colors';

describe('tema', () => {
  it('renk karışımı', () => {
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(mix('#C64F2D', '#C64F2D', 0.3)).toBe('#C64F2D');
  });

  it('15 tema; varsayılan Şarap; her palet geçerli ve okunur renkler üretir', () => {
    expect(Object.keys(PALETTES)).toHaveLength(15);
    expect(colors.primary).toBe(PALETTES.sarap.primary);
    for (const p of Object.values(PALETTES)) {
      const c = derive(p);
      const values = Object.entries(c).filter(([k]) => !['dark', 'overlay', 'neutral', 'muscleTones'].includes(k)).map(([, v]) => v);
      expect(values.every((v) => /^#[0-9A-F]{6}$/i.test(v as string))).toBe(true);
      expect(c.muscleTones).toHaveLength(7);
      expect(c.dark).toBe(!p.light);
      expect(contrast(c.textPrimary, c.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('özel tema', () => {
  it('HSL dönüşümü ve özel paletten geçerli renkler', () => {
    expect(hsl(0, 100, 50)).toBe('#FF0000');
    expect(hsl(120, 100, 25)).toBe('#008000');
    expect(customPalette({ bg: '#F7F4EE', primary: '#7A1F32', highlight: '#2E86C1' }).light).toBe(true);
    expect(customPalette({ bg: '#0E0C0B', primary: '#7A1F32', highlight: '#F7F4EE' }).light).toBe(false);
    const c = derive(customPalette({ bg: '#0E0C0B', primary: '#2E86C1', highlight: '#F2C14E' }));
    expect(/^#[0-9A-F]{6}$/i.test(c.textPrimary) && /^#[0-9A-F]{6}$/i.test(c.onPrimary)).toBe(true);
  });
});

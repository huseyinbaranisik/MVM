import { colors, derive, mix, PALETTES } from '@/theme/colors';

describe('tema', () => {
  it('renk karışımı', () => {
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(mix('#C64F2D', '#C64F2D', 0.3)).toBe('#C64F2D');
  });

  it('varsayılan tema bordo; her palet geçerli renkler üretir', () => {
    expect(colors.primary).toBe('#7A1F2B');
    for (const p of Object.values(PALETTES)) {
      const c = derive(p);
      const values = Object.entries(c).filter(([k]) => !['dark', 'overlay', 'neutral', 'muscleTones'].includes(k)).map(([, v]) => v);
      expect(values.every((v) => /^#[0-9A-F]{6}$/i.test(v as string))).toBe(true);
      expect(c.muscleTones).toHaveLength(7);
      expect(c.dark).toBe(!p.light);
      // açık temada düğme üstü yazı zemin rengi (krem), koyu temada vurgu rengi
      expect(c.onPrimary).toBe(p.light ? p.bg : p.highlight);
    }
  });
});

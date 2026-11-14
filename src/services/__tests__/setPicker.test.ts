import { KG_VALUES, nearest, REP_VALUES } from '../workout';

describe('kilo/tekrar seçici', () => {
  it('kilo 2,5–50 arası 2,5 adımlı, tekrar 5–20', () => {
    expect(KG_VALUES[0]).toBe(2.5);
    expect(KG_VALUES.at(-1)).toBe(50);
    expect(KG_VALUES).toHaveLength(20);
    expect(REP_VALUES).toEqual(Array.from({ length: 16 }, (_, i) => i + 5));
  });

  it('listede olmayan değer en yakın seçeneğe yuvarlanır', () => {
    expect(nearest(KG_VALUES, 12)).toBe(12.5);
    expect(nearest(KG_VALUES, 80)).toBe(50);
    expect(nearest(KG_VALUES, 0)).toBe(2.5);
    expect(nearest(REP_VALUES, 3)).toBe(5);
  });
});

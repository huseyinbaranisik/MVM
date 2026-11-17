import { DEFAULT_LAYOUT, sanitize, toRows } from '../homeLayout';

describe('ana ekran düzeni', () => {
  it('ayıklama', () => {
    expect(sanitize(null)).toBe(DEFAULT_LAYOUT);
    expect(sanitize([])).toBe(DEFAULT_LAYOUT);
    expect(sanitize([{ id: 'x', size: 'small' }, { id: 'water', size: 'small' }, { id: 'water', size: 'large' }, { id: 'workout', size: 'small' }]))
      .toEqual([{ id: 'water', size: 'small' }, { id: 'workout', size: 'large' }]);
  });

  it('satırlar: iki küçük yan yana, tek küçük yalnız', () => {
    expect(toRows(DEFAULT_LAYOUT).map((r) => r.map((x) => x.id))).toEqual([['workout'], ['water', 'steps'], ['calories'], ['sleep'], ['checklist']]);
    const rows = toRows([{ id: 'water', size: 'small' }, { id: 'steps', size: 'small' }, { id: 'sleep', size: 'small' }, { id: 'workout', size: 'large' }]);
    expect(rows.map((r) => r.length)).toEqual([2, 1, 1]);
  });
});

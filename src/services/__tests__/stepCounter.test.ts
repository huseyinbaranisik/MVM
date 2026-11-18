import { counterDelta } from '../stepCounter';

// jest.mock çağrıları içe aktarmadan önce çalışacak şekilde yukarı taşınır
jest.mock('expo-sensors', () => ({ Pedometer: {} }));
jest.mock('@/db/repos/trackers', () => ({ addTrackerValue: jest.fn() }));
jest.mock('@/db/bus', () => ({ notify: jest.fn() }));
jest.mock('../../../modules/mvm-steps', () => ({ readStepCounter: jest.fn() }));


describe('counterDelta', () => {
  const boot = 1_700_000_000_000;
  it('ilk okumada yalnızca başlangıç alınır', () => {
    expect(counterDelta(null, { steps: 5000, bootTime: boot })).toBe(0);
  });
  it('aynı açılışta aradaki fark (kapalıyken atılanlar dahil)', () => {
    expect(counterDelta({ steps: 5000, bootTime: boot }, { steps: 7300, bootTime: boot + 2000 })).toBe(2300);
  });
  it('telefon yeniden başlatıldıysa açılıştan beri sayılanlar', () => {
    expect(counterDelta({ steps: 9000, bootTime: boot }, { steps: 1200, bootTime: boot + 86_400_000 })).toBe(1200);
  });
  it('sayaç geri gittiyse (aynı açılış görünse de) açılıştan beri sayılanlar; bozuk değer eklenmez', () => {
    expect(counterDelta({ steps: 9000, bootTime: boot }, { steps: 300, bootTime: boot })).toBe(300);
    expect(counterDelta({ steps: 0, bootTime: boot }, { steps: 500_000, bootTime: boot })).toBe(0);
  });
});

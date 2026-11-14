import { averageBedtime, formatDuration, sleepDuration } from '../sleep';
import { bmi, bmiLabel, formatSteps, formatWater, kmToSteps, parseNumber, stepsToKm, strideCm, waterFromDisplay } from '../units';

describe('uyku', () => {
  it('gece yarısını geçen uyku', () => {
    expect(sleepDuration('23:40', '07:00')).toBe(440);
    expect(sleepDuration('00:30', '08:00')).toBe(450);
    expect(sleepDuration('13:00', '14:30')).toBe(90);
  });

  it('süre gösterimi', () => {
    expect(formatDuration(440)).toBe('7s 20dk');
    expect(formatDuration(480)).toBe('8s');
    expect(formatDuration(440, 'decimal')).toBe('7,3 s');
  });

  it('ortalama yatış saati gece yarısı etrafında', () => {
    expect(averageBedtime(['23:30', '00:30'])).toBe('00:00');
    expect(averageBedtime(['22:00', '23:00'])).toBe('22:30');
    expect(averageBedtime([])).toBeNull();
  });
});

describe('birimler', () => {
  it('su ml saklanır, gösterim değişir', () => {
    expect(formatWater(1000, 'glass', 250)).toBe('4');
    expect(formatWater(1250, 'liter', 250)).toBe('1,25');
    expect(waterFromDisplay(2.5, 'liter', 250)).toBe(2500);
  });

  it('adım uzunluğu boydan hesaplanır, elle girilen önceliklidir', () => {
    expect(strideCm(null, 180)).toBe(75);
    expect(strideCm(80, 180)).toBe(80);
    expect(stepsToKm(10_000, 75)).toBe(7.5);
    expect(kmToSteps(7.5, 75)).toBe(10_000);
    expect(formatSteps(6240, 'steps', 75)).toBe('6.240');
  });

  it('sayı girişi virgül veya nokta kabul eder', () => {
    expect(parseNumber('2,5')).toBe(2.5);
    expect(parseNumber(' 10 ')).toBe(10);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
  });
});

describe('BMI', () => {
  it('kg/m² hesaplar ve DSÖ sınıfını verir', () => {
    expect(bmi(80, 180)).toBeCloseTo(24.69, 2);
    expect([17, 18.5, 24.9, 25, 30].map(bmiLabel)).toEqual(['Zayıf', 'Normal', 'Normal', 'Fazla kilolu', 'Obez']);
  });
});

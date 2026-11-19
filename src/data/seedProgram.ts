// İlk kurulumda eklenen örnek alışkanlıklar (program ve gün atamaları boş başlar). Kurulum anındaki dilde yazılır.
import { t } from '@/i18n';

export const seedHabits = [
  { name: t('Tatlı yeme'), icon: 'no_food' },
  { name: t('Protein hedefi'), icon: 'egg' },
  { name: t('Esneme'), icon: 'self_improvement' },
  { name: t('Yürüyüş'), icon: 'directions_walk' },
];

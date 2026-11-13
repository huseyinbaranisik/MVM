// Varsayılan haftalık program. weekday: 0 = Pazartesi … 6 = Pazar.

export interface SeedTemplateExercise {
  exerciseId: string;
  sets: number;
  repMin?: number;
  repMax?: number;
  durationSec?: number;
  perSide?: boolean;
  superset?: number;
}

export interface SeedTemplate {
  name: string;
  weekday: number;
  exercises: SeedTemplateExercise[];
}

const r = (exerciseId: string, sets: number, repMin: number, repMax = repMin, extra: Partial<SeedTemplateExercise> = {}) =>
  ({ exerciseId, sets, repMin, repMax, ...extra });
const t = (exerciseId: string, sets: number, durationSec: number, perSide = false) =>
  ({ exerciseId, sets, durationSec, perSide });

export const seedTemplates: SeedTemplate[] = [
  {
    name: 'Üst Vücut A', weekday: 0, exercises: [
      r('Dumbbell_Bench_Press', 4, 6, 8),
      r('One-Arm_Dumbbell_Row', 4, 8, 10),
      r('Standing_Dumbbell_Press', 3, 8, 10),
      r('Straight-Arm_Dumbbell_Pullover', 3, 10, 12),
      r('Hammer_Curls', 3, 10, 12),
      r('Standing_Dumbbell_Triceps_Extension', 3, 10, 12),
    ],
  },
  {
    name: 'Alt Vücut A + Karın', weekday: 1, exercises: [
      r('Goblet_Squat', 4, 8, 10),
      r('Dumbbell_Romanian_Deadlift', 4, 8, 10),
      r('Dumbbell_Bulgarian_Split_Squat', 3, 10, 10, { perSide: true }),
      r('Standing_Dumbbell_Calf_Raise', 3, 15),
      r('Flat_Bench_Lying_Leg_Raise', 3, 12, 15),
      t('Plank', 3, 45),
    ],
  },
  {
    name: 'Üst Vücut B', weekday: 5, exercises: [
      r('Incline_Dumbbell_Press', 4, 10, 12),
      r('Bent_Over_Two-Dumbbell_Row', 4, 10, 12),
      r('Side_Lateral_Raise', 4, 12, 15),
      r('Reverse_Flyes', 3, 12, 15),
      r('Dumbbell_Shrug', 3, 12, 15),
      r('Dumbbell_Bicep_Curl', 3, 12, 12, { superset: 1 }),
      r('Tricep_Dumbbell_Kickback', 3, 12, 12, { superset: 1 }),
    ],
  },
  {
    name: 'Alt Vücut B + Karın', weekday: 6, exercises: [
      r('Dumbbell_Deadlift', 4, 6, 8),
      r('Dumbbell_Walking_Lunge', 3, 12, 12, { perSide: true }),
      r('Dumbbell_Step_Ups', 3, 10, 10, { perSide: true }),
      r('Russian_Twist', 3, 20),
      r('Dumbbell_Crunch', 3, 15),
      t('Side_Plank', 3, 30, true),
    ],
  },
];

/** Antrenman atanmayan günler */
export const walkDays = [2, 3, 4];

export const seedHabits = [
  { name: 'Tatlı yeme', icon: 'no_food' },
  { name: 'Protein hedefi', icon: 'egg' },
  { name: 'Esneme', icon: 'self_improvement' },
  { name: 'Yürüyüş', icon: 'directions_walk' },
];

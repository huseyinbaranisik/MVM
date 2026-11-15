import { router } from 'expo-router';
import { useState } from 'react';

import { toast } from '@/components/ui/overlays';
import { Sheet, SheetRow } from '@/components/ui/Sheet';
import { getDayPlan } from '@/db/repos/schedule';
import { startSession } from '@/db/repos/sessions';
import { addTrackerValue, getTrackerSettings } from '@/db/repos/trackers';
import { useDb } from '@/db/useDb';
import { today, weekday } from '@/services/dates';

/** Ortadaki "+": en sık yapılan işlere tek dokunuşla ulaşmak için. */
export default function QuickAdd() {
  const [open, setOpen] = useState(true);
  const data = useDb(async () => ({
    plan: await getDayPlan(weekday(today())),
    glass: (await getTrackerSettings('water'))?.unit_size ?? 250,
  }), [], ['day_schedule', 'workout_templates', 'template_exercises', 'tracker_settings']);
  const templateId = data?.plan?.kind === 'workout' ? data.plan.templateId : null;
  const glass = data?.glass ?? 250;

  // önce kapanış animasyonu, sonra rota kapanır
  const close = (then?: () => void) => {
    setOpen(false);
    setTimeout(() => { router.back(); then?.(); }, 210);
  };

  return (
    <Sheet visible={open} onClose={() => close()} title="Hızlı ekle">
      {templateId ? (
        <SheetRow label={`Antrenmana başla · ${data?.plan?.templateName ?? ''}`} onPress={async () => {
          const id = await startSession(templateId, today());
          close(() => router.push(`/workout/${id}`));
        }} />
      ) : null}
      <SheetRow label="1 bardak su ekle" value={`${glass} ml`} onPress={async () => {
        await addTrackerValue('water', today(), glass);
        close(() => toast('Su eklendi 💧'));
      }} />
      <SheetRow label="Kendi hareketini ekle" onPress={() => close(() => router.push('/exercise/new'))} />
    </Sheet>
  );
}

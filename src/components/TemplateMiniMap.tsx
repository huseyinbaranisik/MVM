import { BodyMapPair } from '@/components/BodyMap';
import { getTemplateMuscles } from '@/db/repos/templates';
import { useDb } from '@/db/useDb';

/** Antrenmanın çalıştırdığı kasları gösteren minik ön/arka harita ("Bacak günü bacak mı" bir bakışta). */
export function TemplateMiniMap({ templateId, width = 26 }: { templateId: number; width?: number }) {
  const m = useDb((db) => getTemplateMuscles(db, templateId), [templateId]);
  if (!m) return null;
  return <BodyMapPair width={width} primary={m.primary} secondary={m.secondary} />;
}

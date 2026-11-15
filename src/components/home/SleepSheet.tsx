import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { pickTime } from '@/components/ui/overlays';
import { PillButton } from '@/components/ui/PillButton';
import { Sheet } from '@/components/ui/Sheet';
import { saveSleep, type SleepLog } from '@/db/repos/sleep';
import { formatDuration, QUALITY_EMOJI, sleepDuration } from '@/services/sleep';
import { colors, radius, spacing, type } from '@/theme';

/** Uyku girişi. date = uyanılan gün. */
export function SleepSheet({ visible, date, log, title = 'Uyku', onClose, onNeverAsk }: {
  visible: boolean;
  date: string;
  log: SleepLog | null;
  title?: string;
  onClose: () => void;
  /** verilirse "Bir daha sorma" bağlantısı görünür (sabah sorusu) */
  onNeverAsk?: () => void;
}) {
  const [bed, setBed] = useState('23:30');
  const [wake, setWake] = useState('07:00');
  const [quality, setQuality] = useState<number | null>(null);
  const [prevVisible, setPrevVisible] = useState(false);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setBed(log?.bedtime ?? '23:30');
      setWake(log?.wake_time ?? '07:00');
      setQuality(log?.quality ?? null);
    }
  }

  const timeField = (label: string, value: string, set: (v: string) => void) => (
    <Pressable style={styles.time} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`}
      onPress={async () => { const t = await pickTime(value); if (t) set(t); }}>
      <Text style={type.caption}>{label}</Text>
      <Text style={styles.timeValue}>{value}</Text>
    </Pressable>
  );

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.row}>
        {timeField('Yatış', bed, setBed)}
        {timeField('Kalkış', wake, setWake)}
      </View>
      <Text style={[type.subtitle, styles.center]}>Süre: {formatDuration(sleepDuration(bed, wake))}</Text>
      <Text style={type.caption}>Uyku kalitesi</Text>
      <View style={styles.row}>
        {QUALITY_EMOJI.map((e, i) => (
          <Pressable key={e} onPress={() => setQuality(i + 1)}
            style={[styles.emoji, quality === i + 1 && styles.emojiOn]}
            accessibilityRole="button" accessibilityState={{ selected: quality === i + 1 }} accessibilityLabel={`Kalite ${i + 1} / 5`}>
            <Text style={styles.emojiText}>{e}</Text>
          </Pressable>
        ))}
      </View>
      <PillButton label="Kaydet" variant="primary"
        onPress={async () => { await saveSleep(date, bed, wake, quality); onClose(); }} />
      {onNeverAsk ? (
        <Pressable onPress={onNeverAsk} style={styles.never} accessibilityRole="button">
          <Text style={type.caption}>Sabahları bir daha sorma</Text>
        </Pressable>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  center: { textAlign: 'center' },
  time: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', gap: spacing.xs },
  timeValue: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  emoji: {
    flex: 1, aspectRatio: 1, maxHeight: 60, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider,
  },
  emojiOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  emojiText: { fontSize: 26 },
  never: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
});

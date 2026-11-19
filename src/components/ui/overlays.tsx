import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { PillButton } from '@/components/ui/PillButton';
import { Sheet } from '@/components/ui/Sheet';
import { Wheel } from '@/components/ui/Wheel';
import { parseHM, toHM } from '@/services/sleep';
import { colors, radius, spacing, type } from '@/theme';
import { t } from '@/i18n';

// Uygulamanın kendi pencereleri: Android'in Alert/saat seçicisi yerine, temaya uygun ve her yerden çağrılabilir.
interface ConfirmOptions { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean }

interface OverlayState {
  dialog: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null;
  toast: { id: number; message: string } | null;
  time: { initial: string; resolve: (t: string | null) => void } | null;
}

const useOverlay = create<OverlayState>(() => ({ dialog: null, toast: null, time: null }));

/** Onay penceresi; kullanıcı onaylarsa true. */
export function confirm(opts: ConfirmOptions) {
  return new Promise<boolean>((resolve) => useOverlay.setState({ dialog: { ...opts, resolve } }));
}

/** Ekranın üstünde kısa süre görünen bilgi mesajı. */
export function toast(message: string) {
  useOverlay.setState({ toast: { id: Date.now(), message } });
}

/** 24 saatlik tekerlek saat seçici; 'HH:MM' veya iptalde null. */
export function pickTime(initial: string) {
  return new Promise<string | null>((resolve) => useOverlay.setState({ time: { initial, resolve } }));
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const pad = (n: number) => String(n).padStart(2, '0');

/** Kök layout'ta bir kez render edilir. */
export function OverlayHost() {
  const { dialog, toast: current, time } = useOverlay();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => useOverlay.setState({ toast: null }), 2400);
    return () => clearTimeout(timer);
  }, [current]);

  const answer = (ok: boolean) => { dialog?.resolve(ok); useOverlay.setState({ dialog: null }); };

  return (
    <>
      <Modal visible={!!dialog} transparent animationType="none" onRequestClose={() => answer(false)} statusBarTranslucent>
        {dialog ? (
          <Animated.View entering={FadeIn.duration(160)} style={styles.dialogBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => answer(false)} accessibilityLabel={t('Vazgeç')} />
            <Animated.View entering={FadeIn.duration(140)} style={styles.dialog} accessibilityRole="alert">
              <Text style={type.title}>{dialog.title}</Text>
              {dialog.message ? <Text style={[type.body, styles.message]}>{dialog.message}</Text> : null}
              <View style={styles.actions}>
                <PillButton label={dialog.cancelLabel ?? t('Vazgeç')} onPress={() => answer(false)} style={styles.action} />
                <PillButton label={dialog.confirmLabel ?? t('Tamam')} variant="primary" onPress={() => answer(true)}
                  style={[styles.action, dialog.destructive && styles.danger]} />
              </View>
            </Animated.View>
          </Animated.View>
        ) : null}
      </Modal>

      {time ? <TimeSheet key={time.initial} initial={time.initial} onDone={(v) => { time.resolve(v); useOverlay.setState({ time: null }); }} /> : null}

      {current ? (
        <Animated.View key={current.id} entering={FadeInUp.duration(260)} exiting={FadeOutUp.duration(200)}
          style={[styles.toast, { top: insets.top + spacing.sm }]} pointerEvents="none" accessibilityLiveRegion="polite">
          <Text style={styles.toastText}>{current.message}</Text>
        </Animated.View>
      ) : null}
    </>
  );
}

function TimeSheet({ initial, onDone }: { initial: string; onDone: (v: string | null) => void }) {
  const m = parseHM(initial);
  const [h, setH] = useState(Math.floor(m / 60));
  const [min, setMin] = useState(m % 60);
  const [open, setOpen] = useState(true);
  // kapanış animasyonu bitsin, sonra sonucu bildir
  const close = (v: string | null) => { setOpen(false); setTimeout(() => onDone(v), 210); };
  return (
    <Sheet visible={open} onClose={() => close(null)} title={t('Saat seç')}>
      <View style={styles.wheels}>
        <Wheel values={HOURS} value={h} onChange={setH} format={pad} label={t('Saat')} />
        <Text style={styles.colon}>:</Text>
        <Wheel values={MINUTES} value={min} onChange={setMin} format={pad} label={t('Dakika')} />
      </View>
      <PillButton label={t('Tamam')} variant="primary" onPress={() => close(toHM(h * 60 + min))} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  dialogBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl },
  dialog: { backgroundColor: colors.surfaceElevated, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  message: { color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  action: { flex: 1 },
  danger: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
  wheels: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  colon: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  toast: {
    position: 'absolute', alignSelf: 'center', maxWidth: '90%', paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.pill, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.accentMuted,
  },
  toastText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
});

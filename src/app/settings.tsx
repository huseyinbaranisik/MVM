import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BackHeader } from '@/components/exercise';
import { Icon } from '@/components/Icon';
import { NumberPrompt } from '@/components/ui/NumberPrompt';
import { confirm, toast } from '@/components/ui/overlays';
import { PressableScale } from '@/components/ui/PressableScale';
import { SheetRow } from '@/components/ui/Sheet';
import { deleteMyAccount, exportMyData } from '@/db/repos/privacy';
import { getSetting, setSetting } from '@/db/repos/settings';
import { supabase } from '@/db/supabase';
import { useDb } from '@/db/useDb';
import { play, setSoundsEnabled, soundsEnabled } from '@/services/sounds';
import { colors, radius, spacing, type } from '@/theme';
import { CustomThemeSheet } from '@/components/CustomThemeSheet';
import { loadCustomColors, PALETTES, themeId, type ThemeId } from '@/theme/colors';
import { setTheme } from '@/theme/select';

const THEMES = (Object.entries(PALETTES) as [ThemeId, (typeof PALETTES)[ThemeId]][])
  .map(([id, p]) => ({ id, name: p.name, swatch: [p.bg, p.primary, p.highlight] }));

export default function SettingsScreen() {
  const data = useDb(async () => ({
    rest: await getSetting('restSec'),
    morning: await getSetting('morningSleepPrompt'),
    email: (await supabase.auth.getSession()).data.session?.user.email ?? '',
  }), [], ['settings']);
  const [themesOpen, setThemesOpen] = useState(false);
  const [prompt, setPrompt] = useState<'heavy' | 'normal' | null>(null);
  const [sounds, setSounds] = useState(soundsEnabled);
  const [customOpen, setCustomOpen] = useState(false);
  const custom = loadCustomColors();
  const current = themeId === 'custom' && custom
    ? { id: 'custom', name: 'Özel', swatch: [custom.bg, custom.primary, custom.highlight] }
    : THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const rest = data?.rest ?? { heavy: 120, normal: 75 };

  const signOut = async () => {
    if (await confirm({ title: 'Çıkış yapılsın mı?', confirmLabel: 'Çıkış yap' })) await supabase.auth.signOut();
  };

  const exportData = async () => {
    try { await exportMyData(); } catch { toast('Veriler dışa aktarılamadı'); }
  };
  const removeAccount = async () => {
    const ok = await confirm({
      title: 'Hesap silinsin mi?', message: 'Tüm antrenman, takip ve profil verilerin kalıcı olarak silinir. Bu geri alınamaz.',
      confirmLabel: 'Kalıcı olarak sil', destructive: true,
    });
    if (!ok) return;
    try { await deleteMyAccount(); } catch { toast('Hesap silinemedi'); }
  };

  return (
    <View style={styles.safe}>
      <BackHeader title="Ayarlar" />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.section}>Görünüm</Text>
        <View style={styles.card}>
          <PressableScale style={styles.themeRow} onPress={() => setThemesOpen(!themesOpen)} accessibilityRole="button"
            accessibilityState={{ expanded: themesOpen }} accessibilityLabel={`Tema: ${current.name}`}>
            <Text style={[type.body, styles.flex]}>Tema</Text>
            <Swatches colors={current.swatch} />
            <Text style={type.caption}>{current.name}</Text>
            <Icon name={themesOpen ? 'expand_less' : 'expand_more'} color={colors.textSecondary} />
          </PressableScale>
          {themesOpen ? (
            <PressableScale style={styles.themeRow} onPress={() => setCustomOpen(true)} accessibilityRole="button" accessibilityLabel="Özel tema">
              {custom ? <Swatches colors={[custom.bg, custom.primary, custom.highlight]} /> : (
                <View style={[styles.swatches, styles.customIcon]}><Icon name="palette" size={22} color={colors.textPrimary} /></View>
              )}
              <Text style={[type.body, styles.flex]}>Özel</Text>
              <Icon name="chevron_right" color={colors.textSecondary} />
            </PressableScale>
          ) : null}
          {themesOpen ? THEMES.filter((t) => t.id !== themeId).map((t) => (
            <PressableScale key={t.id} style={styles.themeRow} onPress={() => setTheme(t.id)} accessibilityRole="button" accessibilityLabel={t.name}>
              <Swatches colors={t.swatch} />
              <Text style={[type.body, styles.flex]}>{t.name}</Text>
            </PressableScale>
          )) : null}
        </View>

        <Text style={styles.section}>Antrenman</Text>
        <View style={styles.card}>
          <SheetRow label="Dinlenme (ağır set)" value={`${rest.heavy} sn`} onPress={() => setPrompt('heavy')} />
          <SheetRow label="Dinlenme (normal set)" value={`${rest.normal} sn`} onPress={() => setPrompt('normal')} />
        </View>

        <Text style={styles.section}>Ses</Text>
        <View style={styles.card}>
          <SheetRow label="Ses efektleri" value={sounds ? 'Açık' : 'Kapalı'}
            onPress={() => { setSoundsEnabled(!sounds); setSounds(!sounds); if (!sounds) play('check'); }} />
        </View>

        <Text style={styles.section}>Uyku</Text>
        <View style={styles.card}>
          <SheetRow label="Sabah uyku sorusu" value={data?.morning ? 'Açık' : 'Kapalı'}
            onPress={() => setSetting('morningSleepPrompt', !data?.morning)} />
        </View>

        <Text style={styles.section}>Gizlilik</Text>
        <View style={styles.card}>
          <SheetRow label="Verilerimi dışa aktar" value="JSON" onPress={exportData} />
          <SheetRow label="Hesabı sil" onPress={removeAccount} />
        </View>

        <Text style={styles.section}>Hesap</Text>
        <View style={styles.card}>
          <SheetRow label="Çıkış yap" value={data?.email} onPress={signOut} />
        </View>
      </ScrollView>
      <CustomThemeSheet visible={customOpen} onClose={() => setCustomOpen(false)} />

      <NumberPrompt visible={prompt != null} onClose={() => setPrompt(null)} suffix="sn" min={10} quick={[60, 90, 120, 180]}
        title={prompt === 'heavy' ? 'Dinlenme (ağır set)' : 'Dinlenme (normal set)'} initial={prompt ? rest[prompt] : undefined}
        onSubmit={(v) => { if (prompt) setSetting('restSec', { ...rest, [prompt]: Math.round(v) }); }} />
    </View>
  );
}

/** Tema renkleri yarı saydam gri zeminde: açık renkler açık temada da seçilebilsin */
function Swatches({ colors: list }: { colors: string[] }) {
  return (
    <View style={styles.swatches}>
      {list.map((c) => <View key={c} style={[styles.swatch, { backgroundColor: c }]} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: spacing.xxl },
  section: { ...type.caption, marginTop: spacing.md, marginLeft: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.xs },
  flex: { flex: 1 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52 },
  swatches: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius.pill, backgroundColor: colors.neutral },
  swatch: { width: 22, height: 22, borderRadius: 11 },
  customIcon: { width: 82, alignItems: 'center' },
});

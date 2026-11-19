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
import { setLanguage, setTheme } from '@/theme/select';
import { isEn, t } from '@/i18n';

const THEMES = (Object.entries(PALETTES) as [ThemeId, (typeof PALETTES)[ThemeId]][])
  .map(([id, p]) => ({ id, name: t(p.name), swatch: [p.bg, p.primary, p.highlight] }));

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
    ? { id: 'custom', name: t('Özel'), swatch: [custom.bg, custom.primary, custom.highlight] }
    : THEMES.find((th) => th.id === themeId) ?? THEMES[0];
  const rest = data?.rest ?? { heavy: 120, normal: 75 };
  const changeLanguage = async () => {
    const next = isEn ? 'tr' : 'en';
    const ok = await confirm({
      title: next === 'en' ? 'Switch to English?' : 'Türkçeye geçilsin mi?',
      message: next === 'en' ? 'The app will restart.' : 'Uygulama yeniden başlayacak.',
      confirmLabel: next === 'en' ? 'Switch' : 'Geç',
    });
    if (ok) await setLanguage(next);
  };

  const signOut = async () => {
    if (await confirm({ title: t('Çıkış yapılsın mı?'), confirmLabel: t('Çıkış yap') })) await supabase.auth.signOut();
  };

  const exportData = async () => {
    try { await exportMyData(); } catch { toast(t('Veriler dışa aktarılamadı')); }
  };
  const removeAccount = async () => {
    const ok = await confirm({
      title: t('Hesap silinsin mi?'), message: t('Tüm antrenman, takip ve profil verilerin kalıcı olarak silinir. Bu geri alınamaz.'),
      confirmLabel: t('Kalıcı olarak sil'), destructive: true,
    });
    if (!ok) return;
    try { await deleteMyAccount(); } catch { toast(t('Hesap silinemedi')); }
  };

  return (
    <View style={styles.safe}>
      <BackHeader title={t('Ayarlar')} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.section}>{t('Görünüm')}</Text>
        <View style={styles.card}>
          {/* iki dilde de bulunabilsin diye etiket iki dilde */}
          <SheetRow label="Dil · Language" value={isEn ? 'English' : 'Türkçe'} onPress={changeLanguage} />
          <PressableScale style={styles.themeRow} onPress={() => setThemesOpen(!themesOpen)} accessibilityRole="button"
            accessibilityState={{ expanded: themesOpen }} accessibilityLabel={t('Tema: {name}', { name: current.name })}>
            <Text style={[type.body, styles.flex]}>{t('Tema')}</Text>
            <Swatches colors={current.swatch} />
            <Text style={type.caption}>{current.name}</Text>
            <Icon name={themesOpen ? 'expand_less' : 'expand_more'} color={colors.textSecondary} />
          </PressableScale>
          {themesOpen ? (
            <PressableScale style={styles.themeRow} onPress={() => setCustomOpen(true)} accessibilityRole="button" accessibilityLabel={t('Özel tema')}>
              {custom ? <Swatches colors={[custom.bg, custom.primary, custom.highlight]} /> : (
                <View style={[styles.swatches, styles.customIcon]}><Icon name="palette" size={22} color={colors.textPrimary} /></View>
              )}
              <Text style={[type.body, styles.flex]}>{t('Özel')}</Text>
              <Icon name="chevron_right" color={colors.textSecondary} />
            </PressableScale>
          ) : null}
          {themesOpen ? THEMES.filter((th) => th.id !== themeId).map((th) => (
            <PressableScale key={th.id} style={styles.themeRow} onPress={() => setTheme(th.id)} accessibilityRole="button" accessibilityLabel={th.name}>
              <Swatches colors={th.swatch} />
              <Text style={[type.body, styles.flex]}>{th.name}</Text>
            </PressableScale>
          )) : null}
        </View>

        <Text style={styles.section}>{t('Antrenman')}</Text>
        <View style={styles.card}>
          <SheetRow label={t('Dinlenme (ağır set)')} value={`${rest.heavy} ${t('sn')}`} onPress={() => setPrompt('heavy')} />
          <SheetRow label={t('Dinlenme (normal set)')} value={`${rest.normal} ${t('sn')}`} onPress={() => setPrompt('normal')} />
        </View>

        <Text style={styles.section}>{t('Ses')}</Text>
        <View style={styles.card}>
          <SheetRow label={t('Ses efektleri')} value={sounds ? t('Açık') : t('Kapalı')}
            onPress={() => { setSoundsEnabled(!sounds); setSounds(!sounds); if (!sounds) play('check'); }} />
        </View>

        <Text style={styles.section}>{t('Uyku')}</Text>
        <View style={styles.card}>
          <SheetRow label={t('Sabah uyku sorusu')} value={data?.morning ? t('Açık') : t('Kapalı')}
            onPress={() => setSetting('morningSleepPrompt', !data?.morning)} />
        </View>

        <Text style={styles.section}>{t('Gizlilik')}</Text>
        <View style={styles.card}>
          <SheetRow label={t('Verilerimi dışa aktar')} value="JSON" onPress={exportData} />
          <SheetRow label={t('Hesabı sil')} onPress={removeAccount} />
        </View>

        <Text style={styles.section}>{t('Hesap')}</Text>
        <View style={styles.card}>
          <SheetRow label={t('Çıkış yap')} value={data?.email} onPress={signOut} />
        </View>
      </ScrollView>
      <CustomThemeSheet visible={customOpen} onClose={() => setCustomOpen(false)} />

      <NumberPrompt visible={prompt != null} onClose={() => setPrompt(null)} suffix="sn" min={10} quick={[60, 90, 120, 180]}
        title={prompt === 'heavy' ? t('Dinlenme (ağır set)') : t('Dinlenme (normal set)')} initial={prompt ? rest[prompt] : undefined}
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

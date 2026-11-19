import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { avatarUrl } from '@/db/repos/avatar';
import { getSetting } from '@/db/repos/settings';
import { useDb } from '@/db/useDb';
import { colors, radius } from '@/theme';
import { locale, t } from '@/i18n';

/** Yuvarlak avatar: profil fotoğrafı, yoksa baş harf; `level` verilirse sağ altta seviye rozeti. */
export function Avatar({ size, level }: { size: number; level?: number }) {
  const data = useDb(async () => {
    const p = await getSetting('profile');
    return { name: p.name, url: await avatarUrl(p.avatarPath), key: `${p.avatarPath}-${p.avatarUpdatedAt}` };
  }, [], ['settings']);
  const name = data?.name ?? '';
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
        {data?.url ? (
          <Image source={{ uri: data.url, cacheKey: data.key }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150}
            accessibilityLabel={t('Profil fotoğrafı')} />
        ) : (
          <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{name.charAt(0).toLocaleUpperCase(locale) || '?'}</Text>
        )}
      </View>
      {level != null ? (
        <View style={styles.badge} accessibilityLabel={t('Seviye {n}', { n: level })}>
          <Text style={styles.badgeText}>{level}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.accentMuted,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  initial: { fontWeight: '800', color: colors.accent },
  badge: {
    position: 'absolute', right: -4, bottom: -4, minWidth: 22, height: 22, paddingHorizontal: 4,
    borderRadius: radius.pill, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: colors.onPrimary },
});

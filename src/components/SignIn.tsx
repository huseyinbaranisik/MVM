import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { toast } from '@/components/ui/overlays';
import { PillButton, SegmentedControl } from '@/components/ui/PillButton';
import { supabase } from '@/db/supabase';
import { authError, isEmail, passwordStrength, STRENGTH_LABELS } from '@/services/auth';
import { colors, radius, spacing, type } from '@/theme';

type Mode = 'in' | 'up';
type IconName = Parameters<typeof Icon>[0]['name'];

export function SignIn() {
  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false); // hatalar ilk denemeden sonra görünür
  const [message, setMessage] = useState<{ text: string; ok?: boolean } | null>(null);

  const strength = passwordStrength(password);
  const errors = {
    email: !email.trim() ? 'E-posta gerekli.' : !isEmail(email) ? 'Geçerli bir e-posta gir.' : null,
    password: password.length < 6 ? 'En az 6 karakter.' : null,
    repeat: mode === 'up' && repeat !== password ? 'Şifreler aynı değil.' : null,
  };
  const valid = !errors.email && !errors.password && !errors.repeat;

  const switchMode = (m: Mode) => { setMode(m); setMessage(null); setTouched(false); setRepeat(''); };

  const submit = async () => {
    setTouched(true);
    if (busy || !valid) return;
    setBusy(true);
    setMessage(null);
    const creds = { email: email.trim(), password };
    try {
      const { data, error } = mode === 'in' ? await supabase.auth.signInWithPassword(creds) : await supabase.auth.signUp(creds);
      if (error) setMessage({ text: authError(error.message) });
      else if (mode === 'up' && !data.session) setMessage({ text: 'Onay e-postası gönderildi.', ok: true });
    } catch {
      setMessage({ text: 'Sunucuya ulaşılamadı.' });
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!isEmail(email)) { setTouched(true); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setBusy(false);
    if (error) setMessage({ text: authError(error.message) });
    else toast('Şifre sıfırlama e-postası gönderildi.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}><Icon name="fitness_center" size={40} color={colors.onPrimary} /></View>
            <Text style={type.hero}>MVM</Text>
          </View>

          <View style={styles.row}>
            <SegmentedControl<Mode> options={[{ value: 'in', label: 'Giriş yap' }, { value: 'up', label: 'Kayıt ol' }]} value={mode} onChange={switchMode} />
          </View>

          <Field icon="mail" label="E-posta" value={email} onChangeText={setEmail} error={touched ? errors.email : null}
            keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" returnKeyType="next" />
          <Field icon="lock" label="Şifre" value={password} onChangeText={setPassword} error={touched ? errors.password : null} secret
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'} textContentType={mode === 'in' ? 'password' : 'newPassword'}
            returnKeyType={mode === 'in' ? 'go' : 'next'} onSubmitEditing={mode === 'in' ? submit : undefined} />

          {mode === 'up' ? (
            <>
              <View style={styles.strength} accessibilityLabel={`Şifre gücü: ${STRENGTH_LABELS[strength]}`}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={[styles.bar, { backgroundColor: strength >= i ? STRENGTH_COLORS[strength] : colors.divider }]} />
                ))}
                <Text style={[type.caption, styles.strengthLabel]}>{password ? STRENGTH_LABELS[strength] : ''}</Text>
              </View>
              <Field icon="lock_reset" label="Şifre tekrar" value={repeat} onChangeText={setRepeat} error={touched ? errors.repeat : null} secret
                autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={submit} />
            </>
          ) : (
            <Pressable onPress={forgot} disabled={busy} hitSlop={8} style={styles.forgot} accessibilityRole="button">
              <Text style={styles.link}>Şifremi unuttum</Text>
            </Pressable>
          )}

          {message ? (
            <View style={[styles.banner, message.ok && styles.bannerOk]}>
              <Icon name={message.ok ? 'mark_email_read' : 'error'} size={20} color={message.ok ? colors.success : colors.accent} />
              <Text style={[type.body, styles.flex]}>{message.text}</Text>
            </View>
          ) : null}

          <PillButton label={busy ? 'Bekle…' : mode === 'in' ? 'Giriş yap' : 'Hesap oluştur'} variant="primary" disabled={busy} onPress={submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const STRENGTH_COLORS = [colors.divider, colors.accent, colors.warning, colors.success, colors.success];

function Field({ icon, label, error, secret, ...input }: TextInputProps & { icon: IconName; label: string; error: string | null; secret?: boolean }) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.field}>
      <Text style={type.caption}>{label}</Text>
      <View style={[styles.inputBox, error && styles.inputError]}>
        <Icon name={icon} size={20} color={colors.textSecondary} />
        <TextInput {...input} secureTextEntry={secret && hidden} placeholderTextColor={colors.textSecondary}
          style={styles.input} accessibilityLabel={label} />
        {secret ? (
          <Pressable onPress={() => setHidden(!hidden)} hitSlop={10} accessibilityRole="button" accessibilityLabel={hidden ? 'Şifreyi göster' : 'Şifreyi gizle'}>
            <Icon name={hidden ? 'visibility' : 'visibility_off'} size={20} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  body: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  brand: { alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  logo: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg },
  field: { gap: spacing.xs },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: spacing.lg,
  },
  inputError: { borderColor: colors.accent },
  input: { flex: 1, color: colors.textPrimary, fontSize: 17, paddingVertical: spacing.sm },
  error: { fontSize: 13, fontWeight: '600', color: colors.accent },
  strength: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -spacing.sm },
  bar: { flex: 1, height: 5, borderRadius: 3 },
  strengthLabel: { width: 64, textAlign: 'right' },
  forgot: { alignSelf: 'flex-end', marginTop: -spacing.sm },
  link: { fontSize: 14, fontWeight: '700', color: colors.accent },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
  },
  bannerOk: { borderWidth: 1, borderColor: colors.success },
});

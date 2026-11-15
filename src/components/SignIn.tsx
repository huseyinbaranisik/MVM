import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PillButton } from '@/components/ui/PillButton';
import { supabase } from '@/db/supabase';
import { colors, radius, spacing, type } from '@/theme';

const ERRORS: Record<string, string> = {
  'Invalid login credentials': 'E-posta veya şifre hatalı.',
  'Email not confirmed': 'E-posta henüz onaylanmadı.',
  'User already registered': 'Bu e-postayla hesap zaten var.',
};

export function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const run = async (mode: 'in' | 'up') => {
    if (busy) return;
    if (!/\S+@\S+\.\S+/.test(email.trim())) { setMessage('Geçerli bir e-posta gir.'); return; }
    if (password.length < 6) { setMessage('Şifre en az 6 karakter olmalı.'); return; }
    setBusy(true);
    setMessage('');
    const creds = { email: email.trim(), password };
    try {
      const { data, error } = mode === 'in' ? await supabase.auth.signInWithPassword(creds) : await supabase.auth.signUp(creds);
      if (error) setMessage(ERRORS[error.message] ?? (/^Email address .* is invalid$/.test(error.message) ? 'Bu e-posta adresi kullanılamıyor.' : error.message));
      else if (mode === 'up' && !data.session) setMessage('Onay e-postası gönderildi. Onayladıktan sonra giriş yap.');
    } catch {
      setMessage('Sunucuya ulaşılamadı.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={type.hero}>MVM</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="E-posta" placeholderTextColor={colors.textSecondary}
          style={styles.input} keyboardType="email-address" autoCapitalize="none" autoComplete="email" accessibilityLabel="E-posta" />
        <TextInput value={password} onChangeText={setPassword} placeholder="Şifre" placeholderTextColor={colors.textSecondary}
          style={styles.input} secureTextEntry autoComplete="password" accessibilityLabel="Şifre" onSubmitEditing={() => run('in')} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <PillButton label={busy ? 'Bekle…' : 'Giriş yap'} variant="primary" disabled={busy} onPress={() => run('in')} />
        <PillButton label="Hesap oluştur" disabled={busy} onPress={() => run('up')} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  input: {
    minHeight: 56, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider,
    paddingHorizontal: spacing.lg, color: colors.textPrimary, fontSize: 17,
  },
  message: { ...type.caption, color: colors.accent },
});

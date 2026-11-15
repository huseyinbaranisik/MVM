import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PillButton } from '@/components/ui/PillButton';
import { supabase } from '@/db/supabase';
import { colors, radius, spacing, type } from '@/theme';

/** Oturum yokken gösterilir. Verilerin Supabase'de hesabına bağlı saklanır. */
export function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const valid = /\S+@\S+\.\S+/.test(email.trim()) && password.length >= 6;

  const run = async (mode: 'in' | 'up') => {
    if (!valid || busy) return;
    setBusy(true);
    setMessage('');
    const creds = { email: email.trim(), password };
    const { data, error } = mode === 'in' ? await supabase.auth.signInWithPassword(creds) : await supabase.auth.signUp(creds);
    setBusy(false);
    if (error) setMessage(error.message === 'Invalid login credentials' ? 'E-posta veya şifre hatalı.' : error.message);
    else if (mode === 'up' && !data.session) setMessage('Hesap oluşturuldu. E-postana gelen bağlantıyla onayla, sonra giriş yap.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={type.hero}>MVM</Text>
        <Text style={styles.lead}>Verilerin hesabında saklanır; telefon değişse de kaybolmaz.</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="E-posta" placeholderTextColor={colors.textSecondary}
          style={styles.input} keyboardType="email-address" autoCapitalize="none" autoComplete="email" accessibilityLabel="E-posta" />
        <TextInput value={password} onChangeText={setPassword} placeholder="Şifre (en az 6 karakter)" placeholderTextColor={colors.textSecondary}
          style={styles.input} secureTextEntry autoComplete="password" accessibilityLabel="Şifre" onSubmitEditing={() => run('in')} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <PillButton label={busy ? 'Bekle…' : 'Giriş yap'} variant="primary" disabled={!valid || busy} onPress={() => run('in')} />
        <PillButton label="Hesap oluştur" disabled={!valid || busy} onPress={() => run('up')} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  lead: { ...type.body, color: colors.textSecondary },
  input: {
    minHeight: 56, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider,
    paddingHorizontal: spacing.lg, color: colors.textPrimary, fontSize: 17,
  },
  message: { ...type.caption, color: colors.accent },
});

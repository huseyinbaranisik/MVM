import * as ImagePicker from 'expo-image-picker';

import { getSetting, setSetting } from '@/db/repos/settings';
import { must, supabase } from '@/db/supabase';

const BUCKET = 'avatars';

/** Galeriden kare fotoğraf seçip özel bucket'a yükler. Vazgeçilirse false. */
export async function pickAndUploadAvatar() {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.7 });
  if (res.canceled) return false;
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error('Oturum yok');
  const path = `${uid}/avatar.jpg`;
  const body = await (await fetch(res.assets[0].uri)).arrayBuffer();
  must(await supabase.storage.from(BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: true }));
  const p = await getSetting('profile');
  await setSetting('profile', { ...p, avatarPath: path, avatarUpdatedAt: Date.now() });
  return true;
}

export async function removeAvatar() {
  const p = await getSetting('profile');
  if (p.avatarPath) must(await supabase.storage.from(BUCKET).remove([p.avatarPath]));
  await setSetting('profile', { ...p, avatarPath: null, avatarUpdatedAt: null });
}

/** Özel bucket: 1 günlük imzalı adres. */
export async function avatarUrl(path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 86400);
  return data?.signedUrl ?? null;
}

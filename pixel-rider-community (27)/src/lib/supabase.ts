import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  (import.meta.env?.VITE_SUPABASE_URL as string) ||
  'https://anxhzeovqgokcorvjttu.supabase.co';

const SUPABASE_ANON_KEY =
  (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueGh6ZW92cWdva2NvcnZqdHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNTQ2MzQsImV4cCI6MjEwMDczMDYzNH0.cNXVM4y6_uCnHP6r53ZmqqSRQX2oLwk78fSPW9x0FJ4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Uploads a profile picture to Supabase Storage (bucket 'avatars')
 * If storage bucket is not configured or fails, returns null so caller can store optimized DataURL in database.
 */
export async function uploadAvatarToStorage(
  file: File | Blob,
  username: string
): Promise<string | null> {
  try {
    const fileExt = file instanceof File ? file.name.split('.').pop() || 'jpg' : 'jpg';
    const fileName = `${username.toLowerCase()}_${Date.now()}.${fileExt}`;
    const filePath = `profile_pictures/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      // Bucket might not exist or storage not configured; caller will fallback to optimized DB DataURL
      console.warn('Storage upload fallback:', uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data?.publicUrl || null;
  } catch (err) {
    console.warn('Avatar storage upload exception:', err);
    return null;
  }
}

/**
 * Persists and synchronizes profile picture & user data in Supabase database.
 */
export async function syncUserProfileToDatabase(
  username: string,
  updates: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Try updating users table by username (case-sensitive)
    const { error: updateError, data: updatedData } = await supabase
      .from('users')
      .update(updates)
      .eq('username', username)
      .select();

    if (!updateError && updatedData && updatedData.length > 0) {
      return { success: true };
    }

    // 2. Try case-insensitive matching
    const { error: ilikeError, data: ilikeData } = await supabase
      .from('users')
      .update(updates)
      .ilike('username', username)
      .select();

    if (!ilikeError && ilikeData && ilikeData.length > 0) {
      return { success: true };
    }

    // 3. Upsert if record didn't exist yet
    const { error: upsertError } = await supabase
      .from('users')
      .upsert([{ username, ...updates }], { onConflict: 'username' });

    if (upsertError) {
      console.error('Error upserting user in database:', upsertError);
      return { success: false, error: upsertError.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to sync profile to database:', err);
    return { success: false, error: err?.message || 'Database sync error' };
  }
}

export async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getCoordsForLocation(locationText: string): Promise<{ lat: number | null; lng: number | null }> {
  if (!locationText) return { lat: null, lng: null };
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationText)}`);
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.error('Geo error', e);
  }
  return { lat: null, lng: null };
}

export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  let digits = phone.toString().replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0')) {
    digits = '49' + digits.slice(1);
  } else if ((digits.startsWith('15') || digits.startsWith('16') || digits.startsWith('17') || digits.startsWith('18')) && digits.length >= 10 && digits.length <= 11) {
    digits = '49' + digits;
  }
  return digits;
}

export function normalizePhoneVariations(phone: string): string[] {
  if (!phone) return [];
  const raw = phone.trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return [raw];

  const list = new Set<string>();
  list.add(raw);
  list.add(digits);
  list.add('+' + digits);

  if (digits.startsWith('49') && digits.length > 8) {
    list.add('0' + digits.slice(2));
    list.add('+49' + digits.slice(2));
    list.add('+49 ' + digits.slice(2));
  } else if (digits.startsWith('0') && digits.length > 7) {
    list.add('+49' + digits.slice(1));
    list.add('49' + digits.slice(1));
    list.add('+49 ' + digits.slice(1));
  }

  return Array.from(list);
}

export async function checkWhatsAppGroupMembership(phone: string): Promise<{
  isMember: boolean;
  memberData?: any;
  reason?: string;
}> {
  if (!phone || !phone.trim()) {
    return { isMember: false, reason: 'Bitte gib eine gültige Handynummer ein.' };
  }

  const cleanPhone = formatPhoneForWhatsApp(phone);
  const variations = normalizePhoneVariations(phone);
  if (cleanPhone && !variations.includes(cleanPhone)) {
    variations.push(cleanPhone);
  }

  try {
    // 1. Check in wa_group_members (über phone oder phone_number)
    const { data: membersByPhone } = await supabase
      .from('wa_group_members')
      .select('*')
      .in('phone', variations);

    if (membersByPhone && membersByPhone.length > 0) {
      return { isMember: true, memberData: membersByPhone[0] };
    }

    const { data: membersByPhoneNumber } = await supabase
      .from('wa_group_members')
      .select('*')
      .in('phone_number', variations);

    if (membersByPhoneNumber && membersByPhoneNumber.length > 0) {
      return { isMember: true, memberData: membersByPhoneNumber[0] };
    }

    // 2. Check in allowed_members (Fallback)
    const { data: allowedMembers } = await supabase
      .from('allowed_members')
      .select('*')
      .in('phone_number', variations);

    if (allowedMembers && allowedMembers.length > 0) {
      const active = allowedMembers.find(m => m.status === 'active') || allowedMembers[0];
      return { isMember: true, memberData: active };
    }

    // 3. Fallback über PostgreSQL RPC Funktion check_membership_status
    try {
      const { data: rpcData } = await supabase.rpc('check_membership_status', { p_phone: phone });
      if (rpcData && rpcData.length > 0 && rpcData[0].is_allowed) {
        return { isMember: true, memberData: rpcData[0] };
      }
    } catch (rpcErr) {}

    // 4. Live Server-Endpoint des Bots abfragen
    try {
      const { data: config } = await supabase.from('wa_bot_config').select('server_endpoint').limit(1).single();
      if (config?.server_endpoint) {
        const url = `${config.server_endpoint.replace(/\/+$/, '')}/api/check-member`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.isMember) {
            return { isMember: true };
          }
        }
      }
    } catch (apiErr) {}

    return { 
      isMember: false, 
      reason: '⛔ Kein Gruppenmitglied gefunden: Diese Handynummer ist noch nicht als aktives Mitglied der Pixel Rider WhatsApp-Gruppe synchronisiert. Bitte vergewissere dich, dass du in der WhatsApp-Gruppe bist und der Onboarding-Prozess abgeschlossen ist.' 
    };
  } catch (e) {
    console.error('Membership check failed', e);
    return { 
      isMember: false, 
      reason: 'Fehler beim Überprüfen der WhatsApp-Gruppenmitgliedschaft. Bitte versuche es erneut.' 
    };
  }
}

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://anxhzeovqgokcorvjttu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueGh6ZW92cWdva2NvcnZqdHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNTQ2MzQsImV4cCI6MjEwMDczMDYzNH0.cNXVM4y6_uCnHP6r53ZmqqSRQX2oLwk78fSPW9x0FJ4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

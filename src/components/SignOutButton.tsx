'use client';
import { createClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign('/');
  }
  return <button type="button" className="btn btn-secondary" onClick={signOut}>Sign out</button>;
}

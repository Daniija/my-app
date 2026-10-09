import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const result: Record<string, unknown> = {
    ok: false,
    supabaseUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    serverKeyConfigured: Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    profilesTableReachable: false,
    usernameColumnReachable: false,
  };

  try {
    const admin = createAdminClient();
    const { error } = await admin.from('profiles').select('id, username').limit(1);

    if (error) {
      console.error('[AUTH_HEALTH][PROFILES]', error);
      return NextResponse.json(
        {
          ...result,
          code: 'PROFILE_SCHEMA_CHECK_FAILED',
          detail: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ...result,
      ok: true,
      profilesTableReachable: true,
      usernameColumnReachable: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[AUTH_HEALTH][UNHANDLED]', error);
    return NextResponse.json(
      {
        ...result,
        code: message,
        detail:
          message === 'SUPABASE_URL_MISSING'
            ? 'NEXT_PUBLIC_SUPABASE_URL is missing.'
            : message === 'SUPABASE_SERVER_KEY_MISSING'
              ? 'SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is missing.'
              : 'Unexpected server-side authentication configuration error.',
      },
      { status: 500 },
    );
  }
}

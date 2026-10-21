import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/admin';
import { resetPlayerCredentials } from '@/lib/admin/passwords';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeErrorAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Tracked outside the try block so the catch-all handler below can still
  // attach actor context even if something throws before the guard resolves.
  let actorId: string | null = null;
  let actorAlias: string | null = null;

  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    actorId = guard.profile.id;
    actorAlias = guard.profile.alias ?? guard.profile.username;

    const body = await request.json().catch(() => null);
    const action = body?.action;

    if (action !== 'reset_one' && action !== 'reset_all') {
      return NextResponse.json(
        { error: 'Invalid password reset action.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // ==================================
    // RESET ONE PLAYER
    // ==================================

    if (action === 'reset_one') {
      const playerId =
        typeof body?.playerId === 'string' ? body.playerId : '';

      if (!playerId) {
        return NextResponse.json(
          { error: 'Player ID is required.' },
          { status: 400 }
        );
      }

      const { data: player, error: playerError } = await admin
        .from('profiles')
        .select('id, username, alias, role, is_active')
        .eq('id', playerId)
        .single();

      if (playerError || !player) {
        return NextResponse.json(
          { error: 'Player could not be found.' },
          { status: 404 }
        );
      }

      // Never reset an admin account from the player reset tool.
      if (player.role !== 'player') {
        return NextResponse.json(
          { error: 'Administrator passwords cannot be reset here.' },
          { status: 403 }
        );
      }

      const outcome = await resetPlayerCredentials(admin, player.id);

      if (!outcome.ok) {
        await writeErrorAuditLog({
          actorId,
          actorAlias,
          actorRole: 'admin',
          action: 'PASSWORD_RESET_FAILED',
          targetType: 'player',
          targetId: player.id,
          description: `Unable to reset the password for ${player.alias ?? player.username ?? player.id}.`,
          error: new Error(outcome.message ?? `Failed at stage: ${outcome.stage}`),
          context: { stage: outcome.stage },
        });

        return NextResponse.json(
          {
            error:
              outcome.stage === 'password'
                ? 'Unable to reset password.'
                : 'Password changed, but the forced-change flag could not be saved.',
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        playerId: player.id,
        username: player.username,
        alias: player.alias,
        temporaryPassword: outcome.temporaryPassword,
      });
    }

    // ==================================
    // RESET ALL PLAYERS
    // ==================================

    const { data: players, error: playersError } = await admin
      .from('profiles')
      .select('id, username, alias, role, is_active')
      .eq('role', 'player')
      .order('alias', { ascending: true });

    if (playersError) {
      await writeErrorAuditLog({
        actorId,
        actorAlias,
        actorRole: 'admin',
        action: 'PASSWORD_RESET_FAILED',
        description: 'Unable to load players for a reset-all password request.',
        error: playersError,
        context: { stage: 'load_players' },
      });

      return NextResponse.json(
        { error: 'Unable to load players.' },
        { status: 500 }
      );
    }

    const results: {
      playerId: string;
      username: string | null;
      alias: string | null;
      temporaryPassword: string;
    }[] = [];

    const failures: {
      playerId: string;
      username: string | null;
      error: string;
    }[] = [];

    for (const player of players ?? []) {
      const outcome = await resetPlayerCredentials(admin, player.id);

      if (!outcome.ok) {
        failures.push({
          playerId: player.id,
          username: player.username,
          error:
            outcome.stage === 'password'
              ? outcome.message
              : 'Password changed but must_change_password could not be set.',
        });

        continue;
      }

      results.push({
        playerId: player.id,
        username: player.username,
        alias: player.alias,
        temporaryPassword: outcome.temporaryPassword,
      });
    }

    if (failures.length > 0) {
      await writeErrorAuditLog({
        actorId,
        actorAlias,
        actorRole: 'admin',
        action: 'PASSWORD_RESET_FAILED',
        description: `${failures.length} of ${players?.length ?? 0} password resets failed during a reset-all request.`,
        error: new Error(`${failures.length} password resets failed.`),
        context: { stage: 'reset_all', failures },
      });
    }

    return NextResponse.json({
      ok: failures.length === 0,
      resetCount: results.length,
      failureCount: failures.length,
      results,
      failures,
    });
  } catch (error) {
    console.error('[ADMIN PASSWORD RESET]', error);

    await writeErrorAuditLog({
      actorId,
      actorAlias,
      actorRole: actorId ? 'admin' : null,
      action: 'PASSWORD_RESET_FAILED',
      description: 'Unexpected error during a password reset.',
      error,
      context: { stage: 'unexpected' },
    });

    return NextResponse.json(
      { error: 'Unable to reset password.' },
      { status: 500 }
    );
  }
}

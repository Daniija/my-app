import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type PlayerAction =
  | 'activate'
  | 'deactivate'
  | 'make_admin'
  | 'make_player'
  | 'delete';

const allowedActions: PlayerAction[] = [
  'activate',
  'deactivate',
  'make_admin',
  'make_player',
  'delete',
];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const {
      data: adminProfile,
      error: adminProfileError,
    } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        alias,
        role,
        is_active
      `)
      .eq('id', user.id)
      .single();

    if (
      adminProfileError ||
      !adminProfile ||
      adminProfile.role !== 'admin' ||
      !adminProfile.is_active
    ) {
      return NextResponse.json(
        { error: 'Administrator access required.' },
        { status: 403 }
      );
    }

    const body = await request
      .json()
      .catch(() => null);

    const playerId =
      typeof body?.playerId === 'string'
        ? body.playerId
        : '';

    const action =
      body?.action as PlayerAction | undefined;

    if (
      !playerId ||
      !action ||
      !allowedActions.includes(action)
    ) {
      return NextResponse.json(
        { error: 'Invalid player management request.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const {
      data: target,
      error: targetError,
    } = await admin
      .from('profiles')
      .select(`
        id,
        username,
        alias,
        role,
        is_active
      `)
      .eq('id', playerId)
      .single();

    if (targetError || !target) {
      return NextResponse.json(
        { error: 'Player account could not be found.' },
        { status: 404 }
      );
    }

    if (
      playerId === user.id &&
      (
        action === 'deactivate' ||
        action === 'make_player' ||
        action === 'delete'
      )
    ) {
      return NextResponse.json(
        {
          error:
            'You cannot deactivate, demote, or delete your own administrator account.',
        },
        { status: 400 }
      );
    }

    if (action === 'delete') {
      if (target.role === 'admin') {
        return NextResponse.json(
          {
            error:
              'Administrator accounts cannot be deleted from Player Management. Change the account to player first.',
          },
          { status: 400 }
        );
      }

      const {
        error: authDeleteError,
      } =
        await admin.auth.admin.deleteUser(
          playerId
        );

      if (authDeleteError) {
        console.error(
          '[ADMIN PLAYERS] Auth delete failed:',
          authDeleteError
        );

        return NextResponse.json(
          {
            error:
              authDeleteError.message ||
              'Unable to delete the player authentication account.',
          },
          { status: 500 }
        );
      }

      const cleanupTables = [
        'mission_evidence_reviews',
        'mission_theories',
        'mission_containment',
        'mission_breach_reports',
        'mission_attempts',
        'leaderboard_entries',
        'profiles',
      ];

      for (const table of cleanupTables) {
        const {
          error: cleanupError,
        } = await admin
          .from(table)
          .delete()
          .eq(
            table === 'profiles'
              ? 'id'
              : 'player_id',
            playerId
          );

        if (cleanupError) {
          console.warn(
            `[ADMIN PLAYERS] Cleanup warning for ${table}:`,
            cleanupError
          );
        }
      }

      const {
        error: auditError,
      } = await admin
        .from('audit_logs')
        .insert({
          actor_id: adminProfile.id,
          actor_alias:
            adminProfile.alias ??
            adminProfile.username ??
            'Admin',
          actor_role: 'admin',
          action: 'PLAYER_DELETED',
          target_type: 'player',
          target_id: playerId,
          description:
            `${target.alias ?? target.username ?? 'Player'} was permanently deleted by an administrator.`,
          metadata: {
            username: target.username,
            alias: target.alias,
          },
        });

      if (auditError) {
        console.warn(
          '[ADMIN PLAYERS] Unable to write delete audit event:',
          auditError
        );
      }

      return NextResponse.json({
        ok: true,
        action,
        playerId,
      });
    }

    if (
      action === 'activate' ||
      action === 'deactivate'
    ) {
      const isActive =
        action === 'activate';

      const {
        error: updateError,
      } = await admin
        .from('profiles')
        .update({
          is_active: isActive,
        })
        .eq('id', playerId);

      if (updateError) {
        console.error(
          '[ADMIN PLAYERS] Status update failed:',
          updateError
        );

        return NextResponse.json(
          {
            error:
              updateError.message ||
              'Unable to update player status.',
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        action,
        playerId,
        is_active: isActive,
      });
    }

    const newRole =
      action === 'make_admin'
        ? 'admin'
        : 'player';

    const {
      error: roleError,
    } = await admin
      .from('profiles')
      .update({
        role: newRole,
      })
      .eq('id', playerId);

    if (roleError) {
      console.error(
        '[ADMIN PLAYERS] Role update failed:',
        roleError
      );

      return NextResponse.json(
        {
          error:
            roleError.message ||
            'Unable to update player role.',
        },
        { status: 500 }
      );
    }

    const {
      data: authUser,
      error: authUserError,
    } =
      await admin.auth.admin.getUserById(
        playerId
      );

    if (!authUserError && authUser?.user) {
      const currentMetadata =
        authUser.user.app_metadata ?? {};

      const {
        error: metadataError,
      } =
        await admin.auth.admin.updateUserById(
          playerId,
          {
            app_metadata: {
              ...currentMetadata,
              role: newRole,
            },
          }
        );

      if (metadataError) {
        console.warn(
          '[ADMIN PLAYERS] Auth metadata update warning:',
          metadataError
        );
      }
    }

    if (newRole === 'admin') {
      const {
        error: leaderboardDeleteError,
      } = await admin
        .from('leaderboard_entries')
        .delete()
        .eq('player_id', playerId);

      if (leaderboardDeleteError) {
        console.warn(
          '[ADMIN PLAYERS] Unable to remove promoted admin from leaderboard:',
          leaderboardDeleteError
        );
      }
    }

    return NextResponse.json({
      ok: true,
      action,
      playerId,
      role: newRole,
    });
  } catch (error) {
    console.error(
      '[ADMIN PLAYERS] Unexpected error:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to update player.',
      },
      { status: 500 }
    );
  }
}

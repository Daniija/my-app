'use client';

import { useMemo, useState } from 'react';

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_alias: string | null;
  actor_role: string | null;

  action: string;

  target_type: string | null;
  target_id: string | null;

  description: string;

  metadata: Record<string, unknown> | null;

  created_at: string;
};

function badgeClasses(action: string) {
  if (
    action.includes('DISABLED') ||
    action.includes('EMERGENCY') ||
    action.includes('FAILED')
  ) {
    return 'border-red-800 bg-red-950/40 text-red-300';
  }

  if (
    action.includes('COMPLETED') ||
    action.includes('ENABLED')
  ) {
    return 'border-emerald-800 bg-emerald-950/40 text-emerald-300';
  }

  if (
    action.includes('FORCED') ||
    action.includes('ROLE') ||
    action.includes('PROMOTED')
  ) {
    return 'border-amber-800 bg-amber-950/40 text-amber-300';
  }

  return 'border-cyan-900 bg-cyan-950/40 text-cyan-300';
}

function friendlyAction(action: string) {
  return action
    .split('_')
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
    )
    .join(' ');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    'en-JM',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Jamaica',
    }
  ).format(new Date(value));
}

export default function AdminAuditLog({
  logs,
}: {
  logs: AuditLogRow[];
}) {
  const [search, setSearch] =
    useState('');

  const [actionFilter, setActionFilter] =
    useState('ALL');

  const [timeFilter, setTimeFilter] =
    useState('ALL');

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  const actions = useMemo(
    () =>
      Array.from(
        new Set(
          logs.map((log) => log.action)
        )
      ).sort(),
    [logs]
  );

  const filteredLogs = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    const now = Date.now();

    return logs.filter((log) => {
      if (
        actionFilter !== 'ALL' &&
        log.action !== actionFilter
      ) {
        return false;
      }

      if (timeFilter !== 'ALL') {
        const created =
          new Date(log.created_at).getTime();

        const difference =
          now - created;

        if (
          timeFilter === 'TODAY' &&
          difference >
            24 * 60 * 60 * 1000
        ) {
          return false;
        }

        if (
          timeFilter === '7D' &&
          difference >
            7 * 24 * 60 * 60 * 1000
        ) {
          return false;
        }
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchable = [
        log.actor_alias,
        log.actor_role,
        log.action,
        log.target_type,
        log.target_id,
        log.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(
        normalizedSearch
      );
    });
  }, [
    logs,
    search,
    actionFilter,
    timeFilter,
  ]);

  return (
    <div>
      <section className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search actor, action, mission or event..."
          className="rounded-xl border border-slate-800 bg-[#07141d] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-700"
        />

        <select
          value={actionFilter}
          onChange={(event) =>
            setActionFilter(
              event.target.value
            )
          }
          className="rounded-xl border border-slate-800 bg-[#07141d] px-4 py-3 text-sm text-white outline-none focus:border-cyan-700"
        >
          <option value="ALL">
            All Events
          </option>

          {actions.map((action) => (
            <option
              key={action}
              value={action}
            >
              {friendlyAction(action)}
            </option>
          ))}
        </select>

        <select
          value={timeFilter}
          onChange={(event) =>
            setTimeFilter(
              event.target.value
            )
          }
          className="rounded-xl border border-slate-800 bg-[#07141d] px-4 py-3 text-sm text-white outline-none focus:border-cyan-700"
        >
          <option value="ALL">
            All Time
          </option>

          <option value="TODAY">
            Last 24 Hours
          </option>

          <option value="7D">
            Last 7 Days
          </option>
        </select>
      </section>

      <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.15em] text-slate-500">
        <span>
          {filteredLogs.length}{' '}
          {filteredLogs.length === 1
            ? 'event'
            : 'events'}
        </span>

        <span>
          Newest first
        </span>
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-[#061019]">
        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-lg font-black text-slate-300">
              No audit events found
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Try changing the search or filter.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredLogs.map((log) => {
              const expanded =
                expandedId === log.id;

              return (
                <article
                  key={log.id}
                  className="p-5"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(
                        expanded
                          ? null
                          : log.id
                      )
                    }
                    className="w-full text-left"
                  >
                    <div className="grid gap-4 md:grid-cols-[180px_180px_220px_1fr_auto] md:items-center">
                      <div>
                        <p className="text-sm font-bold text-slate-300">
                          {formatDate(
                            log.created_at
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="font-bold text-white">
                          {log.actor_alias ??
                            'SYSTEM'}
                        </p>

                        <p className="mt-1 text-xs uppercase text-slate-500">
                          {log.actor_role ??
                            'system'}
                        </p>
                      </div>

                      <div>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${badgeClasses(
                            log.action
                          )}`}
                        >
                          {friendlyAction(
                            log.action
                          )}
                        </span>
                      </div>

                      <p className="text-sm leading-6 text-slate-300">
                        {log.description}
                      </p>

                      <span className="text-slate-500">
                        {expanded
                          ? '▲'
                          : '▼'}
                      </span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="mt-5 rounded-xl border border-slate-800 bg-[#02080d] p-5">
                      <div className="grid gap-5 md:grid-cols-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                            Target
                          </p>

                          <p className="mt-2 text-sm font-bold">
                            {log.target_type ??
                              '—'}
                            {log.target_id
                              ? ` / ${log.target_id}`
                              : ''}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                            Actor ID
                          </p>

                          <p className="mt-2 break-all text-xs text-slate-400">
                            {log.actor_id ??
                              'System event'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                            Event ID
                          </p>

                          <p className="mt-2 break-all text-xs text-slate-400">
                            {log.id}
                          </p>
                        </div>
                      </div>

                      {log.metadata &&
                        Object.keys(
                          log.metadata
                        ).length > 0 && (
                          <div className="mt-5 border-t border-slate-800 pt-5">
                            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                              Metadata
                            </p>

                            <pre className="mt-3 overflow-x-auto rounded-lg bg-black/30 p-4 text-xs leading-6 text-slate-400">
                              {JSON.stringify(
                                log.metadata,
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

'use client';

import { useState } from 'react';

import LeaderboardLive from '@/components/LeaderboardLive';
import GroupLeaderboard from '@/components/GroupLeaderboard';
import WeeklyWinnerLeaderboard from '@/components/WeeklyWinnerLeaderboard';

type Tab = 'individual' | 'weekly' | 'department' | 'branch';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- individual leaderboard rows are passed through untyped from the server page
export default function LeaderboardTabs({ initial }: { initial: any[] }) {
  const [tab, setTab] = useState<Tab>('individual');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'individual', label: 'Individual' },
    { id: 'weekly', label: 'Weekly Winner' },
    { id: 'department', label: 'Top Department' },
    { id: 'branch', label: 'Top Branch' },
  ];

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={
              tab === item.id ? 'btn btn-primary' : 'btn btn-secondary'
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'individual' && <LeaderboardLive initial={initial} />}
        {tab === 'weekly' && <WeeklyWinnerLeaderboard />}
        {tab === 'department' && <GroupLeaderboard type="department" />}
        {tab === 'branch' && <GroupLeaderboard type="branch" />}
      </div>
    </div>
  );
}

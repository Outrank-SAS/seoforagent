'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { lowIncluded, summarizeAccount } from '@/lib/account';
import { dataOf } from '@/lib/api';
import { formatUsd } from '@/lib/format';
import { pickArray, pickBool, pickString, pickUsd } from '@/lib/pick';
import { setupPrompt } from '@/lib/setup';
import { SHAREABLE_TOOLS } from '@/lib/shared';
import { CopyButton } from '../CopyButton';
import { useApiGet, useDashboard } from './context';
import { hasFreshClaim, GSC_PATH } from './search-console';
import { OverviewSearchConsoleCard } from './SearchConsoleCards';
import { ShareControl, shareUrlOf } from './ShareControl';
import { UpgradeCard } from './UpgradeCard';
import { Card, EmptyState, ErrorState, Modal, RowsTable, SkeletonRows, Stat, downloadCsv, relativeTime, shortDate } from './widgets';

type Row = Record<string, unknown>;

const RESULT_ROW_PATHS = ['data.rows', 'data.results', 'data.pages', 'data.answers', 'data.top_referring_domains', 'data.top_keywords', 'rows'];

const isToday = (value: string): boolean => {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};

const Check = ({ done, label, hint }: { done: boolean; label: string; hint: string }) => (
  <li className="flex items-start gap-3">
    <span
      aria-hidden="true"
      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-ok text-white' : 'border-2 border-line'}`}
    >
      {done ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5 9-10" />
        </svg>
      ) : null}
    </span>
    <span>
      <span className="font-medium">{label}</span>
      <span className="sr-only">{done ? ', done' : ', not done yet'}</span>
      <span className="block text-sm text-muted">{hint}</span>
    </span>
  </li>
);

const costLabel = (row: Row): string => {
  if (pickBool(row, ['free_repeat', 'cost.free_repeat'])) return 'Free repeat';
  const charged = pickUsd(row, ['charged', 'cost', 'cost.charged']);
  if (charged === undefined || charged === 0) return 'Free';
  return formatUsd(charged);
};

const ResultDrawer = ({ row, onClose }: { row: Row | null; onClose: () => void }) => {
  const resultId = row ? pickString(row, ['result_id', 'resultId']) : '';
  const result = useApiGet(resultId ? `/sfa/results/${encodeURIComponent(resultId)}` : null, { limit: 200 });
  const rows = result.envelope?.ok ? pickArray(dataOf(result.envelope), RESULT_ROW_PATHS) : [];
  const args = row ? (row.args as Row | undefined) : undefined;
  const shareable = !!resultId && (SHAREABLE_TOOLS as readonly string[]).includes(row ? pickString(row, ['tool']) : '');
  const sharedUrl = result.envelope?.ok ? shareUrlOf(dataOf(result.envelope)) : '';
  return (
    <Modal open={!!row} title={row ? pickString(row, ['summary', 'what', 'tool'], 'Activity') : 'Activity'} onClose={onClose} side>
      {row ? (
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">Tool</dt>
              <dd className="font-mono">{pickString(row, ['tool'])}</dd>
            </div>
            <div>
              <dt className="text-muted">Cost</dt>
              <dd className="font-mono">{costLabel(row)}</dd>
            </div>
            <div>
              <dt className="text-muted">When</dt>
              <dd>{relativeTime(pickString(row, ['at', 'created_at'])).exact}</dd>
            </div>
            <div>
              <dt className="text-muted">Result id</dt>
              <dd className="flex items-center gap-2 font-mono text-xs break-all">{resultId || 'None'}</dd>
            </div>
          </dl>
          {resultId ? <CopyButton text={resultId} label="Copy result id" /> : null}
          {shareable && !result.loading ? <ShareControl key={`${resultId}:${sharedUrl}`} resultId={resultId} initialUrl={sharedUrl} /> : null}
          {args && Object.keys(args).length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Arguments</h3>
              <pre className="overflow-x-auto rounded-lg bg-surface p-3 font-mono text-xs">{JSON.stringify(args, null, 2)}</pre>
            </div>
          ) : null}
          {resultId ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Stored result</h3>
                {rows.length > 0 ? (
                  <button type="button" className="min-h-11 text-sm font-medium underline" onClick={() => downloadCsv(rows, `${resultId}.csv`)}>
                    Export CSV
                  </button>
                ) : null}
              </div>
              {result.loading ? <SkeletonRows rows={5} /> : null}
              {!result.loading && result.envelope && !result.envelope.ok ? <ErrorState envelope={result.envelope} onRetry={result.reload} what="this result" /> : null}
              {!result.loading && result.envelope?.ok ? <RowsTable rows={rows} caption="Stored result rows" /> : null}
            </div>
          ) : (
            <p className="text-sm text-muted">This call has no stored result.</p>
          )}
        </div>
      ) : null}
    </Modal>
  );
};

export const OverviewView = () => {
  const router = useRouter();
  const { whoami, whoamiLoading } = useDashboard();
  useEffect(() => {
    if (hasFreshClaim()) router.replace(GSC_PATH);
  }, [router]);
  const activity = useApiGet('/sfa/activity', { limit: 50 });
  const [selected, setSelected] = useState<Row | null>(null);
  const summary = whoami?.ok ? summarizeAccount(whoami.data) : null;
  const rows = activity.envelope?.ok ? pickArray(dataOf(activity.envelope), ['rows', 'items', 'activity', 'calls']) : [];
  const agentConnected = (summary?.agentConnected ?? false) || rows.length > 0;
  const showChecklist = !summary || !agentConnected || !summary.hasProject;
  const spendToday = activity.envelope?.ok
    ? rows.filter((row) => isToday(pickString(row, ['at', 'created_at']))).reduce((total, row) => total + (pickUsd(row, ['charged']) ?? 0), 0)
    : undefined;
  const projectNames = new Map(
    (whoami?.ok ? pickArray(dataOf(whoami), ['projects']) : []).map((project) => [pickString(project, ['id']), pickString(project, ['domain', 'name'])]),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>

      <OverviewSearchConsoleCard />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Included usage left"
          value={whoamiLoading ? '...' : formatUsd(summary?.includedLeftUsd ?? 0, 2)}
          hint={summary?.includedTotalUsd !== undefined ? `of ${formatUsd(summary.includedTotalUsd, 2)} this period` : undefined}
        />
        <Stat label="One-time credit" value={whoamiLoading ? '...' : formatUsd(summary?.creditUsd ?? 0, 2)} hint="Spent after included usage" />
        <Stat label="Plan" value={<span className="font-sans">{summary?.planName ?? '...'}</span>} hint={summary?.renewsAt ? `Renews ${shortDate(summary.renewsAt)}` : undefined} />
        <Stat label="Spent today" value={spendToday !== undefined ? formatUsd(spendToday, 2) : '...'} hint="Across all keys, from recent calls" />
      </div>

      {summary && lowIncluded(summary) ? <UpgradeCard summary={summary} /> : null}

      {showChecklist ? (
        <Card title="Get started">
          <ul className="flex flex-col gap-3">
            <Check done={!!summary} label="Key active" hint="Your API key is activated and signed in here." />
            <Check done={agentConnected} label="Agent connected" hint="Turns on after your agent's first call, usually whoami." />
            <Check done={!!summary?.hasProject} label="First project" hint="Your agent creates it when you give it your website." />
          </ul>
          <div className="flex flex-col gap-2 rounded-xl bg-surface p-4 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-muted">
              Paste the setup prompt into your agent. A new key from{' '}
              <Link href="/app/keys" className="font-medium text-ink underline">
                Keys
              </Link>{' '}
              comes with the key already inside.
            </p>
            <CopyButton text={setupPrompt()} label="Copy setup prompt" />
          </div>
        </Card>
      ) : null}

      <Card
        title="Recent activity"
        action={
          rows.length > 0 ? (
            <button type="button" className="min-h-11 text-sm font-medium underline" onClick={() => downloadCsv(rows, 'activity.csv')}>
              Export CSV
            </button>
          ) : null
        }
      >
        {activity.loading ? <SkeletonRows /> : null}
        {!activity.loading && activity.envelope && !activity.envelope.ok ? <ErrorState envelope={activity.envelope} onRetry={activity.reload} what="your activity" /> : null}
        {!activity.loading && activity.envelope?.ok && rows.length === 0 ? (
          <EmptyState title="Your agent's calls and what each cost will show here." prompt="Call whoami, then research 20 keywords for my site." />
        ) : null}
        {!activity.loading && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <caption className="sr-only">Recent tool calls. Choose a row to see its result.</caption>
              <thead>
                <tr className="text-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Time
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    What
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Tool
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Project
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const time = relativeTime(pickString(row, ['at', 'created_at']));
                  return (
                    <tr key={pickString(row, ['id'], String(index))} className="border-t border-line hover:bg-surface">
                      <td className="py-2 pr-3 whitespace-nowrap text-muted">
                        <time title={time.exact}>{time.label}</time>
                      </td>
                      <td className="py-2 pr-3">
                        <button type="button" onClick={() => setSelected(row)} className="min-h-11 text-left font-medium underline-offset-2 hover:underline">
                          {pickString(row, ['summary', 'what', 'description'], pickString(row, ['tool']))}
                        </button>
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">{pickString(row, ['tool'])}</td>
                      <td className="py-2 pr-3 text-muted">{projectNames.get(pickString(row, ['project_id'])) ?? ''}</td>
                      <td className="py-2 text-right font-mono whitespace-nowrap">{costLabel(row)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pickString(dataOf(activity.envelope!), ['next_before']) ? <p className="mt-2 text-xs text-muted">Showing the latest {rows.length} calls.</p> : null}
          </div>
        ) : null}
      </Card>

      <ResultDrawer row={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

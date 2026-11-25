'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, dataOf, errorMessage, type ApiOptions, type Envelope } from '@/lib/api';
import { pickNumber, pickString } from '@/lib/pick';
import { safeHttpUrl } from '@/lib/shared';
import { buttonPrimary, buttonSecondary } from '@/lib/styles';
import { CopyButton } from '../CopyButton';
import { Pill, Spinner } from '../ui';
import { useApiGet, useDashboard } from './context';
import {
  CHANGE_CLASS,
  GSC_PATH,
  GSC_RANGES,
  DEFAULT_RANGE,
  agentPrompts,
  claimErrorMessage,
  dayLabel,
  emailsLabel,
  formatCount,
  formatCtr,
  formatPosition,
  gscErrorMessage,
  linePath,
  overviewCsvRows,
  pagePath,
  parseRange,
  plural,
  propertyTypeLabel,
  readInsights,
  readOverview,
  readState,
  signedCount,
  siteLabel,
  takeClaim,
  type Change,
  type DailyPoint,
  type GscAccount,
  type GscRange,
  type GscState,
  type InsightRow,
  type Insights,
  type Overview,
  type OverviewRow,
} from './search-console';
import { Card, EmptyState, ErrorState, Notice, SkeletonRows, Stat, downloadCsv, relativeTime } from './widgets';

const MAX_ROWS = 10;
const handledClaims = new Set<string>();

interface CallRequest {
  path: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: ApiOptions['query'];
  nonce?: number;
}

const useCall = (request: CallRequest | null) => {
  const { apiKey } = useDashboard();
  const requestKey = request ? JSON.stringify(request) : '';
  const [result, setResult] = useState<{ key: string; request: CallRequest | null; envelope: Envelope | null }>({ key: '', request: null, envelope: null });

  useEffect(() => {
    if (!requestKey) return;
    const parsed = JSON.parse(requestKey) as CallRequest;
    const controller = new AbortController();
    api(parsed.path, { key: apiKey, method: parsed.method, body: parsed.body, query: parsed.query, signal: controller.signal })
      .then((response) => setResult({ key: requestKey, request: parsed, envelope: response.envelope }))
      .catch(() => undefined);
    return () => controller.abort();
  }, [apiKey, requestKey]);

  return { loading: !!requestKey && result.key !== requestKey, envelope: result.envelope, request: result.request };
};

export const ChangeText = ({ change, className = '' }: { change: Change | null; className?: string }) =>
  change ? (
    <span className={`font-mono ${CHANGE_CLASS[change.tone]} ${className}`}>
      <span aria-hidden="true">{change.label}</span>
      <span className="sr-only">{change.spoken}</span>
    </span>
  ) : null;

const Sparkline = ({ values }: { values: number[] }) => {
  if (values.length < 2) return <span className="text-xs text-muted">No daily data</span>;
  return (
    <svg aria-hidden="true" width="100" height="24" viewBox="0 0 100 24" className="text-accent">
      <path d={linePath(values, 100, 24)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
};

const DailyChart = ({ daily }: { daily: DailyPoint[] }) => {
  if (daily.length < 2) return <p className="text-sm text-muted">Not enough daily data for a chart yet.</p>;
  const width = 600;
  const height = 160;
  const first = daily[0];
  const last = daily[daily.length - 1];
  const best = daily.reduce((top, point) => (point.clicks > top.clicks ? point : top), first);
  const label = `Daily clicks from ${dayLabel(first.date)} to ${dayLabel(last.date)}: ${formatCount(first.clicks)} on the first day, ${formatCount(last.clicks)} on the last day, highest ${formatCount(best.clicks)} on ${dayLabel(best.date)}.`;
  return (
    <figure className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-0.5 w-4 rounded bg-accent" />
          Clicks
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-0.5 w-4 rounded bg-faint/50" />
          Impressions, on their own scale
        </span>
        <span className="ml-auto">Highest: {formatCount(best.clicks)} clicks on {dayLabel(best.date, false)}</span>
      </div>
      <svg role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-40 w-full rounded-lg bg-surface">
        <path d={linePath(daily.map((point) => point.impressions), width, height, 6)} fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" vectorEffect="non-scaling-stroke" className="text-faint" />
        <path d={linePath(daily.map((point) => point.clicks), width, height, 6)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="text-accent" />
      </svg>
      <figcaption className="flex justify-between text-xs text-muted">
        <span>{dayLabel(first.date)}</span>
        <span>{dayLabel(last.date)}</span>
      </figcaption>
    </figure>
  );
};

const CheckLine = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-3">
    <span aria-hidden="true" className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12l5 5 9-10" />
      </svg>
    </span>
    <span>{children}</span>
  </li>
);

const GoogleMark = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
    <path fill="#fff" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
    <path fill="#fff" fillOpacity="0.85" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" />
    <path fill="#fff" fillOpacity="0.7" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z" />
    <path fill="#fff" fillOpacity="0.85" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z" />
  </svg>
);

const ConnectHero = ({ busy, error, onConnect }: { busy: boolean; error: string | null; onConnect: () => void }) => (
  <section aria-labelledby="gsc-connect-title" className="flex flex-col gap-5 rounded-2xl border-2 border-accent/30 bg-white p-6 sm:p-8">
    <div className="flex flex-col gap-2">
      <h2 id="gsc-connect-title" className="text-2xl font-semibold tracking-tight">
        Connect Google Search Console
      </h2>
      <p className="max-w-2xl text-muted">Your real clicks, impressions and positions for every site in your Google account, free. Your agent reads them too.</p>
    </div>
    <div>
      <button type="button" className={`${buttonPrimary} min-h-12 px-8 text-base`} onClick={onConnect} disabled={busy}>
        {busy ? <Spinner /> : <GoogleMark />}
        {busy ? 'Opening Google' : 'Connect with Google'}
      </button>
    </div>
    <ul className="flex flex-col gap-2 text-sm">
      <CheckLine>Read-only access. We never change anything in your Search Console.</CheckLine>
      <CheckLine>Connect once and see all your sites, now and later.</CheckLine>
      <CheckLine>Disconnect any time, here or in your Google account.</CheckLine>
    </ul>
    {error ? <Notice tone="danger">{error}</Notice> : null}
  </section>
);

const RangePicker = ({ days, onChange }: { days: GscRange; onChange: (days: GscRange) => void }) => (
  <div role="group" aria-label="Date range" className="inline-flex rounded-xl border border-line bg-white p-0.5">
    {GSC_RANGES.map((range) => (
      <button
        key={range}
        type="button"
        aria-pressed={days === range}
        onClick={() => onChange(range)}
        className={`min-h-11 rounded-[10px] px-3 text-sm font-medium whitespace-nowrap ${days === range ? 'bg-ink text-white' : 'text-ink hover:bg-surface'}`}
      >
        {range} days
      </button>
    ))}
  </div>
);

const RefreshIcon = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
  </svg>
);

const SitesTable = ({ overview, onExport }: { overview: Overview; onExport: () => void }) => (
  <Card
    title="Your sites"
    action={
      overview.rows.length > 0 ? (
        <button type="button" className="min-h-11 text-sm font-medium underline" onClick={onExport}>
          Export CSV
        </button>
      ) : null
    }
  >
    {overview.rows.length === 0 ? (
      <EmptyState title="No site to show yet. Add a site in Google Search Console, or connect the Google account that owns it." />
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <caption className="sr-only">Search Console sites sorted by clicks, last {overview.days} days compared with the {overview.days} days before</caption>
          <thead>
            <tr className="text-muted">
              <th scope="col" className="py-2 pr-3 font-medium">
                Site
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Clicks
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Impressions
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                CTR
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Avg position
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Daily clicks
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Project
              </th>
              <th scope="col" className="py-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {overview.rows.map((row) => (
              <SiteRow key={row.siteUrl} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    )}
    {overview.truncated ? <p className="text-xs text-muted">Showing the first {overview.rows.length} sites. Your agent can read the others.</p> : null}
  </Card>
);

const siteHref = (siteUrl: string) => `${GSC_PATH}?site=${encodeURIComponent(siteUrl)}`;

const SiteRow = ({ row }: { row: OverviewRow }) => (
  <tr className="border-t border-line align-top hover:bg-surface">
    <th scope="row" className="max-w-[220px] py-2.5 pr-3 font-medium">
      <Link href={siteHref(row.siteUrl)} className="break-words underline-offset-2 hover:underline">
        {row.domain}
      </Link>
      <span className="block text-xs font-normal text-muted">{propertyTypeLabel(row.propertyType)}</span>
      {!row.ok ? <span className="mt-1 block text-xs font-normal text-muted">{row.error || 'Google did not return data for this site.'}</span> : null}
    </th>
    {row.ok ? (
      <>
        <td className="py-2.5 pr-3 text-right whitespace-nowrap">
          <span className="block font-mono font-semibold">{formatCount(row.clicks)}</span>
          <ChangeText change={row.clicksChange} className="text-xs" />
        </td>
        <td className="py-2.5 pr-3 text-right whitespace-nowrap">
          <span className="block font-mono">{formatCount(row.impressions)}</span>
          <ChangeText change={row.impressionsChange} className="text-xs" />
        </td>
        <td className="py-2.5 pr-3 text-right font-mono whitespace-nowrap">{formatCtr(row.ctr)}</td>
        <td className="py-2.5 pr-3 text-right font-mono whitespace-nowrap">{formatPosition(row.position)}</td>
        <td className="py-2.5 pr-3">
          <Sparkline values={row.daily.map((point) => point.clicks)} />
        </td>
      </>
    ) : (
      <td colSpan={5} className="py-2.5 pr-3 text-muted">
        No data
      </td>
    )}
    <td className="py-2.5 pr-3">
      {row.projectId ? (
        <Link href={`/app/projects/${encodeURIComponent(row.projectId)}`} className="font-medium underline-offset-2 hover:underline">
          {row.projectName || 'Open project'}
        </Link>
      ) : (
        <Link href="/app/projects" className="text-muted underline-offset-2 hover:underline" title={`Or ask your agent: create a SEOforAgent project for ${row.domain}.`}>
          Create project
        </Link>
      )}
    </td>
    <td className="py-1 text-right">
      <Link href={siteHref(row.siteUrl)} className="inline-flex min-h-11 items-center rounded-lg px-3 font-medium text-ink hover:bg-white">
        Details<span className="sr-only"> for {row.domain}</span>
      </Link>
    </td>
  </tr>
);

const PageCell = ({ page }: { page: string }) => {
  if (!page) return <span className="text-muted">Unknown page</span>;
  const href = safeHttpUrl(page);
  const text = pagePath(page);
  return href ? (
    <a href={href} rel="nofollow noopener noreferrer" target="_blank" title={page} className="break-all underline-offset-2 hover:underline">
      {text}
    </a>
  ) : (
    <span className="break-all" title={page}>
      {text}
    </span>
  );
};

interface Column {
  label: string;
  numeric?: boolean;
  render: (row: InsightRow) => React.ReactNode;
}

const QUERY: Column = { label: 'Query', render: (row) => <span className="break-words">{row.query}</span> };
const PAGE: Column = { label: 'Page', render: (row) => <PageCell page={row.page} /> };
const CLICKS: Column = { label: 'Clicks', numeric: true, render: (row) => formatCount(row.clicks) };
const BEFORE: Column = { label: 'Before', numeric: true, render: (row) => (row.clicksPrev !== undefined ? formatCount(row.clicksPrev) : '') };
const CHANGE: Column = {
  label: 'Change',
  numeric: true,
  render: (row) => {
    const change = row.clicksChange ?? (row.clicks !== undefined && row.clicksPrev !== undefined ? row.clicks - row.clicksPrev : undefined);
    if (change === undefined) return '';
    return <span className={change > 0 ? 'text-ok' : change < 0 ? 'text-danger' : 'text-muted'}>{signedCount(change)}</span>;
  },
};
const IMPRESSIONS: Column = { label: 'Impressions', numeric: true, render: (row) => (row.impressions !== undefined ? formatCount(row.impressions) : '') };
const POSITION: Column = { label: 'Position', numeric: true, render: (row) => formatPosition(row.position) };
const CTR: Column = { label: 'CTR', numeric: true, render: (row) => formatCtr(row.ctr) };
const EXPECTED: Column = { label: 'Usual CTR', numeric: true, render: (row) => formatCtr(row.expectedCtr) };

const InsightTable = ({ title, caption, rows, columns, empty, minWidth = 'min-w-[480px]' }: { title: string; caption: string; rows: InsightRow[]; columns: Column[]; empty: string; minWidth?: string }) => {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, MAX_ROWS);
  return (
    <Card title={title} className="min-w-0">
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className={`w-full ${minWidth} border-collapse text-left text-sm`}>
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr className="text-muted">
                  {columns.map((column) => (
                    <th key={column.label} scope="col" className={`py-2 pr-3 font-medium whitespace-nowrap last:pr-0 ${column.numeric ? 'text-right' : ''}`}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((row, index) => (
                  <tr key={`${row.query}|${row.page}|${index}`} className="border-t border-line align-top">
                    {columns.map((column, columnIndex) =>
                      columnIndex === 0 ? (
                        <th key={column.label} scope="row" className="max-w-[260px] py-2 pr-3 font-normal">
                          {column.render(row)}
                        </th>
                      ) : (
                        <td key={column.label} className={`py-2 pr-3 last:pr-0 ${column.numeric ? 'text-right font-mono whitespace-nowrap' : 'max-w-[220px]'}`}>
                          {column.render(row)}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > MAX_ROWS ? (
            <button type="button" className="min-h-11 self-start text-sm font-medium underline" onClick={() => setAll((value) => !value)} aria-expanded={all}>
              {all ? 'Show fewer' : `Show all ${rows.length}`}
            </button>
          ) : null}
        </>
      )}
    </Card>
  );
};

const InsightMetrics = ({ insights }: { insights: Insights }) => (
  <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {[
      { label: 'Clicks', value: formatCount(insights.clicks), change: insights.clicksChange },
      { label: 'Impressions', value: formatCount(insights.impressions), change: insights.impressionsChange },
      { label: 'CTR', value: formatCtr(insights.ctr) || 'None', change: insights.ctrChange },
      { label: 'Avg position', value: formatPosition(insights.position) || 'None', change: insights.positionChange },
    ].map((item) => (
      <div key={item.label} className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-surface p-3">
        <dt className="text-xs text-muted">{item.label}</dt>
        <dd className="font-mono text-xl font-semibold">{item.value}</dd>
        <dd className="text-xs">
          <ChangeText change={item.change} />
        </dd>
      </div>
    ))}
  </dl>
);

const SiteDetails = ({ siteUrl, days, nonce, known }: { siteUrl: string; days: GscRange; nonce: number; known: { domain: string; type: string } | null }) => {
  const [tick, setTick] = useState(0);
  const call = useCall({ path: '/sfa/gsc/insights', method: 'POST', body: { site: siteUrl, days }, nonce: nonce + tick });
  const sameSite = !!call.request && (call.request.body as { site?: string } | undefined)?.site === siteUrl;
  const data = call.envelope?.ok && sameSite ? readInsights(dataOf(call.envelope)) : null;
  const failed = !call.loading && call.envelope && !call.envelope.ok;

  return (
    <div className="flex flex-col gap-6" aria-busy={call.loading}>
      {!data && call.loading ? (
        <Card title={known?.domain ?? siteLabel(siteUrl)}>
          <p className="flex items-center gap-2 text-sm text-muted" role="status">
            <Spinner /> Reading what moved on this site
          </p>
          <SkeletonRows rows={5} />
        </Card>
      ) : null}
      {failed ? <ErrorState envelope={call.envelope} onRetry={() => setTick((value) => value + 1)} what="this site" /> : null}
      {data ? (
        <div className={`flex flex-col gap-6 transition-opacity ${call.loading ? 'opacity-60' : ''}`}>
          <Card title={`Last ${days} days`}>
            <p className="-mt-2 text-sm text-muted">
              {data.start && data.end ? `${dayLabel(data.start)} to ${dayLabel(data.end)}, compared with the ${days} days before.` : `Compared with the ${days} days before.`}
              {data.dataThrough ? ` Google has data through ${dayLabel(data.dataThrough)}.` : ''}
            </p>
            <InsightMetrics insights={data} />
            <DailyChart daily={data.daily} />
          </Card>

          <Card title="What to do this week">
            {data.actions.length === 0 ? (
              <p className="text-sm text-muted">Nothing stands out for this period. Check again next week.</p>
            ) : (
              <ol className="flex flex-col divide-y divide-line">
                {data.actions.map((action, index) => (
                  <li key={action.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                    <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface font-mono text-sm font-semibold">
                      {index + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold break-words">{action.title}</h3>
                        {action.count !== undefined ? <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-hover">{action.count.toLocaleString('en-US')}</span> : null}
                      </div>
                      {action.why ? <p className="text-sm text-muted break-words">{action.why}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <InsightTable title="Pages gaining" caption="Pages that gained the most clicks" rows={data.pagesUp} columns={[PAGE, CLICKS, BEFORE, CHANGE, POSITION]} empty="No page gained clicks in this period." />
            <InsightTable title="Pages losing" caption="Pages that lost the most clicks" rows={data.pagesDown} columns={[PAGE, CLICKS, BEFORE, CHANGE, POSITION]} empty="No page lost clicks in this period." />
            <InsightTable title="Queries gaining" caption="Queries that gained the most clicks" rows={data.queriesUp} columns={[QUERY, CLICKS, BEFORE, CHANGE, POSITION]} empty="No query gained clicks in this period." />
            <InsightTable title="Queries losing" caption="Queries that lost the most clicks" rows={data.queriesDown} columns={[QUERY, CLICKS, BEFORE, CHANGE, POSITION]} empty="No query lost clicks in this period." />
          </div>

          <InsightTable
            title="Striking distance"
            caption="Queries at positions 8 to 20, where a small push can reach the top of page one"
            rows={data.strikingDistance}
            columns={[QUERY, PAGE, POSITION, IMPRESSIONS, CLICKS]}
            empty="No query sits at positions 8 to 20 right now."
            minWidth="min-w-[640px]"
          />
          <InsightTable
            title="Low click rate"
            caption="Queries with fewer clicks than usual for their position"
            rows={data.lowCtr}
            columns={[QUERY, PAGE, POSITION, IMPRESSIONS, CTR, EXPECTED]}
            empty="Every query gets about the clicks its position usually gets."
            minWidth="min-w-[720px]"
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <InsightTable title="New queries" caption="Queries that had no impressions in the previous period" rows={data.newQueries} columns={[QUERY, CLICKS, IMPRESSIONS, POSITION]} empty="No new query in this period." />
            <InsightTable title="Lost queries" caption="Queries that had impressions before and none now" rows={data.lostQueries} columns={[QUERY, CLICKS, IMPRESSIONS, POSITION]} empty="No query was lost in this period." />
          </div>
          <p className="text-xs text-muted">Queries and page addresses come from Google and are shown as they are.</p>
        </div>
      ) : null}
    </div>
  );
};

const AgentCard = ({ firstDomain }: { firstDomain: string }) => (
  <Card title="Use it with your agent">
    <p className="-mt-2 text-sm text-muted">Your agent reads the same Search Console data through MCP, for free. Paste one of these into it.</p>
    <ul className="flex flex-col divide-y divide-line">
      {agentPrompts(firstDomain).map((prompt) => (
        <li key={prompt} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
          <p className="flex-1 font-mono text-sm break-words">{prompt}</p>
          <CopyButton text={prompt} label="Copy prompt" />
        </li>
      ))}
    </ul>
  </Card>
);

const STATUS: Record<GscAccount['status'], { tone: 'ok' | 'warn' | 'danger'; label: string }> = {
  ok: { tone: 'ok', label: 'Working' },
  expired: { tone: 'warn', label: 'Access expired' },
  error: { tone: 'danger', label: 'Not working' },
};

const AccountsCard = ({
  accounts,
  busyEmail,
  connectBusy,
  onReconnect,
  onDisconnect,
}: {
  accounts: GscAccount[];
  busyEmail: string | null;
  connectBusy: boolean;
  onReconnect: () => void;
  onDisconnect: (email: string) => void;
}) => (
  <Card title="Connected Google accounts">
    <ul className="flex flex-col divide-y divide-line">
      {accounts.map((account) => {
        const time = relativeTime(account.connectedAt);
        return (
          <li key={`${account.source}:${account.email}`} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium break-all">{account.email || 'Google account'}</p>
              <p className="text-sm text-muted">
                {account.source === 'outrank' ? 'Connected in Outrank' : 'Connected here'} · {plural(account.sites, 'site', 'sites')}
                {time.label ? (
                  <>
                    {' '}
                    · <time title={time.exact}>{time.label}</time>
                  </>
                ) : null}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Pill tone={STATUS[account.status].tone}>{STATUS[account.status].label}</Pill>
              {account.status !== 'ok' && account.source === 'seoforagent' ? (
                <button type="button" className={`${buttonSecondary} min-h-11 px-4 text-sm`} onClick={onReconnect} disabled={connectBusy}>
                  {connectBusy ? <Spinner /> : null}
                  Reconnect
                </button>
              ) : null}
              {account.source === 'seoforagent' ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-danger hover:bg-danger-soft disabled:opacity-60"
                  onClick={() => onDisconnect(account.email)}
                  disabled={busyEmail === account.email}
                >
                  {busyEmail === account.email ? <Spinner /> : null}
                  Disconnect<span className="sr-only"> {account.email}</span>
                </button>
              ) : (
                <span className="text-sm text-muted">Manage it in Outrank</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  </Card>
);

export const SearchConsoleView = () => {
  const { apiKey } = useDashboard();
  const searchParams = useSearchParams();
  const site = searchParams?.get('site') || null;
  const stateCall = useApiGet('/sfa/gsc');
  const reloadState = stateCall.reload;
  const [days, setDays] = useState<GscRange>(DEFAULT_RANGE);
  const [tick, setTick] = useState({ n: 0, refresh: false });
  const [claiming, setClaiming] = useState(false);
  const [flash, setFlash] = useState<{ tone: 'ok' | 'danger' | 'warn'; text: string } | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [connect, setConnect] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const started = useRef(false);

  const state: GscState | null = useMemo(() => (stateCall.envelope?.ok ? readState(dataOf(stateCall.envelope)) : null), [stateCall.envelope]);
  const connected = !!state?.connected;
  const overviewCall = useCall(connected ? { path: '/sfa/gsc/overview', query: { days, refresh: tick.refresh ? 1 : undefined }, nonce: tick.n } : null);
  const overview = useMemo(() => (overviewCall.envelope?.ok ? readOverview(dataOf(overviewCall.envelope), state ?? undefined) : null), [overviewCall.envelope, state]);

  const refreshAll = useCallback(() => {
    reloadState();
    setTick((value) => ({ n: value.n + 1, refresh: true }));
  }, [reloadState, setTick]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('gsc_error');
    const requestedDays = params.get('days');
    const claim = takeClaim();
    if (params.has('claim') || params.has('gsc_error')) {
      params.delete('claim');
      params.delete('gsc_error');
      window.history.replaceState(null, '', params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname);
    }
    queueMicrotask(() => {
      if (errorCode) setReturnError(gscErrorMessage(errorCode));
      if (requestedDays) setDays(parseRange(requestedDays));
    });
    if (!claim || handledClaims.has(claim)) return;
    handledClaims.add(claim);
    queueMicrotask(() => setClaiming(true));
    void api('/sfa/gsc/claim', { method: 'POST', key: apiKey, body: { claim } }).then(({ envelope }) => {
      setClaiming(false);
      if (envelope.ok) {
        const data = dataOf(envelope);
        const email = pickString(data, ['google_email']);
        const count = pickNumber(data, ['sites']) ?? 0;
        setFlash({ tone: 'ok', text: `Connected ${email || 'your Google account'}: ${plural(count, 'site', 'sites')}.` });
        refreshAll();
        return;
      }
      setFlash({ tone: 'danger', text: claimErrorMessage(envelope.error?.code, envelope.error?.message) });
      reloadState();
    });
  }, [apiKey, refreshAll, reloadState]);

  const startConnect = async () => {
    if (connect.busy) return;
    setConnect({ busy: true, error: null });
    const { envelope } = await api('/sfa/gsc/connect', { method: 'POST', key: apiKey, body: {} });
    const url = envelope.ok ? pickString(dataOf(envelope), ['connect_url']) : '';
    if (url.startsWith('https://')) {
      window.location.assign(url);
      return;
    }
    setConnect({ busy: false, error: envelope.ok ? 'Google did not send a link back. Try again.' : errorMessage(envelope) });
  };

  const disconnect = async (email: string) => {
    if (!window.confirm(`Disconnect ${email}? This dashboard and your agent stop seeing its sites. You can connect it again later.`)) return;
    setDisconnecting(email);
    const { envelope } = await api('/sfa/gsc/accounts', { method: 'DELETE', key: apiKey, query: { google_email: email } });
    setDisconnecting(null);
    setFlash(envelope.ok ? { tone: 'ok', text: `Disconnected ${email}.` } : { tone: 'danger', text: errorMessage(envelope) });
    if (envelope.ok) refreshAll();
  };

  const changeDays = (value: GscRange) => {
    setDays(value);
    setTick((current) => ({ n: current.n + 1, refresh: false }));
  };

  const emails = state ? emailsLabel(state.accounts.map((account) => account.email)) : '';
  const firstDomain = overview?.rows.find((row) => row.ok)?.domain ?? state?.sites[0]?.domain ?? '';
  const known = site && state ? state.sites.find((item) => item.siteUrl === site) : undefined;
  const refreshing = stateCall.loading || overviewCall.loading;

  const notices = (
    <>
      {claiming ? (
        <p className="flex items-center gap-2 rounded-xl bg-surface p-3 text-sm" role="status">
          <Spinner /> Connecting your Search Console…
        </p>
      ) : null}
      {flash ? <Notice tone={flash.tone}>{flash.text}</Notice> : null}
      {returnError && !connected ? <Notice tone="warn">{returnError}</Notice> : null}
      {state?.pending.map((item) => (
        <Notice key={item.email}>Google approved {item.email || 'an account'}, finish on this page.</Notice>
      ))}
    </>
  );

  if (!state) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Search Console</h1>
        {notices}
        {stateCall.loading ? <SkeletonRows rows={4} /> : null}
        {!stateCall.loading && stateCall.envelope && !stateCall.envelope.ok ? <ErrorState envelope={stateCall.envelope} onRetry={stateCall.reload} what="Search Console" /> : null}
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Search Console</h1>
        {notices}
        {claiming ? null : <ConnectHero busy={connect.busy} error={connect.error} onConnect={startConnect} />}
        {state.accounts.length > 0 ? (
          <AccountsCard accounts={state.accounts} busyEmail={disconnecting} connectBusy={connect.busy} onReconnect={startConnect} onDisconnect={disconnect} />
        ) : null}
      </div>
    );
  }

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <RangePicker days={days} onChange={changeDays} />
      <button type="button" className={`${buttonSecondary} px-4`} onClick={refreshAll} disabled={refreshing} aria-label="Refresh Search Console data">
        {refreshing ? <Spinner /> : <RefreshIcon />}
        <span aria-hidden="true">Refresh</span>
      </button>
    </div>
  );

  if (site) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <Link href={GSC_PATH} className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink">
              All sites
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight break-words">{known?.domain ?? siteLabel(site)}</h1>
            <p className="text-muted">
              Search Console{known ? `, ${propertyTypeLabel(known.propertyType).toLowerCase()}` : ''}
              {known?.projectId ? (
                <>
                  {' · '}
                  <Link href={`/app/projects/${encodeURIComponent(known.projectId)}`} className="font-medium text-ink underline-offset-2 hover:underline">
                    {known.projectName || 'Open project'}
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          {controls}
        </div>
        {notices}
        <SiteDetails siteUrl={site} days={days} nonce={tick.n} known={known ? { domain: known.domain, type: known.propertyType } : null} />
        <AgentCard firstDomain={known?.domain ?? siteLabel(site)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Search Console</h1>
          <p className="break-words text-muted">
            {plural(state.sites.length, 'site', 'sites')}
            {emails ? ` from ${emails}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {controls}
          <button type="button" className={`${buttonSecondary} px-4`} onClick={startConnect} disabled={connect.busy}>
            {connect.busy ? <Spinner /> : null}
            Add another Google account
          </button>
        </div>
      </div>
      {notices}
      {connect.error ? <Notice tone="danger">{connect.error}</Notice> : null}

      {overview ? (
        <div className={`flex flex-col gap-6 transition-opacity ${overviewCall.loading ? 'opacity-60' : ''}`} aria-busy={overviewCall.loading}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat
              label={`Clicks, last ${overview.days} days`}
              value={formatCount(overview.clicks)}
              hint={
                <>
                  <ChangeText change={overview.clicksChange} /> {overview.clicksChange ? `vs the ${overview.days} days before` : ''}
                </>
              }
            />
            <Stat
              label={`Impressions, last ${overview.days} days`}
              value={formatCount(overview.impressions)}
              hint={
                <>
                  <ChangeText change={overview.impressionsChange} /> {overview.impressionsChange ? `vs the ${overview.days} days before` : ''}
                </>
              }
            />
          </div>
          {overview.dataThrough ? <p className="-mt-3 text-xs text-muted">All sites together. Google has data through {dayLabel(overview.dataThrough)}; the last two or three days are not final yet.</p> : null}
          <SitesTable overview={overview} onExport={() => downloadCsv(overviewCsvRows(overview.rows), `search-console-${overview.days}-days.csv`)} />
        </div>
      ) : (
        <Card title="Your sites">
          {overviewCall.loading ? (
            <>
              <p className="flex items-center gap-2 text-sm text-muted" role="status">
                <Spinner /> Reading clicks and impressions for every site
              </p>
              <SkeletonRows rows={5} />
            </>
          ) : null}
          {!overviewCall.loading && overviewCall.envelope && !overviewCall.envelope.ok ? (
            <ErrorState envelope={overviewCall.envelope} onRetry={() => setTick((value) => ({ n: value.n + 1, refresh: false }))} what="your Search Console numbers" />
          ) : null}
        </Card>
      )}

      <AgentCard firstDomain={firstDomain} />
      <AccountsCard accounts={state.accounts} busyEmail={disconnecting} connectBusy={connect.busy} onReconnect={startConnect} onDisconnect={disconnect} />
    </div>
  );
};

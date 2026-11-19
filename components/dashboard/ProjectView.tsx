'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { api, dataOf, errorMessage } from '@/lib/api';
import { formatUsd } from '@/lib/format';
import { pick, pickArray, pickBool, pickNumber, pickString, pickUsd } from '@/lib/pick';
import { buttonSecondary } from '@/lib/styles';
import { Spinner } from '../ui';
import { BacklinksTab } from './BacklinksTab';
import { useApiGet, useDashboard } from './context';
import { Card, EmptyState, ErrorState, Notice, SkeletonRows, downloadCsv, relativeTime, shortDate } from './widgets';

type Loose = Record<string, unknown>;
type TabId = 'overview' | 'rankings' | 'listicles' | 'backlinks';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'rankings', label: 'Rankings' },
  { id: 'listicles', label: 'Listicles' },
  { id: 'backlinks', label: 'Backlinks' },
];

const listOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => (typeof item === 'string' ? item : pickString(item, ['name', 'domain', 'url']))).filter(Boolean) : [];

const ContextRow = ({ label, values }: { label: string; values: string[] | string }) => (
  <div className="grid gap-1 border-t border-line py-3 first:border-t-0 sm:grid-cols-[180px_1fr]">
    <dt className="text-sm text-muted">{label}</dt>
    <dd className="text-sm">
      {Array.isArray(values) ? (values.length > 0 ? values.join(', ') : <span className="text-muted">Not set</span>) : values || <span className="text-muted">Not set</span>}
    </dd>
  </div>
);

const OverviewTab = ({ projectId, project }: { projectId: string; project: Loose }) => {
  const { apiKey } = useDashboard();
  const [gsc, setGsc] = useState<{ busy: boolean; message: string | null }>({ busy: false, message: null });
  const recent = pickArray(project, ['recent_calls', 'recent_research', 'research', 'last_calls']);
  const gscConnected = pickBool(project, ['gsc.connected', 'gsc_connected', 'connections.gsc', 'connections.gsc.connected']) ?? false;

  const connectGsc = async () => {
    setGsc({ busy: true, message: null });
    const { envelope } = await api(`/products/${encodeURIComponent(projectId)}/gsc/connect`, { method: 'POST', key: apiKey });
    const url = pickString(dataOf(envelope), ['url', 'auth_url', 'authorization_url', 'oauth_url']);
    if (envelope.ok && url.startsWith('https://')) {
      window.location.assign(url);
      return;
    }
    setGsc({ busy: false, message: envelope.ok ? pickString(envelope, ['agent_guidance'], 'Search Console is already connected.') : errorMessage(envelope) });
  };

  return (
    <div className="flex flex-col gap-6">
      <Card title="Context your agent uses">
        <dl>
          <ContextRow label="Description" values={pickString(project, ['description', 'context.description'])} />
          <ContextRow label="Audiences" values={listOf(pick(project, ['audiences', 'context.audiences', 'target_audiences']))} />
          <ContextRow label="Competitors" values={listOf(pick(project, ['competitors', 'context.competitors']))} />
          <ContextRow label="Website" values={pickString(project, ['url', 'domain'])} />
          <ContextRow
            label="Market"
            values={[
              pickString(project, ['market.location_code']) ? `Location ${pickString(project, ['market.location_code'])}` : '',
              pickString(project, ['market.language_code']) ? `language ${pickString(project, ['market.language_code'])}` : '',
            ].filter(Boolean)}
          />
        </dl>
        <p className="text-sm text-muted">Your agent edits this with projects_update. Ask it to correct anything that looks wrong.</p>
      </Card>

      <Card title="Search Console">
        <p className="text-muted">
          {gscConnected ? 'Connected. Your agent can read real clicks and positions with gsc_performance.' : 'Connect Google Search Console so your agent can read your real clicks and positions, for free.'}
        </p>
        {!gscConnected ? (
          <div>
            <button type="button" className={buttonSecondary} onClick={connectGsc} disabled={gsc.busy}>
              {gsc.busy ? <Spinner /> : null}
              Connect Search Console
            </button>
          </div>
        ) : null}
        {gsc.message ? <Notice>{gsc.message}</Notice> : null}
      </Card>

      <Card title="Research already paid for">
        {recent.length === 0 ? (
          <EmptyState title="Paid calls for this project show here, so your agent does not buy the same data twice." prompt="Research keywords for this project and save the best 20." />
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((row, index) => {
              const time = relativeTime(pickString(row, ['at', 'created_at']));
              return (
                <li key={pickString(row, ['id'], String(index))} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    <span className="font-mono text-xs">{pickString(row, ['tool'])}</span> {pickString(row, ['summary', 'what'])}
                  </span>
                  <span className="text-muted">
                    <time title={time.exact}>{time.label}</time> {pickUsd(row, ['charged', 'cost']) !== undefined ? formatUsd(pickUsd(row, ['charged', 'cost'])) : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};

interface Series {
  keyword: string;
  change?: number | null;
  points: { date: string; position: number | null }[];
}

const toSeries = (data: unknown): Series[] => {
  const grouped = pickArray(data, ['keywords', 'series']);
  if (grouped.length > 0 && Array.isArray(grouped[0].history ?? grouped[0].points)) {
    return grouped.map((item) => ({
      keyword: pickString(item, ['keyword']),
      change: pickNumber(item, ['change']) ?? null,
      points: ((item.history ?? item.points) as Loose[])
        .map((point) => ({ date: pickString(point, ['checked_at', 'date']), position: pickNumber(point, ['position', 'rank']) ?? null }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }));
  }
  const rows = Array.isArray(data) ? (data as Loose[]) : pickArray(data, ['rows', 'history', 'positions', 'items']);
  const map = new Map<string, Series>();
  for (const row of rows) {
    const keyword = pickString(row, ['keyword']);
    if (!keyword) continue;
    const series = map.get(keyword) ?? { keyword, points: [] };
    series.points.push({ date: pickString(row, ['date', 'checked_at', 'created_at']), position: pickNumber(row, ['position', 'rank']) ?? null });
    map.set(keyword, series);
  }
  return [...map.values()].map((series) => ({ ...series, points: series.points.sort((a, b) => a.date.localeCompare(b.date)) }));
};

const Sparkline = ({ points }: { points: Series['points'] }) => {
  const values = points.map((point) => point.position ?? 101);
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(1, max - min);
  const path = values.map((value, index) => `${index === 0 ? 'M' : 'L'}${(index / (values.length - 1)) * 96 + 2},${((value - min) / span) * 20 + 2}`).join(' ');
  return (
    <svg aria-hidden="true" width="100" height="24" viewBox="0 0 100 24" className="text-accent">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
};

const RankingsTab = ({ projectId }: { projectId: string }) => {
  const history = useApiGet(`/sfa/projects/${encodeURIComponent(projectId)}/rank-history`);
  const series = history.envelope?.ok ? toSeries(history.envelope.data) : [];
  return (
    <Card title="Rankings">
      {history.loading ? <SkeletonRows /> : null}
      {!history.loading && history.envelope && !history.envelope.ok ? <ErrorState envelope={history.envelope} onRetry={history.reload} what="rankings" /> : null}
      {!history.loading && history.envelope?.ok && series.length === 0 ? (
        <EmptyState title="Positions appear after your agent runs rank_check for this project." prompt="Check my rankings for my 10 most important keywords with rank_check." />
      ) : null}
      {series.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <caption className="sr-only">Positions by keyword. Lower is better.</caption>
            <thead>
              <tr className="text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Keyword
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Latest
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Change
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Trend
                </th>
                <th scope="col" className="py-2 font-medium">
                  Last check
                </th>
              </tr>
            </thead>
            <tbody>
              {series.map((item) => {
                const latest = item.points[item.points.length - 1];
                const first = item.points[0];
                const change = item.change !== undefined ? item.change : latest?.position != null && first?.position != null ? first.position - latest.position : null;
                return (
                  <tr key={item.keyword} className="border-t border-line">
                    <th scope="row" className="py-2 pr-3 font-medium">
                      {item.keyword}
                    </th>
                    <td className="py-2 pr-3 font-mono">{latest?.position ?? 'Not in top 100'}</td>
                    <td className={`py-2 pr-3 font-mono ${change && change > 0 ? 'text-ok' : change && change < 0 ? 'text-danger' : 'text-muted'}`}>
                      {change === null || change === 0 ? 'No change' : change > 0 ? `Up ${change}` : `Down ${Math.abs(change)}`}
                    </td>
                    <td className="py-2 pr-3">
                      <Sparkline points={item.points} />
                    </td>
                    <td className="py-2 text-muted">{shortDate(latest?.date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </Card>
  );
};

const ListiclesTab = ({ projectId }: { projectId: string }) => {
  const [worthOnly, setWorthOnly] = useState(false);
  const list = useApiGet(`/sfa/projects/${encodeURIComponent(projectId)}/listicles`);
  const all = list.envelope?.ok ? (Array.isArray(list.envelope.data) ? (list.envelope.data as Loose[]) : pickArray(dataOf(list.envelope), ['rows', 'pages', 'listicles', 'items'])) : [];
  const rows = (worthOnly ? all.filter((row) => pickBool(row, ['worth_paying'])) : all).sort((a, b) => (pickNumber(b, ['score']) ?? 0) - (pickNumber(a, ['score']) ?? 0));
  return (
    <Card
      title="Listicles"
      action={
        all.length > 0 ? (
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={worthOnly} onChange={(event) => setWorthOnly(event.target.checked)} className="h-4 w-4 accent-[#c2410c]" />
              Worth paying only
            </label>
            <button type="button" className="min-h-11 text-sm font-medium underline" onClick={() => downloadCsv(rows, 'listicles.csv')}>
              Export CSV
            </button>
          </div>
        ) : null
      }
    >
      {list.loading ? <SkeletonRows /> : null}
      {!list.loading && list.envelope && !list.envelope.ok ? <ErrorState envelope={list.envelope} onRetry={list.reload} what="listicles" /> : null}
      {!list.loading && list.envelope?.ok && all.length === 0 ? (
        <EmptyState
          title="Lists that rank on Google or are cited by AI assistants show here after a hunt."
          prompt="Run listicles_find for my 3 main buying queries and tell me which lists are worth being on."
        />
      ) : null}
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <caption className="sr-only">Saved listicles sorted by score</caption>
            <thead>
              <tr className="text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Page
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Score
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Google
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Cited by
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  DR
                </th>
                <th scope="col" className="py-2 font-medium">
                  You
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const url = pickString(row, ['url']);
                const title = pickString(row, ['untrusted_text.title', 'title'], url);
                const google = pickArray(row, ['google']);
                const best = google.reduce<number | null>((acc, item) => {
                  const position = pickNumber(item, ['position']);
                  return position !== undefined && (acc === null || position < acc) ? position : acc;
                }, null);
                const citedBy = Array.isArray(row.cited_by) ? (row.cited_by as string[]) : [];
                const yourRank = pickNumber(row, ['your_rank']);
                return (
                  <tr key={pickString(row, ['page_id', 'id'], String(index))} className="border-t border-line align-top">
                    <td className="max-w-sm py-2 pr-3">
                      <a href={url} rel="nofollow noopener noreferrer" target="_blank" className="font-medium underline-offset-2 hover:underline">
                        {title}
                      </a>
                      <span className="block truncate text-xs text-muted">{url.replace(/^https?:\/\//, '')}</span>
                      {pickBool(row, ['worth_paying']) ? <span className="mt-1 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-hover">Worth paying</span> : null}
                    </td>
                    <td className="py-2 pr-3 font-mono font-semibold">{pickNumber(row, ['score']) ?? ''}</td>
                    <td className="py-2 pr-3 font-mono">{best !== null ? `#${best}` : 'Not in top 20'}</td>
                    <td className="py-2 pr-3">{citedBy.length > 0 ? citedBy.join(', ') : <span className="text-muted">None</span>}</td>
                    <td className="py-2 pr-3 font-mono">{pickNumber(row, ['domain_rating', 'dr']) ?? ''}</td>
                    <td className="py-2">{yourRank ? `Listed #${yourRank}` : <span className="text-muted">Not listed</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">Titles come from the listed websites and are shown as they are.</p>
        </div>
      ) : null}
    </Card>
  );
};

export const ProjectView = () => {
  const params = useParams<{ id: string }>();
  const projectId = decodeURIComponent(params?.id ?? '');
  const baseId = useId();
  const [tab, setTab] = useState<TabId>('overview');

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    const match = TABS.find((item) => item.id === requested);
    if (match) queueMicrotask(() => setTab(match.id));
  }, []);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const project = useApiGet(projectId ? `/sfa/projects/${encodeURIComponent(projectId)}` : null);
  const data = project.envelope?.ok ? (pick(dataOf(project.envelope), ['project']) as Loose | undefined) ?? dataOf(project.envelope) : null;

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = event.key === 'ArrowRight' ? (index + 1) % TABS.length : (index - 1 + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/app/projects" className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink">
          All projects
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{data ? pickString(data, ['domain', 'name'], 'Project') : 'Project'}</h1>
        {data && pickString(data, ['name']) && pickString(data, ['name']) !== pickString(data, ['domain']) ? <p className="text-muted">{pickString(data, ['name'])}</p> : null}
      </div>

      <div role="tablist" aria-label="Project sections" className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1">
        {TABS.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => {
              tabRefs.current[item.id] = node;
            }}
            type="button"
            role="tab"
            id={`${baseId}-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`${baseId}-panel`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`-mb-px min-h-11 shrink-0 border-b-2 px-4 text-sm font-semibold ${tab === item.id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-${tab}`}>
        {project.loading ? <SkeletonRows /> : null}
        {!project.loading && project.envelope && !project.envelope.ok ? <ErrorState envelope={project.envelope} onRetry={project.reload} what="this project" /> : null}
        {data && tab === 'overview' ? <OverviewTab projectId={projectId} project={data} /> : null}
        {data && tab === 'rankings' ? <RankingsTab projectId={projectId} /> : null}
        {data && tab === 'listicles' ? <ListiclesTab projectId={projectId} /> : null}
        {data && tab === 'backlinks' ? <BacklinksTab projectId={projectId} /> : null}
      </div>
    </div>
  );
};

'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { api, dataOf, errorMessage, type Envelope } from '@/lib/api';
import { formatUsd } from '@/lib/format';
import { pick, pickBool, pickNumber, pickString } from '@/lib/pick';
import { ENGINES, engineLabel } from '@/lib/shared';
import { buttonDark, inputClass } from '@/lib/styles';
import { Spinner } from '../ui';
import { useApiGet, useDashboard } from './context';
import { Card, ErrorState, Notice, SkeletonRows } from './widgets';

type Loose = Record<string, unknown>;

const BILLING_PATH = '/app/billing';

const linesOf = (text: string): string[] => [...new Set(text.split('\n').map((line) => line.trim()).filter(Boolean))];

const listOf = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

const upgradeHref = (envelope: Envelope | null): string => {
  const url = pickString(envelope, ['error.details.upgrade_url']);
  return url.startsWith('https://') || (url.startsWith('/') && !url.startsWith('//')) ? url : BILLING_PATH;
};

const planRequired = (envelope: Envelope | null, status: number): boolean => !!envelope && !envelope.ok && (status === 402 || envelope.error?.code === 'PLAN_REQUIRED');

const when = (value: string): string => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const UpgradeNotice = ({ href }: { href: string }) => (
  <Notice tone="warn">
    Scheduled tracking needs the Growth plan or above.{' '}
    {href.startsWith('/') ? (
      <Link href={href} className="font-semibold underline underline-offset-2">
        Upgrade to turn it on
      </Link>
    ) : (
      <a href={href} className="font-semibold underline underline-offset-2">
        Upgrade to turn it on
      </a>
    )}
  </Notice>
);

const RunMeta = ({ block, enabled }: { block: unknown; enabled: boolean }) => {
  const cost = pickNumber(block, ['est_cost_per_run_usd']);
  const next = when(pickString(block, ['next_run_at']));
  const last = when(pickString(block, ['last_run_at']));
  return (
    <dl className="grid grid-cols-3 gap-3 rounded-xl bg-surface p-3 text-sm">
      <div className="flex min-w-0 flex-col">
        <dt className="text-xs text-muted">Each run, est.</dt>
        <dd className="font-mono font-medium">{cost !== undefined ? formatUsd(cost) : 'n/a'}</dd>
      </div>
      <div className="flex min-w-0 flex-col">
        <dt className="text-xs text-muted">Next run</dt>
        <dd className="font-medium">{enabled && next ? next : 'Not scheduled'}</dd>
      </div>
      <div className="flex min-w-0 flex-col">
        <dt className="text-xs text-muted">Last run</dt>
        <dd className="font-medium">{last || 'Never'}</dd>
      </div>
    </dl>
  );
};

const TrackingForm = ({ projectId, initial }: { projectId: string; initial: Loose }) => {
  const id = useId();
  const { apiKey } = useDashboard();
  const [saved, setSaved] = useState<Loose>(initial);
  const [rankEnabled, setRankEnabled] = useState(pickBool(initial, ['rank.enabled']) ?? false);
  const [cadence, setCadence] = useState(pickString(initial, ['rank.cadence']) === 'daily' ? 'daily' : 'weekly');
  const [keywords, setKeywords] = useState(listOf(pick(initial, ['rank.keywords'])).join('\n'));
  const [aiEnabled, setAiEnabled] = useState(pickBool(initial, ['ai.enabled']) ?? false);
  const [prompts, setPrompts] = useState(listOf(pick(initial, ['ai.prompts'])).join('\n'));
  const [engines, setEngines] = useState<string[]>(() => {
    const stored = listOf(pick(initial, ['ai.engines']));
    return stored.length > 0 ? stored : [...ENGINES];
  });
  const [state, setState] = useState<{ busy: boolean; message: string | null; ok: boolean; upgrade: string | null }>({ busy: false, message: null, ok: false, upgrade: null });

  const allowed = (pickBool(saved, ['plan_allows']) ?? true) && !state.upgrade;
  const upgrade = state.upgrade ?? (allowed ? null : BILLING_PATH);
  const keywordList = linesOf(keywords);
  const promptList = linesOf(prompts);

  const toggleEngine = (engine: string) => setEngines((current) => (current.includes(engine) ? current.filter((item) => item !== engine) : [...current, engine]));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (rankEnabled && keywordList.length === 0) {
      setState({ busy: false, message: 'Add at least one keyword, or turn rank tracking off.', ok: false, upgrade: null });
      return;
    }
    if (aiEnabled && (promptList.length === 0 || engines.length === 0)) {
      setState({ busy: false, message: 'Add at least one prompt and one assistant, or turn AI tracking off.', ok: false, upgrade: null });
      return;
    }
    setState({ busy: true, message: null, ok: false, upgrade: null });
    const { status, envelope } = await api(`/sfa/projects/${encodeURIComponent(projectId)}/tracking`, {
      method: 'PUT',
      key: apiKey,
      body: {
        rank: { enabled: rankEnabled, cadence, keywords: keywordList },
        ai: { enabled: aiEnabled, prompts: promptList, engines: ENGINES.filter((engine) => engines.includes(engine)) },
      },
    });
    if (envelope.ok) {
      setSaved(dataOf<Loose>(envelope));
      setState({ busy: false, message: 'Tracking saved.', ok: true, upgrade: null });
      return;
    }
    if (planRequired(envelope, status)) {
      setState({ busy: false, message: null, ok: false, upgrade: upgradeHref(envelope) });
      return;
    }
    setState({ busy: false, message: errorMessage(envelope), ok: false, upgrade: null });
  };

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-5">
      {upgrade ? <UpgradeNotice href={upgrade} /> : null}
      <fieldset disabled={!allowed || state.busy} className="grid gap-6 disabled:opacity-60 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <label className="flex min-h-11 items-center gap-2.5 font-medium">
            <input type="checkbox" checked={rankEnabled} onChange={(event) => setRankEnabled(event.target.checked)} className="h-4 w-4 accent-[#c2410c]" />
            Check Google rankings on a schedule
          </label>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-keywords`} className="text-sm font-medium">
              Keywords, one per line
            </label>
            <textarea
              id={`${id}-keywords`}
              rows={6}
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
              placeholder={'ai video editor\nbest ai video generator'}
              className={`${inputClass} py-2.5 font-mono text-sm`}
            />
            <span className="text-xs text-muted">
              {keywordList.length} {keywordList.length === 1 ? 'keyword' : 'keywords'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-cadence`} className="text-sm font-medium">
              How often
            </label>
            <select id={`${id}-cadence`} value={cadence} onChange={(event) => setCadence(event.target.value)} className={inputClass}>
              <option value="weekly">Every week</option>
              <option value="daily">Every day</option>
            </select>
          </div>
          <RunMeta block={pick(saved, ['rank'])} enabled={pickBool(saved, ['rank.enabled']) ?? false} />
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <label className="flex min-h-11 items-center gap-2.5 font-medium">
            <input type="checkbox" checked={aiEnabled} onChange={(event) => setAiEnabled(event.target.checked)} className="h-4 w-4 accent-[#c2410c]" />
            Check AI answers every week
          </label>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-prompts`} className="text-sm font-medium">
              Prompts, one per line
            </label>
            <textarea
              id={`${id}-prompts`}
              rows={6}
              value={prompts}
              onChange={(event) => setPrompts(event.target.value)}
              placeholder={'What is the best AI video editor?\nWhich tool turns a script into a video?'}
              className={`${inputClass} py-2.5 font-mono text-sm`}
            />
            <span className="text-xs text-muted">
              {promptList.length} {promptList.length === 1 ? 'prompt' : 'prompts'}
            </span>
          </div>
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-medium">Assistants</legend>
            <div className="flex flex-wrap gap-x-5">
              {ENGINES.map((engine) => (
                <label key={engine} className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={engines.includes(engine)} onChange={() => toggleEngine(engine)} className="h-4 w-4 accent-[#c2410c]" />
                  {engineLabel(engine)}
                </label>
              ))}
            </div>
          </fieldset>
          <RunMeta block={pick(saved, ['ai'])} enabled={pickBool(saved, ['ai.enabled']) ?? false} />
        </div>
      </fieldset>

      {state.message ? <Notice tone={state.ok ? 'ok' : 'danger'}>{state.message}</Notice> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" className={buttonDark} disabled={!allowed || state.busy}>
          {state.busy ? <Spinner /> : null}
          Save tracking
        </button>
        <p className="text-sm text-muted">Each run is charged like the same manual call. The estimate updates when you save.</p>
      </div>
    </form>
  );
};

export const TrackingCard = ({ projectId }: { projectId: string }) => {
  const tracking = useApiGet(`/sfa/projects/${encodeURIComponent(projectId)}/tracking`);
  const blocked = planRequired(tracking.envelope, tracking.status);
  return (
    <Card title="Tracking">
      <p className="-mt-2 text-sm text-muted">Re-check rankings and AI answers on a schedule, so the history fills in without asking your agent.</p>
      {tracking.loading ? <SkeletonRows rows={3} /> : null}
      {!tracking.loading && blocked ? <UpgradeNotice href={upgradeHref(tracking.envelope)} /> : null}
      {!tracking.loading && tracking.envelope && !tracking.envelope.ok && !blocked ? <ErrorState envelope={tracking.envelope} onRetry={tracking.reload} what="tracking" /> : null}
      {!tracking.loading && tracking.envelope?.ok ? <TrackingForm projectId={projectId} initial={dataOf<Loose>(tracking.envelope)} /> : null}
    </Card>
  );
};

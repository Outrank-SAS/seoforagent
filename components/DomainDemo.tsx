'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { api, dataOf } from '@/lib/api';
import { cleanDomain, demoErrorKind, parseDemoResult, DEMO_COST_LABEL, DEMO_ERROR_TEXT, type DemoErrorKind, type DemoResult } from '@/lib/demo';
import { buttonDark, inputClass } from '@/lib/styles';
import { Spinner, TerminalBar } from './ui';

const PROGRESS = ['Calling domain_overview', 'Reading Google rankings', 'Estimating monthly traffic', 'Picking the top keywords', 'Almost there'];
const PROGRESS_STEP_MS = 1700;
const REQUEST_TIMEOUT_MS = 30000;

type DemoState =
  | { name: 'idle' }
  | { name: 'loading'; domain: string }
  | { name: 'done'; result: DemoResult }
  | { name: 'error'; domain: string; kind: DemoErrorKind; message: string };

const count = (value: number | undefined): string => (value === undefined ? 'n/a' : value.toLocaleString('en-US'));

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <dt className="text-xs text-white/45">{label}</dt>
    <dd className="text-lg text-white tabular-nums sm:text-xl">{value}</dd>
  </div>
);

const Prompt = ({ domain }: { domain: string }) => (
  <p className="break-all text-white">
    <span aria-hidden="true" className="mr-2 text-accent">
      ❯
    </span>
    domain_overview {domain}
  </p>
);

const ActivateLink = ({ label }: { label: string }) => (
  <a href="#get-key" className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-xl bg-white px-4 font-sans text-sm font-semibold text-ink transition-colors hover:bg-white/90">
    {label}
    <span aria-hidden="true">→</span>
  </a>
);

const Loading = ({ domain }: { domain: string }) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setIndex((value) => Math.min(value + 1, PROGRESS.length - 1)), PROGRESS_STEP_MS);
    return () => window.clearInterval(id);
  }, []);
  return (
    <>
      <Prompt domain={domain} />
      <p className="flex items-center gap-2.5 text-white/70">
        <Spinner className="text-white" />
        <span>{PROGRESS[index]}</span>
        <span className="text-white/35">2 to 8 seconds</span>
      </p>
    </>
  );
};

const Result = ({ result }: { result: DemoResult }) => (
  <>
    <Prompt domain={result.domain} />
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <span>
          <span aria-hidden="true" className="mr-2 text-[#4ade80]">
            ●
          </span>
          <span className="text-white">domain_overview</span>
          {result.market ? <span className="text-white/40"> {result.market}</span> : null}
        </span>
        <span className="text-white/60">{DEMO_COST_LABEL}</span>
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-4 sm:pl-5">
        <Stat label="Organic keywords" value={count(result.organicKeywords)} />
        <Stat label="Monthly traffic, est." value={count(result.monthlyTraffic)} />
        <Stat label="Top 3" value={count(result.top3)} />
        <Stat label="Top 10" value={count(result.top10)} />
        <Stat label="Top 100" value={count(result.top100)} />
      </dl>
      {result.topKeywords.length > 0 ? (
        <table className="w-full table-fixed border-collapse text-left sm:ml-5 sm:w-[calc(100%-1.25rem)]">
          <caption className="sr-only">Top keywords for {result.domain}</caption>
          <thead>
            <tr className="text-xs text-white/45">
              <th scope="col" className="py-1.5 pr-3 font-normal">
                Top keywords
              </th>
              <th scope="col" className="w-20 py-1.5 pr-3 text-right font-normal">
                Volume
              </th>
              <th scope="col" className="w-12 py-1.5 text-right font-normal">
                Pos.
              </th>
            </tr>
          </thead>
          <tbody>
            {result.topKeywords.map((row, index) => (
              <tr key={`${row.keyword}-${index}`} className="border-t border-white/10 align-top">
                <th scope="row" className="py-2 pr-3 font-normal">
                  <span className="block truncate text-white">{row.keyword}</span>
                  {row.path ? <span className="block truncate text-xs text-white/40">{row.path}</span> : null}
                </th>
                <td className="py-2 pr-3 text-right text-white/70 tabular-nums">{count(row.volume)}</td>
                <td className="py-2 text-right text-white tabular-nums">{row.position === undefined ? 'n/a' : `#${row.position}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-white/60 sm:pl-5">No ranking keywords found for this domain yet.</p>
      )}
    </div>
    <div className="flex flex-col gap-4 border-t border-white/10 pt-5">
      <p className="text-white/80">Your agent gets this, plus AI visibility, listicles and backlinks. This lookup would cost {DEMO_COST_LABEL}.</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <ActivateLink label="Get a key" />
        {result.remaining !== undefined ? (
          <span className="text-white/45">
            {result.remaining > 0 ? `${result.remaining} free ${result.remaining === 1 ? 'lookup' : 'lookups'} left today` : 'That was your last free lookup today'}
          </span>
        ) : null}
      </div>
    </div>
  </>
);

const Failure = ({ state, onRetry }: { state: Extract<DemoState, { name: 'error' }>; onRetry: () => void }) => (
  <>
    <Prompt domain={state.domain} />
    <p role="alert" className="flex gap-2 text-white/85">
      <span aria-hidden="true" className={state.kind === 'rate' ? 'text-[#e8a33d]' : 'text-[#f87171]'}>
        ●
      </span>
      <span>{state.message}</span>
    </p>
    {state.kind === 'rate' || state.kind === 'unavailable' ? <ActivateLink label="Activate a key" /> : null}
    {state.kind === 'network' || state.kind === 'other' ? (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-11 items-center self-start rounded-xl border border-white/15 bg-white/10 px-4 font-sans text-sm font-medium text-white transition-colors hover:bg-white/20"
      >
        Try again
      </button>
    ) : null}
  </>
);

export const DomainDemo = () => {
  const id = useId();
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [state, setState] = useState<DemoState>({ name: 'idle' });
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const run = async (domain: string) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    setState({ name: 'loading', domain });
    try {
      const { status, envelope } = await api('/sfa/demo/domain', { method: 'POST', body: { domain }, signal: controller.signal });
      if (abort.current !== controller) return;
      if (envelope.ok) {
        track('sfa_demo_run', { ok: true });
        setState({ name: 'done', result: parseDemoResult(dataOf(envelope), domain) });
        return;
      }
      const kind = demoErrorKind(status, envelope.error?.code);
      track('sfa_demo_run', { ok: false, reason: kind });
      setState({ name: 'error', domain, kind, message: kind === 'invalid' && envelope.error?.message ? envelope.error.message : DEMO_ERROR_TEXT[kind] });
    } catch {
      if (abort.current !== controller) return;
      track('sfa_demo_run', { ok: false, reason: 'timeout' });
      setState({ name: 'error', domain, kind: 'network', message: 'The lookup took too long. Try again in a moment.' });
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const domain = cleanDomain(value);
    if (!domain) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    void run(domain);
  };

  const loading = state.name === 'loading';

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex flex-col gap-4 p-5 sm:p-7">
        <div className="flex flex-col gap-1">
          <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
            Try it on your site
          </h2>
          <p className="text-sm text-muted">One real lookup, the same call your agent makes. Free, no key needed, 3 a day.</p>
        </div>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor={`${id}-domain`} className="sr-only">
            Your domain
          </label>
          <input
            id={`${id}-domain`}
            name="domain"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="yoursite.com"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (invalid) setInvalid(false);
            }}
            aria-invalid={invalid}
            aria-describedby={invalid ? `${id}-error` : undefined}
            className={`${inputClass} min-h-12 flex-1 rounded-xl px-4 font-mono text-[15px] ${invalid ? 'border-danger' : ''}`}
          />
          <button type="submit" disabled={loading} className={`${buttonDark} min-h-12`}>
            {loading ? <Spinner /> : null}
            {loading ? 'Looking up' : 'Run lookup'}
          </button>
        </form>
        {invalid ? (
          <p id={`${id}-error`} role="alert" className="text-sm text-danger">
            Enter a domain such as yoursite.com, without a path.
          </p>
        ) : null}
      </div>
      {state.name !== 'idle' ? (
        <div className="bg-ink text-white" aria-live="polite" aria-busy={loading}>
          <TerminalBar title="agent · domain_overview" />
          <div className="flex flex-col gap-5 p-5 font-mono text-[13px] leading-relaxed sm:p-7">
            {state.name === 'loading' ? <Loading domain={state.domain} /> : null}
            {state.name === 'done' ? <Result result={state.result} /> : null}
            {state.name === 'error' ? <Failure state={state} onRetry={() => void run(state.domain)} /> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
};

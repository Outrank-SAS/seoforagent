'use client';

import { useState } from 'react';
import { api, dataOf, errorMessage } from '@/lib/api';
import { formatUsd } from '@/lib/format';
import { pick, pickArray, pickBool, pickNumber, pickString } from '@/lib/pick';
import { PAGE_HOW_LABELS, engineLabel, engineOrder, parseDiagnosis, safeHttpUrl, type Diagnosis, type DiagnosisAction, type DiagnosisIdea, type DiagnosisSeverity } from '@/lib/shared';
import { buttonPrimary } from '@/lib/styles';
import { CopyButton } from '../CopyButton';
import { Spinner } from '../ui';
import { useApiGet, useDashboard } from './context';
import { Card, EmptyState, ErrorState, Notice, SkeletonRows, relativeTime, shortDate } from './widgets';

const CHECK_PROMPT = 'Ask ChatGPT, Perplexity, Gemini and Claude my 3 main buying questions with ai_visibility_check, then run ai_visibility_diagnose and walk me through the plan.';
const DIAGNOSE_PROMPT = 'Run ai_visibility_diagnose on my last AI visibility check and walk me through the plan.';
const MAX_PAGE_NAMES = 3;

const SEVERITY_STYLES: Record<DiagnosisSeverity, string> = {
  critical: 'bg-danger-soft text-danger',
  high: 'bg-danger-soft text-danger',
  medium: 'bg-accent-soft text-accent-hover',
  low: 'bg-surface text-muted',
};
const SEVERITY_LABELS: Record<DiagnosisSeverity, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

interface EngineCount {
  engine: string;
  answers: number;
  mentioned: number;
}

interface CheckAnswer {
  prompt: string;
  engine: string;
  mentioned: boolean;
  cited: boolean;
}

interface Check {
  resultId: string;
  checkedAt: string;
  answers: number;
  mentioned: number;
  byEngine: EngineCount[];
  prompts: string[];
  engines: string[];
  rows: CheckAnswer[];
}

const answersWord = (count: number): string => (count === 1 ? 'answer' : 'answers');

const sortEngines = (engines: string[]): string[] => [...new Set(engines.filter(Boolean))].sort((a, b) => engineOrder(a) - engineOrder(b));

const readCheck = (value: unknown): Check | null => {
  if (!value || typeof value !== 'object') return null;
  const rows: CheckAnswer[] = pickArray(value, ['answers_detail']).map((row) => ({
    prompt: pickString(row, ['prompt']),
    engine: pickString(row, ['engine']).toLowerCase(),
    mentioned: pickBool(row, ['mentioned']) ?? false,
    cited: pickBool(row, ['cited']) ?? false,
  }));
  const byEngine = pickArray(value, ['by_engine'])
    .map((row) => ({ engine: pickString(row, ['engine']).toLowerCase(), answers: pickNumber(row, ['answers']) ?? 0, mentioned: pickNumber(row, ['mentioned']) ?? 0 }))
    .filter((row) => row.engine)
    .sort((a, b) => engineOrder(a.engine) - engineOrder(b.engine));
  const listed = pick(value, ['prompts']);
  const prompts = Array.isArray(listed) ? listed.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : [];
  return {
    resultId: pickString(value, ['result_id']),
    checkedAt: pickString(value, ['checked_at']),
    answers: pickNumber(value, ['answers']) ?? rows.length,
    mentioned: pickNumber(value, ['mentioned']) ?? rows.filter((row) => row.mentioned).length,
    byEngine,
    prompts: prompts.length > 0 ? prompts : [...new Set(rows.map((row) => row.prompt).filter(Boolean))],
    engines: sortEngines(byEngine.length > 0 ? byEngine.map((row) => row.engine) : rows.map((row) => row.engine)),
    rows,
  };
};

const mentionRates = (history: Record<string, unknown>[]): number[] =>
  history.flatMap((row) => {
    const answers = pickNumber(row, ['answers']) ?? 0;
    return answers > 0 ? [Math.round(((pickNumber(row, ['mentioned']) ?? 0) / answers) * 100)] : [];
  });

const Trend = ({ rates }: { rates: number[] }) => {
  const max = Math.max(...rates);
  const min = Math.min(...rates);
  const path = rates
    .map((rate, index) => `${index === 0 ? 'M' : 'L'}${(index / (rates.length - 1)) * 96 + 2},${max === min ? 12 : 22 - ((rate - min) / (max - min)) * 20}`)
    .join(' ');
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
      <span>Mention rate over the last {rates.length} checks</span>
      <svg aria-hidden="true" width="100" height="24" viewBox="0 0 100 24" className="text-accent">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <span className="font-mono text-ink">
        {rates[0]}% → {rates[rates.length - 1]}%
      </span>
    </p>
  );
};

const LatestCheck = ({ check, rates }: { check: Check; rates: number[] }) => {
  const time = relativeTime(check.checkedAt);
  return (
    <Card title="Latest check">
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-semibold tracking-tight">
          Mentioned in {check.mentioned} of {check.answers} {answersWord(check.answers)}
        </p>
        {time.label ? (
          <p className="text-sm text-muted">
            Checked <time title={time.exact}>{time.label}</time>
          </p>
        ) : null}
      </div>

      {check.byEngine.length > 0 ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {check.byEngine.map((row) => (
            <div key={row.engine} className="flex min-w-0 flex-col rounded-xl bg-surface p-3">
              <dt className="text-xs text-muted">{engineLabel(row.engine)}</dt>
              <dd className="font-mono font-medium">
                {row.mentioned} of {row.answers}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {rates.length >= 2 ? <Trend rates={rates} /> : null}

      {check.prompts.length > 0 && check.engines.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <caption className="sr-only">Each question by assistant: named or left out</caption>
            <thead>
              <tr className="text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Question
                </th>
                {check.engines.map((engine) => (
                  <th key={engine} scope="col" className="py-2 pr-3 font-medium">
                    {engineLabel(engine)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {check.prompts.map((prompt, index) => (
                <tr key={`${prompt}-${index}`} className="border-t border-line align-top">
                  <th scope="row" className="max-w-sm py-2 pr-3 font-medium break-words">
                    {prompt}
                  </th>
                  {check.engines.map((engine) => {
                    const answer = check.rows.find((row) => row.prompt === prompt && row.engine === engine);
                    return (
                      <td key={engine} className="py-2 pr-3 whitespace-nowrap">
                        {!answer ? <span className="text-muted">No answer</span> : answer.mentioned ? <span className="font-medium text-ok">Named</span> : <span className="text-muted">Left out</span>}
                        {answer?.cited ? <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-xs text-muted">cited</span> : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Card>
  );
};

const DiagnoseCard = ({ price, canRun, busy, error, onRun }: { price: number | undefined; canRun: boolean; busy: boolean; error: string | null; onRun: () => void }) => (
  <Card title="Why you are left out">
    <p className="text-muted">This reads the pages the assistants cited, checks your site and returns the reasons and a step-by-step plan. It takes about a minute.</p>
    {canRun ? (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="button" className={buttonPrimary} onClick={onRun} disabled={busy}>
          {busy ? <Spinner /> : null}
          {price !== undefined ? `Find out why · ${formatUsd(price)}` : 'Find out why'}
        </button>
        <p role="status" className="text-sm text-muted">
          {busy ? 'Reading the cited pages. This takes about a minute.' : 'Charged to your account credit.'}
        </p>
      </div>
    ) : null}
    {error ? <Notice tone="danger">{error}</Notice> : null}
    <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center">
      <p className="flex-1 text-sm text-muted">
        Or ask your agent: <span className="font-mono text-ink">{DIAGNOSE_PROMPT}</span>
      </p>
      <CopyButton text={DIAGNOSE_PROMPT} label="Copy prompt" />
    </div>
  </Card>
);

const ActionItem = ({ action, index }: { action: DiagnosisAction; index: number }) => {
  const meta = [action.effort ? `Effort: ${action.effort}` : '', action.cost ? `Cost: ${action.cost}` : '', action.expect ? `What to expect: ${action.expect}` : ''].filter(Boolean).join(' · ');
  return (
    <li className="flex gap-3 py-5 first:pt-0 last:pb-0">
      <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface font-mono text-sm font-semibold">
        {index + 1}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold">{action.title}</h3>
          {action.why ? <p className="text-sm text-muted">{action.why}</p> : null}
        </div>
        {action.steps.length > 0 ? (
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
            {action.steps.map((step, stepIndex) => (
              <li key={stepIndex} className="break-words">
                {step}
              </li>
            ))}
          </ul>
        ) : null}
        {meta ? <p className="text-sm text-muted">{meta}</p> : null}
        {action.tools.length > 0 ? (
          <div className="flex flex-col gap-1 text-sm">
            <p className="text-xs font-medium text-muted">Your agent runs</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {action.tools.map((tool, toolIndex) => (
                <li key={`${tool.tool}-${toolIndex}`}>
                  <span className="font-mono text-xs">{tool.tool}</span>
                  {tool.estCostUsd !== undefined ? <span className="text-muted"> about {formatUsd(tool.estCostUsd)}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {action.outrank ? (
          <div className="flex flex-col gap-1.5 rounded-xl bg-outrank-soft/60 p-4 text-sm">
            <p className="font-semibold text-outrank">{action.outrank.product ? `Optional shortcut: ${action.outrank.product}` : 'Optional shortcut'}</p>
            {action.outrank.what ? <p>{action.outrank.what}</p> : null}
            {action.outrank.price ? <p className="font-medium">{action.outrank.price}</p> : null}
            {action.outrank.whyRelevant ? <p>Why it fits here: {action.outrank.whyRelevant}</p> : null}
            {action.outrank.limits ? <p className="text-muted">{action.outrank.limits}</p> : null}
            {action.outrank.url ? (
              <a href={action.outrank.url} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center self-start font-medium underline underline-offset-2">
                See Outrank
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
};

const MoreIdeas = ({ ideas }: { ideas: DiagnosisIdea[] }) => (
  <details className="group rounded-2xl border border-line bg-white">
    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 [&::-webkit-details-marker]:hidden">
      <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <span className="text-lg font-semibold">More ways to get recommended by AI</span>
        <span className="text-sm text-muted">{ideas.length} ideas beyond this plan</span>
      </span>
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-faint transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6l4 4 4-4" />
      </svg>
    </summary>
    <ul className="flex flex-col divide-y divide-line px-5 pb-5">
      {ideas.map((idea, index) => (
        <li key={idea.id || index} className="flex flex-col gap-1.5 py-4 first:pt-1 last:pb-0">
          <h3 className="font-semibold">{idea.title}</h3>
          {idea.why ? <p className="text-sm text-muted">{idea.why}</p> : null}
          {idea.how ? <p className="text-sm">{idea.how}</p> : null}
          {idea.helper ? (
            <p className="text-sm">
              <a href={idea.helper.url} target="_blank" rel="noopener" className="font-medium underline underline-offset-2">
                {idea.helper.name}
              </a>{' '}
              {idea.helper.what} {idea.helper.relation ? <span className="text-muted">{idea.helper.relation}</span> : null}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  </details>
);

const DiagnosisCards = ({ diagnosis }: { diagnosis: Diagnosis }) => (
  <>
    <Card title="Why you are left out">
      {diagnosis.verdict ? <p>{diagnosis.verdict}</p> : null}
      {diagnosis.reasons.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line">
          {diagnosis.reasons.map((reason, index) => (
            <li key={reason.id || index} className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[reason.severity]}`}>{SEVERITY_LABELS[reason.severity]}</span>
                <h3 className="font-semibold">{reason.title}</h3>
              </div>
              {reason.evidence ? <p className="text-sm text-muted">{reason.evidence}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>

    {diagnosis.actions.length > 0 ? (
      <Card title="What to do, in order">
        <ol className="flex flex-col divide-y divide-line">
          {diagnosis.actions.map((action, index) => (
            <ActionItem key={action.id || index} action={action} index={index} />
          ))}
        </ol>
      </Card>
    ) : null}

    {diagnosis.whoWins.length > 0 ? (
      <Card title="Who gets recommended instead">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <caption className="sr-only">Brands the assistants recommended in this check</caption>
            <thead>
              <tr className="text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Name
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Domain
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Named in
                </th>
                <th scope="col" className="py-2 font-medium">
                  Own site cited
                </th>
              </tr>
            </thead>
            <tbody>
              {diagnosis.whoWins.map((winner, index) => (
                <tr key={`${winner.name}-${index}`} className="border-t border-line">
                  <th scope="row" className="py-2 pr-3 font-medium">
                    {winner.name}
                  </th>
                  <td className="py-2 pr-3 font-mono text-xs">{winner.domain || <span className="font-sans text-sm text-muted">Unknown</span>}</td>
                  <td className="py-2 pr-3">
                    {winner.answers} {answersWord(winner.answers)}
                  </td>
                  <td className="py-2 font-mono">{winner.ownSiteCited}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    ) : null}

    {diagnosis.pages.length > 0 ? (
      <Card title="Pages to get on">
        {diagnosis.citedPages ? (
          <p className="-mt-2 text-sm text-muted">
            The assistants cited {diagnosis.citedPages.outsideYourSite} pages outside your site. We read {diagnosis.citedPages.thirdPartyRead} third-party pages and {diagnosis.citedPages.mentionYou}{' '}
            mention you.
          </p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <caption className="sr-only">Pages the assistants cited where you can get listed</caption>
            <thead>
              <tr className="text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Page
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Type
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  How
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Cited in
                </th>
                <th scope="col" className="py-2 font-medium">
                  Names
                </th>
              </tr>
            </thead>
            <tbody>
              {diagnosis.pages.map((page, index) => {
                const href = safeHttpUrl(page.url);
                const title = page.title || page.url;
                return (
                  <tr key={`${page.url}-${index}`} className="border-t border-line align-top">
                    <td className="max-w-sm py-2 pr-3">
                      {href ? (
                        <a href={href} rel="nofollow noopener noreferrer" target="_blank" className="font-medium underline-offset-2 hover:underline">
                          {title}
                        </a>
                      ) : (
                        <span className="font-medium">{title}</span>
                      )}
                      <span className="block truncate font-mono text-xs text-muted">{page.domain || page.url.replace(/^https?:\/\//, '')}</span>
                    </td>
                    <td className="py-2 pr-3">{page.type.replace(/_/g, ' ')}</td>
                    <td className="py-2 pr-3">
                      {page.how ? (
                        <span className="inline-block rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-accent-hover">{PAGE_HOW_LABELS[page.how] ?? page.how}</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {page.citedInAnswers} {answersWord(page.citedInAnswers)}
                    </td>
                    <td className="py-2">{page.names.length > 0 ? page.names.slice(0, MAX_PAGE_NAMES).join(', ') : <span className="text-muted">None</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">Titles come from the listed websites and are shown as they are.</p>
        </div>
      </Card>
    ) : null}

    {diagnosis.prompts.length > 0 ? (
      <Card title="Question by question">
        <ul className="flex flex-col divide-y divide-line">
          {diagnosis.prompts.map((item, index) => (
            <li key={`${item.prompt}-${index}`} className="flex flex-col gap-2 py-4 text-sm first:pt-0 last:pb-0">
              <h3 className="text-base font-medium break-words">{item.prompt}</h3>
              <p>
                <span className="text-muted">Named by:</span>{' '}
                {item.mentionedOn.length > 0 ? <span className="font-medium text-ok">{item.mentionedOn.map(engineLabel).join(', ')}</span> : <span className="text-muted">none</span>}
              </p>
              {item.missingOn.length > 0 ? (
                <p>
                  <span className="text-muted">Left out by:</span> {item.missingOn.map(engineLabel).join(', ')}
                </p>
              ) : null}
              {item.recommended.length > 0 ? (
                <p>
                  <span className="text-muted">Recommended instead:</span> {item.recommended.join(', ')}
                </p>
              ) : null}
              {item.google ? (
                <p className="text-muted">
                  {item.google.top20 ? (item.google.position !== undefined ? `Google: #${item.google.position}` : 'Google: in the top 20') : 'Google: not in the top 20'}
                </p>
              ) : null}
              {item.drafted ? (
                <div className="flex flex-col gap-1 rounded-xl bg-surface p-3">
                  {item.drafted.pageTitle ? <p className="font-medium">Page to publish: {item.drafted.pageTitle}</p> : null}
                  {item.drafted.pageTypeLabel ? <p className="text-muted">Format: {item.drafted.pageTypeLabel}</p> : null}
                  {item.drafted.pageAngle ? <p>{item.drafted.pageAngle}</p> : null}
                  {item.drafted.rewarded ? <p className="text-muted">What the answers reward: {item.drafted.rewarded}</p> : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
    ) : null}

    {diagnosis.moreIdeas.length > 0 ? <MoreIdeas ideas={diagnosis.moreIdeas} /> : null}

    {diagnosis.limits.length > 0 ? (
      <Card title="Limits of this diagnosis">
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted">
          {diagnosis.limits.map((limit, index) => (
            <li key={index}>{limit}</li>
          ))}
        </ul>
      </Card>
    ) : null}
  </>
);

export const AiVisibilityTab = ({ projectId }: { projectId: string }) => {
  const { apiKey, refreshWhoami } = useDashboard();
  const state = useApiGet(`/sfa/projects/${encodeURIComponent(projectId)}/ai-visibility`);
  const [run, setRun] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });

  const data = state.envelope?.ok ? dataOf(state.envelope) : null;
  const check = data ? readCheck(pick(data, ['check'])) : null;
  const rawDiagnosis = data ? pick(data, ['diagnosis']) : undefined;
  const diagnosis = rawDiagnosis && typeof rawDiagnosis === 'object' ? parseDiagnosis(rawDiagnosis) : null;
  const forLatest = diagnosis ? (pickBool(rawDiagnosis, ['is_for_latest_check']) ?? (!check || pickString(rawDiagnosis, ['check.result_id']) === check.resultId)) : false;
  const earlierDate = shortDate(pickString(rawDiagnosis, ['check.checked_at']) || undefined);
  const needsDiagnosis = !!check && check.mentioned < check.answers && (!diagnosis || !forLatest);

  const diagnose = async () => {
    if (!check?.resultId || run.busy) return;
    setRun({ busy: true, error: null });
    const { envelope } = await api('/sfa/ai/diagnose', { method: 'POST', key: apiKey, body: { result_id: check.resultId } });
    setRun({ busy: false, error: envelope.ok ? null : errorMessage(envelope) });
    state.reload();
    if (envelope.ok) void refreshWhoami();
  };

  if (!data) {
    return (
      <Card title="AI visibility">
        {state.loading ? <SkeletonRows /> : null}
        {!state.loading && state.envelope && !state.envelope.ok ? <ErrorState envelope={state.envelope} onRetry={state.reload} what="AI visibility" /> : null}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {check ? (
        <LatestCheck check={check} rates={mentionRates(pickArray(data, ['history']))} />
      ) : (
        <Card title="AI visibility">
          <EmptyState title="What ChatGPT, Perplexity, Gemini and Claude answer about you shows here after a check." prompt={CHECK_PROMPT} />
        </Card>
      )}
      {needsDiagnosis ? <DiagnoseCard price={pickNumber(data, ['diagnose_price_usd'])} canRun={!!check?.resultId} busy={run.busy} error={run.error} onRun={diagnose} /> : null}
      {diagnosis && check && !forLatest ? (
        <Notice>{earlierDate ? `The diagnosis below explains an earlier check, from ${earlierDate}.` : 'The diagnosis below explains an earlier check.'}</Notice>
      ) : null}
      {diagnosis ? <DiagnosisCards diagnosis={diagnosis} /> : null}
    </div>
  );
};

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { TrackView } from '@/components/TrackView';
import {
  ENGINES,
  engineLabel,
  safeHttpUrl,
  sharedDate,
  sharedHeadline,
  sharedSubject,
  type SharedAi,
  type SharedAnswer,
  type SharedListicles,
  type SharedResult,
} from '@/lib/shared';
import { fetchShared } from '@/lib/shared-fetch';
import { buttonPrimary, buttonSecondary } from '@/lib/styles';

export const revalidate = 300;

type Props = { params: Promise<{ token: string }> };

const ROBOTS = { index: false, follow: false };

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { token } = await params;
  const lookup = await fetchShared(token);
  if (lookup.status !== 'ok') return { title: 'Shared result', robots: ROBOTS };
  const headline = sharedHeadline(lookup.result);
  const subject = sharedSubject(lookup.result);
  const title = subject ? `${subject}: ${headline}` : headline;
  const description = lookup.result.ai
    ? `How ChatGPT, Perplexity, Gemini and Claude answer about ${subject || 'this brand'}. Checked with SEOforAgent.`
    : `The lists that rank on Google or get cited by AI assistants for ${subject || 'this site'}. Found with SEOforAgent.`;
  return {
    title,
    description,
    robots: ROBOTS,
    openGraph: { title, description, url: `/r/${token}`, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  };
};

const Eyebrow = ({ result, label }: { result: SharedResult; label: string }) => {
  const date = sharedDate(result.createdAt);
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[13px] text-muted">
      <span aria-hidden="true" className="text-accent">
        ❯
      </span>
      <span>{label}</span>
      {result.domain ? (
        <>
          <span aria-hidden="true" className="text-faint/50">
            /
          </span>
          <span className="break-all text-ink">{result.domain}</span>
        </>
      ) : null}
      {date ? (
        <>
          <span aria-hidden="true" className="text-faint/50">
            /
          </span>
          <span>{date}</span>
        </>
      ) : null}
    </p>
  );
};

const answerState = (answer: SharedAnswer | undefined): { label: string; dot: string; text: string } => {
  if (!answer) return { label: 'Not asked', dot: 'bg-line', text: 'text-faint' };
  if (answer.mentioned && answer.cited) return { label: 'Mentioned and cited', dot: 'bg-[#16a34a]', text: 'text-ok' };
  if (answer.mentioned) return { label: 'Mentioned', dot: 'bg-[#16a34a]', text: 'text-ok' };
  if (answer.cited) return { label: 'Cited', dot: 'bg-[#e8a33d]', text: 'text-warn' };
  return { label: 'Not mentioned', dot: 'bg-faint/40', text: 'text-muted' };
};

const AiView = ({ result, ai }: { result: SharedResult; ai: SharedAi }) => {
  const engines = ai.byEngine.length > 0 ? ai.byEngine.map((row) => row.engine) : [...ENGINES];
  const maxSource = Math.max(1, ...ai.topSources.map((source) => source.answers));
  const prompts = ai.prompts.length > 0 ? ai.prompts : [...new Set(ai.rows.map((row) => row.prompt))];
  return (
    <>
      <Eyebrow result={result} label="ai visibility check" />
      {ai.brand ? <p className="mt-6 text-lg font-medium text-muted">{ai.brand}</p> : null}
      <h1 className={`${ai.brand ? 'mt-1' : 'mt-6'} text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-6xl`}>
        Mentioned in <span className="text-accent">{ai.mentioned}</span> of {ai.answers} AI {ai.answers === 1 ? 'answer' : 'answers'}
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-pretty text-muted">
        {prompts.length} {prompts.length === 1 ? 'question' : 'questions'} asked to {engines.map(engineLabel).join(', ')}. Cited as a source in {ai.cited} of {ai.answers}.
      </p>

      <ul className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="By assistant">
        {ai.byEngine.map((row) => (
          <li key={row.engine} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
            <span className="text-sm font-medium text-muted">{engineLabel(row.engine)}</span>
            <span className="font-mono text-3xl font-semibold tracking-tight">
              {row.mentioned}
              <span className="text-lg font-normal text-faint"> /{row.answers}</span>
            </span>
            <span className="flex flex-col border-t border-line pt-3 text-sm text-muted">
              <span>mentioned</span>
              <span>
                <span className="font-medium text-ink">{row.cited}</span> cited
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="prompts" className="min-w-0">
          <h2 id="prompts" className="text-xl font-semibold tracking-tight">
            Questions asked
          </h2>
          <ol className="mt-4 flex flex-col divide-y divide-line border-y border-line">
            {prompts.map((prompt, index) => (
              <li key={`${prompt}-${index}`} className="flex gap-3 py-3">
                <span aria-hidden="true" className="font-mono text-sm text-faint">
                  {index + 1}
                </span>
                <span className="min-w-0 break-words">{prompt}</span>
              </li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="sources" className="min-w-0">
          <h2 id="sources" className="text-xl font-semibold tracking-tight">
            Most cited sources
          </h2>
          {ai.topSources.length > 0 ? (
            <ol className="mt-4 flex flex-col divide-y divide-line border-y border-line">
              {ai.topSources.slice(0, 8).map((source) => (
                <li key={source.domain} className="flex flex-col gap-1.5 py-3">
                  <span className="flex items-baseline justify-between gap-4">
                    <span className="min-w-0 truncate font-mono text-sm">{source.domain}</span>
                    <span className="shrink-0 text-sm text-muted">
                      {source.answers} {source.answers === 1 ? 'answer' : 'answers'}
                    </span>
                  </span>
                  <span aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-surface">
                    <span className="block h-full rounded-full bg-ink" style={{ width: `${Math.round((source.answers / maxSource) * 100)}%` }} />
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-muted">No sources were cited in these answers.</p>
          )}
        </section>
      </div>

      {ai.rows.length > 0 ? (
        <section aria-labelledby="answers" className="mt-14">
          <h2 id="answers" className="text-xl font-semibold tracking-tight">
            Answer by answer
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {prompts.map((prompt, index) => {
              const rows = ai.rows.filter((row) => row.prompt === prompt);
              const named = [...new Set(rows.flatMap((row) => row.competitors))].slice(0, 12);
              return (
                <li key={`${prompt}-${index}`} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
                  <p className="font-mono text-[13px] leading-relaxed break-words">
                    <span aria-hidden="true" className="mr-2 text-accent">
                      ❯
                    </span>
                    {prompt}
                  </p>
                  <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {engines.map((engine) => {
                      const state = answerState(rows.find((row) => row.engine === engine));
                      return (
                        <li key={engine} className="flex flex-col gap-1 rounded-xl bg-surface px-3 py-2.5">
                          <span className="text-xs text-muted">{engineLabel(engine)}</span>
                          <span className={`flex items-center gap-2 text-sm font-medium ${state.text}`}>
                            <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${state.dot}`} />
                            {state.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {named.length > 0 ? (
                    <p className="text-sm text-muted">
                      <span className="text-faint">Named in these answers:</span> {named.join(', ')}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm text-faint">AI answers vary between runs. This is one sample, taken on the date above.</p>
        </section>
      ) : null}
    </>
  );
};

const ListiclesView = ({ result, lists }: { result: SharedResult; lists: SharedListicles }) => (
  <>
    <Eyebrow result={result} label="listicle hunt" />
    <h1 className="mt-6 text-[2.25rem] leading-[1.08] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
      <span className="text-accent">{lists.pagesFound}</span> {lists.pagesFound === 1 ? 'list ranks or gets cited' : 'lists rank or get cited'} for these queries, {lists.worthPaying}{' '}
      worth being on
    </h1>
    {lists.queries.length > 0 ? (
      <ul className="mt-6 flex flex-wrap gap-2" aria-label="Queries">
        {lists.queries.map((query) => (
          <li key={query} className="rounded-lg border border-line bg-white px-3 py-1.5 font-mono text-[13px] break-words">
            {query}
          </li>
        ))}
      </ul>
    ) : null}

    {lists.pages.length > 0 ? (
      <section aria-labelledby="lists" className="mt-10">
        <h2 id="lists" className="sr-only">
          Lists found
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <caption className="sr-only">Lists that rank on Google or are cited by AI assistants, best first</caption>
            <thead className="bg-surface text-muted">
              <tr>
                <th scope="col" className="p-3 font-medium">
                  List
                </th>
                <th scope="col" className="p-3 font-medium">
                  Google
                </th>
                <th scope="col" className="p-3 font-medium">
                  Cited by
                </th>
                <th scope="col" className="p-3 font-medium">
                  DR
                </th>
                <th scope="col" className="p-3 font-medium">
                  {result.domain || 'You'}
                </th>
                <th scope="col" className="p-3 text-right font-medium">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {lists.pages.map((page, index) => {
                const href = safeHttpUrl(page.url);
                const best = page.google.reduce<{ query: string; position: number } | null>((acc, item) => (!acc || item.position < acc.position ? item : acc), null);
                const title = page.title || page.domain || page.url;
                return (
                  <tr key={`${page.url}-${index}`} className="border-t border-line align-top">
                    <th scope="row" className="max-w-xs p-3 font-normal">
                      {href ? (
                        <a href={href} rel="nofollow noopener noreferrer" target="_blank" className="font-medium text-ink underline-offset-2 hover:underline">
                          {title}
                        </a>
                      ) : (
                        <span className="font-medium text-ink">{title}</span>
                      )}
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span className="font-mono">{page.domain}</span>
                        {page.type ? <span>{page.type.replace(/_/g, ' ')}</span> : null}
                        {page.worthPaying ? <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent-hover">Worth being on</span> : null}
                      </span>
                    </th>
                    <td className="p-3">
                      {best ? (
                        <>
                          <span className="font-mono font-medium">#{best.position}</span>
                          <span className="block max-w-[11rem] truncate text-xs text-muted">{best.query}</span>
                        </>
                      ) : (
                        <span className="text-faint">Not in top 20</span>
                      )}
                    </td>
                    <td className="p-3">{page.citedBy.length > 0 ? page.citedBy.map(engineLabel).join(', ') : <span className="text-faint">None</span>}</td>
                    <td className="p-3 font-mono">{page.domainRating ?? ''}</td>
                    <td className="p-3">{page.listsYou ? <span className="font-medium text-ok">Listed</span> : <span className="text-faint">Not listed</span>}</td>
                    <td className="p-3 text-right font-mono font-semibold">{page.score ?? ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-faint">
          {lists.pagesFound > lists.pages.length ? `Showing the best ${lists.pages.length} of ${lists.pagesFound}. ` : ''}Titles come from the listed websites and are shown as
          they are.
        </p>
      </section>
    ) : (
      <p className="mt-8 text-muted">No lists were found for these queries.</p>
    )}
  </>
);

const Unavailable = () => (
  <div className="flex flex-col items-start gap-4 py-16">
    <h1 className="text-3xl font-semibold tracking-tight">This result did not load</h1>
    <p className="max-w-xl text-muted">We could not reach the result right now. Reload in a moment.</p>
    <Link href="/" className={buttonSecondary}>
      Go to SEOforAgent
    </Link>
  </div>
);

const SharedPage = async ({ params }: Props) => {
  const { token } = await params;
  const lookup = await fetchShared(token);
  if (lookup.status === 'not_found') notFound();
  const result = lookup.status === 'ok' ? lookup.result : null;

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto flex max-w-5xl flex-col px-4 pt-12 sm:px-6 sm:pt-16">
        {result?.ai ? <AiView result={result} ai={result.ai} /> : null}
        {result?.listicles ? <ListiclesView result={result} lists={result.listicles} /> : null}
        {!result ? <Unavailable /> : null}
        {result ? <TrackView event="sfa_share_viewed" tool={result.tool} /> : null}

        <section className="mt-16 flex flex-col gap-5 rounded-2xl bg-ink p-7 text-white sm:flex-row sm:items-center sm:justify-between sm:p-9">
          <div className="flex flex-col gap-1.5">
            <p className="font-mono text-xs text-white/50">Made with SEOforAgent</p>
            <h2 className="text-2xl font-semibold tracking-tight">Run this on your own site</h2>
            <p className="text-white/65">Your AI agent runs the same check from Claude, ChatGPT, Codex or Cursor, and tells you what it cost.</p>
          </div>
          <Link href="/" className={`${buttonPrimary} min-h-12`}>
            Try it on your site
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
};

export default SharedPage;

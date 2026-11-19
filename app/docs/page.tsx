import type { Metadata } from 'next';
import Link from 'next/link';
import { CopyButton } from '@/components/CopyButton';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { CodeBlock } from '@/components/ui';
import { MCP_URL, PUBLIC_API_BASE, SITE_URL } from '@/lib/config';
import { ACCOUNT_ROUTES, BILLING_POINTS, CURL_EXAMPLES, ERROR_CODES, KIND_LABELS, docsMarkdown, routeOf, toolParams, toolsByArea } from '@/lib/docs';
import { FALLBACK_PLANS } from '@/lib/pricing';
import { AGENTS, KEY_PLACEHOLDER, setupPrompt } from '@/lib/setup';
import { AREA_LABELS, TOOLS } from '@/lib/tools';

export const metadata: Metadata = {
  title: 'Docs',
  description: `Connect SEOforAgent to Claude Code, Codex, Cursor, the Claude app or ChatGPT, learn how billing works, and see all ${TOOLS.length} tools and the REST API.`,
  alternates: { canonical: '/docs', types: { 'text/markdown': '/docs.md' } },
};

const NAV = [
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'billing', label: 'How billing works' },
  { id: 'errors', label: 'Errors' },
  { id: 'tools', label: 'Tools' },
  { id: 'rest', label: 'REST API' },
];

const KIND_STYLES: Record<string, string> = {
  read: 'bg-surface text-muted',
  write: 'bg-surface text-muted',
  paid: 'bg-accent-soft text-accent-hover',
  money: 'bg-danger-soft text-danger',
};

const DocsPage = () => (
  <>
    <SiteHeader />
    <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <nav aria-label="Docs" className="flex flex-col gap-0.5 text-sm">
          <p className="px-3 pb-2 text-xs font-medium text-faint">On this page</p>
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-muted transition-colors hover:bg-surface hover:text-ink lg:min-h-9"
            >
              {item.label}
            </a>
          ))}
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
            <p className="px-3 text-xs font-medium text-faint">For agents</p>
            <CopyButton text={docsMarkdown()} label="Copy as Markdown" className="w-full" />
            <div className="flex items-center gap-1 px-1 font-mono text-xs">
              <a href="/docs.md" className="inline-flex min-h-9 items-center rounded-md px-2 text-muted hover:bg-surface hover:text-ink">
                docs.md
              </a>
              <span aria-hidden="true" className="text-line">
                /
              </span>
              <a href="/llms.txt" className="inline-flex min-h-9 items-center rounded-md px-2 text-muted hover:bg-surface hover:text-ink">
                llms.txt
              </a>
            </div>
          </div>
        </nav>
      </aside>

      <main id="main" className="prose-docs min-w-0">
        <h1 className="text-4xl font-semibold tracking-tight">Docs</h1>
        <p className="text-lg">
          SEOforAgent gives your AI agent keyword and search data, AI visibility checks, a listicle hunt and backlink buying through Outrank, over MCP or REST. Every call is
          priced in US dollars.
        </p>

        <h2 id="quickstart">Quickstart</h2>
        <ol>
          <li>
            Open <Link href="/">{SITE_URL.replace('https://', '')}</Link>. An API key starting with <code>sfa_live_</code> is generated in your browser.
          </li>
          <li>Click Activate, choose a plan or buy credit once, and pay on Stripe. The key works as soon as the payment is confirmed.</li>
          <li>Connect your agent with one of the snippets below, then paste the setup prompt.</li>
        </ol>
        <p>
          MCP endpoint (Streamable HTTP, stateless): <code>{MCP_URL}</code> with the header <code>Authorization: Bearer {KEY_PLACEHOLDER}</code>. Apps that cannot set headers
          use <code>{`${MCP_URL}/${KEY_PLACEHOLDER}`}</code>, which works the same way. Keep that URL private: it contains the key.
        </p>
        {AGENTS.map((agent) => (
          <section key={agent.id} aria-labelledby={`agent-${agent.id}`}>
            <h3 id={`agent-${agent.id}`}>{agent.label}</h3>
            <p>{agent.intro}</p>
            <div className="not-prose my-3">
              <CodeBlock code={agent.snippet(KEY_PLACEHOLDER)} label={`${agent.label} config`} dark />
            </div>
            <ol>
              {agent.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
        ))}
        <h3 id="setup-prompt">Setup prompt</h3>
        <p>
          Also at <a href="/setup.md">/setup.md</a>.
        </p>
        <div className="my-3">
          <CodeBlock code={setupPrompt()} label="Setup prompt" />
        </div>

        <h2 id="billing">How billing works</h2>
        <div className="my-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <caption className="sr-only">Plans</caption>
            <thead className="bg-surface">
              <tr>
                <th scope="col" className="p-3">
                  Plan
                </th>
                <th scope="col" className="p-3">
                  Price
                </th>
                <th scope="col" className="p-3">
                  Included each month
                </th>
                <th scope="col" className="p-3">
                  Projects
                </th>
              </tr>
            </thead>
            <tbody>
              {FALLBACK_PLANS.map((plan) => (
                <tr key={plan.id} className="border-t border-line">
                  <th scope="row" className="p-3 font-medium">
                    {plan.name}
                  </th>
                  <td className="p-3 font-mono">${plan.priceUsd} a month</td>
                  <td className="p-3 font-mono">${plan.includedUsd.toLocaleString('en-US')}</td>
                  <td className="p-3">{plan.projects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Credit only: one payment from $10 to $5,000, one project, no reset. Outrank customers on a paid plan: included, with $10 of usage a month. Full list on the{' '}
          <Link href="/pricing">pricing page</Link>.
        </p>
        <ul>
          {BILLING_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>

        <h3 id="errors">Errors</h3>
        <div className="my-3 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <caption className="sr-only">Error codes</caption>
            <tbody>
              {ERROR_CODES.map(([code, meaning]) => (
                <tr key={code} className="border-t border-line first:border-t-0">
                  <th scope="row" className="p-3 font-mono font-medium">
                    {code}
                  </th>
                  <td className="p-3 text-muted">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 id="tools">Tools</h2>
        <p>
          {TOOLS.length} tools. Every response is a JSON envelope with <code>ok</code>, <code>data</code> or <code>error</code>, <code>cost</code>, <code>result_id</code>,{' '}
          <code>next_actions</code> and <code>agent_guidance</code>. Over MCP, long lists are trimmed in the text and the full envelope is in <code>structuredContent</code>.
        </p>
        {toolsByArea().map(([area, tools]) => (
          <section key={area} aria-labelledby={`area-${area}`}>
            <h3 id={`area-${area}`}>{AREA_LABELS[area]}</h3>
            <div className="flex flex-col gap-4">
              {tools.map((tool) => {
                const params = toolParams(tool);
                return (
                  <article key={tool.name} id={`tool-${tool.name}`} className="scroll-mt-20 rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-mono text-base font-semibold text-ink">{tool.name}</h4>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${KIND_STYLES[tool.kind]}`}>{KIND_LABELS[tool.kind]}</span>
                      <span className="font-mono text-xs break-all text-muted">{routeOf(tool)}</span>
                    </div>
                    <p className="text-sm">{tool.description}</p>
                    <p className="text-sm">
                      <span className="font-semibold text-ink">Price:</span> {tool.price}
                    </p>
                    {params.length > 0 ? (
                      <details className="mt-2">
                        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-ink">Parameters ({params.length})</summary>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                            <caption className="sr-only">{tool.name} parameters</caption>
                            <tbody>
                              {params.map((param) => (
                                <tr key={param.name} className="border-t border-line">
                                  <th scope="row" className="py-2 pr-3 align-top font-mono font-medium">
                                    {param.name}
                                    {param.required ? <span className="ml-1 text-danger">required</span> : null}
                                  </th>
                                  <td className="py-2 pr-3 align-top font-mono text-xs text-muted">{param.type}</td>
                                  <td className="py-2 align-top text-muted">{param.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        <h2 id="rest">REST API</h2>
        <p>
          Base URL: <code>{PUBLIC_API_BASE}</code>. Send the key as <code>Authorization: Bearer &lt;key&gt;</code>. Paid routes take <code>dry_run</code>,{' '}
          <code>max_cost_usd</code> and <code>fresh</code> in the JSON body. Every tool above maps to the route shown with it. GET routes take parameters as query strings,
          arrays comma-separated. Money routes need an <code>Idempotency-Key</code> header.
        </p>
        <div className="my-3 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <caption className="sr-only">Account and activation routes</caption>
            <tbody>
              {ACCOUNT_ROUTES.map(([route, purpose]) => (
                <tr key={route} className="border-t border-line first:border-t-0">
                  <th scope="row" className="p-3 font-mono text-xs font-medium">
                    {route}
                  </th>
                  <td className="p-3 text-muted">{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {CURL_EXAMPLES.map((example) => (
          <section key={example.title}>
            <h3>{example.title}</h3>
            <CodeBlock code={example.code} label="Command" dark />
          </section>
        ))}

        <h2 id="open-source">Open source</h2>
        <p>The client (this site, the MCP server, the skills and the plugin) is MIT licensed. The service, data and billing run on Outrank.</p>
      </main>
    </div>
    <SiteFooter />
  </>
);

export default DocsPage;

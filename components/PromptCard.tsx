'use client';

import { useId, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { AGENTS, KEY_PLACEHOLDER, setupPrompt, type AgentId } from '@/lib/setup';
import { CopyButton } from './CopyButton';
import { CodeBlock } from './ui';

const SNIPPET_LABELS = { shell: 'Terminal', toml: '~/.codex/config.toml', json: '~/.cursor/mcp.json', text: 'Connector URL' } as const;

const Step = ({ number, title, children }: { number: number; title: string; children: React.ReactNode }) => (
  <li className="flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-white font-mono text-xs font-semibold text-ink">
        {number}
      </span>
      <h3 className="text-[15px] font-semibold">{title}</h3>
    </div>
    <div className="flex min-w-0 flex-col gap-3 sm:pl-10">{children}</div>
  </li>
);

export const PromptCard = ({ apiKey, note }: { apiKey: string | null; note?: string }) => {
  const [agent, setAgent] = useState<AgentId>(AGENTS[0].id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const baseId = useId();
  const key = apiKey || KEY_PLACEHOLDER;
  const current = AGENTS.find((item) => item.id === agent) ?? AGENTS[0];
  const prompt = setupPrompt(key);

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const last = AGENTS.length - 1;
    const next =
      event.key === 'Home' ? 0 : event.key === 'End' ? last : event.key === 'ArrowRight' ? (index === last ? 0 : index + 1) : index === 0 ? last : index - 1;
    setAgent(AGENTS[next].id);
    tabRefs.current[AGENTS[next].id]?.focus();
  };

  return (
    <section aria-labelledby={`${baseId}-title`} className="flex flex-col gap-6 rounded-2xl border border-line bg-surface/70 p-5 sm:p-7">
      <div className="flex flex-col gap-1">
        <h2 id={`${baseId}-title`} className="text-lg font-semibold tracking-tight">
          Connect your agent
        </h2>
        <p className="text-sm text-muted">
          {apiKey ? 'Two steps. Your key is already filled in.' : `Two steps. Replace ${KEY_PLACEHOLDER} with a key from your dashboard.`}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Agent"
        className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1 [scrollbar-width:none] sm:self-start [&::-webkit-scrollbar]:hidden"
      >
        {AGENTS.map((item, index) => {
          const selected = item.id === agent;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[item.id] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setAgent(item.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`min-h-9 shrink-0 rounded-lg px-3.5 text-sm font-medium transition-colors ${
                selected ? 'bg-ink text-white shadow-sm' : 'text-muted hover:bg-surface hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <ol role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${current.id}`} className="flex flex-col gap-7">
        <Step number={1} title={current.stepTitle ?? (current.language === 'text' ? `Add the connector in ${current.label}` : `Connect ${current.label}`)}>
          <p className="text-sm text-muted">{current.intro}</p>
          <CodeBlock code={current.snippet(key)} label={SNIPPET_LABELS[current.language]} dark />
          {current.steps.length > 1 ? (
            <ul className="flex flex-col gap-1 text-sm text-muted">
              {current.steps.slice(0, -1).map((step) => (
                <li key={step} className="flex gap-2">
                  <span aria-hidden="true" className="text-faint">
                    –
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          ) : null}
        </Step>

        <Step number={2} title="Paste the setup prompt">
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-line py-1.5 pr-1.5 pl-4">
              <span className="text-xs font-medium text-faint">Setup prompt</span>
              <CopyButton text={prompt} label="Copy prompt" onCopied={() => track('sfa_prompt_copied', { agent })} />
            </div>
            <pre
              tabIndex={0}
              aria-label="Setup prompt"
              className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap text-ink"
            >
              {prompt}
            </pre>
          </div>
          <p className="text-sm text-muted">
            {note ?? 'Your agent checks the key, asks for your website, and comes back with three things it can do and what each costs.'}
          </p>
        </Step>
      </ol>
    </section>
  );
};

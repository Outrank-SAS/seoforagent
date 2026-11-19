'use client';

import { useId, useRef, useState } from 'react';
import { AGENTS, KEY_PLACEHOLDER, setupPrompt, type AgentId } from '@/lib/setup';
import { CopyButton } from './CopyButton';
import { CodeBlock } from './ui';

export const PromptCard = ({ apiKey, note }: { apiKey: string | null; note?: string }) => {
  const [agent, setAgent] = useState<AgentId>('claude-code');
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
    <section aria-labelledby={`${baseId}-title`} className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${baseId}-title`} className="text-xl font-semibold">
          Paste this into your agent
        </h2>
        <CopyButton text={prompt} label="Copy prompt" />
      </div>

      <div role="tablist" aria-label="Agent" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
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
              className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors ${
                selected ? 'bg-ink text-white' : 'border border-line bg-white text-ink hover:bg-white/60'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${current.id}`} className="flex flex-col gap-3">
        <p className="text-sm text-muted">{current.intro}</p>
        <CodeBlock code={current.snippet(key)} label={current.language === 'text' ? 'Connector URL' : 'Config'} dark />
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
          {current.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Setup prompt</h3>
        <pre
          tabIndex={0}
          aria-label="Setup prompt"
          className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-line bg-white p-4 font-mono text-sm leading-relaxed"
        >
          {prompt}
        </pre>
        <p className="text-sm text-muted">
          {note ?? (apiKey ? 'The key is already inside, so there is nothing else to configure.' : `Replace ${KEY_PLACEHOLDER} with a key from your dashboard.`)}
        </p>
      </div>
    </section>
  );
};

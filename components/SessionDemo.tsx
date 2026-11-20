'use client';

import { useEffect, useRef, useState } from 'react';
import { TickingCost } from './TickingCost';
import { TerminalBar } from './ui';

const SESSION = [
  {
    tool: 'ai_visibility_check',
    args: '1 prompt, 4 assistants',
    cents: 32,
    result: 'Mentioned in 0 of 4 answers. Most cited: freebeat.ai, cybernews.com, stork.ai',
  },
  {
    tool: 'ai_visibility_diagnose',
    args: 'why you are left out',
    cents: 30,
    result: 'None of the 34 cited pages name you. Plan: publish 3 answer pages, get on 5 cited lists.',
  },
  {
    tool: 'listicles_find',
    args: '"best ai music video generator"',
    cents: 50,
    result: '78 lists rank on Google or are cited by AI. 3 are worth paying to be on.',
  },
];

const STATIC = 99;
const HIDDEN = -1;
const STEP_TIMES_MS = [0, 800, 1700, 2300, 3200, 3800, 4700, 5600];
const LAST_STEP = STEP_TIMES_MS.length - 1;
const POLL_MS = 500;

const reveal = (step: number, index: number): string => `transition-opacity duration-500 ${step >= index ? 'opacity-100' : 'opacity-0'}`;

export const SessionDemo = () => {
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(STATIC);
  const animated = step !== STATIC;

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (node.getBoundingClientRect().top < window.innerHeight * 0.85) return;
    const timers: number[] = [window.setTimeout(() => setStep(HIDDEN), 0)];
    let started = false;
    let poll = 0;
    const play = () => {
      if (started) return;
      started = true;
      observer.disconnect();
      window.clearInterval(poll);
      STEP_TIMES_MS.forEach((at, index) => timers.push(window.setTimeout(() => setStep(index), at + 150)));
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) play();
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    poll = window.setInterval(() => {
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.7 && rect.bottom > 0) play();
    }, POLL_MS);
    return () => {
      observer.disconnect();
      window.clearInterval(poll);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <figure ref={ref} className="mt-8 overflow-hidden rounded-2xl border border-ink/90 bg-ink text-white shadow-[0_24px_48px_-24px_rgba(13,13,18,0.45)]">
      <TerminalBar title="claude · seoforagent" />
      <div className="flex flex-col gap-6 p-5 font-mono text-[13px] leading-relaxed sm:p-7">
        <p className={`text-white ${reveal(step, 0)}`}>
          <span aria-hidden="true" className="mr-2 text-accent">
            ❯
          </span>
          How do I get recommended by ChatGPT for &quot;ai music video generator&quot;?
        </p>
        <ol className="flex flex-col gap-5">
          {SESSION.map((item, index) => {
            const headStep = 1 + index * 2;
            const resultStep = headStep + 1;
            const done = step >= resultStep;
            return (
              <li key={item.tool} className={`flex flex-col gap-1 ${reveal(step, headStep)}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <span>
                    <span aria-hidden="true" className={`mr-2 transition-colors duration-300 ${done ? 'text-[#4ade80]' : 'animate-pulse text-white/40'}`}>
                      ●
                    </span>
                    <span className="text-white">{item.tool}</span>
                    <span className="text-white/40"> {item.args}</span>
                  </span>
                  <TickingCost cents={item.cents} run={animated && done} className={`text-white/60 ${reveal(step, resultStep)}`} />
                </div>
                <p className={`pl-5 text-white/60 ${reveal(step, resultStep)}`}>{item.result}</p>
              </li>
            );
          })}
        </ol>
        <p className={`border-t border-white/10 pt-5 text-white/80 ${reveal(step, LAST_STEP)}`}>
          Here is the plan: I write the three answer pages now, then we pitch stork.ai and cybernews.com, drafts are ready. Spent $1.12, $7.88 of usage left this month.
        </p>
      </div>
      <figcaption className="sr-only">Example session in Claude with SEOforAgent connected</figcaption>
    </figure>
  );
};

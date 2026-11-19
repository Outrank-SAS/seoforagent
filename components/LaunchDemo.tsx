'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { TickingCost } from './TickingCost';
import { Spinner } from './ui';

const STAGE_WIDTH = 1200;
const STAGE_HEIGHT = 675;
const MAX_SCALE = 2;

const PROMPT = "Get my site recommended by ChatGPT for 'ai music video generator'";
const TYPE_START_MS = 1000;
const TYPE_STEP_MS = 50;

const CALLS = [
  { tool: 'ai_visibility_check', args: '1 prompt, 4 assistants', cents: 32, result: 'Mentioned in 0 of 4 answers. Most cited: freebeat.ai, cybernews.com, stork.ai', startMs: 4900, doneMs: 6700 },
  { tool: 'listicles_find', args: '"best ai music video generator"', cents: 50, result: '78 lists found. 3 worth being on.', startMs: 7700, doneMs: 9800 },
  { tool: 'backlinks_suggest', args: 'vs invideo.io, pictory.ai', cents: 28, result: '25 sites link to your competitors, not to you.', startMs: 10800, doneMs: 12700 },
];

const WINDOW_IN_MS = 300;
const PLAN_MS = 13900;
const WINDOW_OUT_MS = 18400;
const FINAL_MS = 19100;
const MARKS_MS = [WINDOW_IN_MS, ...CALLS.flatMap((call) => [call.startMs, call.doneMs]), PLAN_MS, WINDOW_OUT_MS, FINAL_MS];

const subscribeResize = (onChange: () => void) => {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
};

const fitScale = (): number => Math.min(MAX_SCALE, window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT);

const fade = (on: boolean, duration = 'duration-500'): string => `transition-opacity ${duration} ${on ? 'opacity-100' : 'opacity-0'}`;

const Mark = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[76px] w-[76px]">
    <rect width="24" height="24" rx="6" fill="#ffffff" />
    <path d="M7 8.5l3.5 3.5L7 15.5" fill="none" stroke="#0d0d12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="12.5" y="14" width="5" height="2" rx="1" fill="#c2410c" />
  </svg>
);

export const LaunchDemo = () => {
  const scale = useSyncExternalStore(subscribeResize, fitScale, () => 1);
  const [now, setNow] = useState(0);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    const timers = MARKS_MS.map((at) => window.setTimeout(() => setNow(at), at));
    let count = 0;
    let typing = 0;
    const start = window.setTimeout(() => {
      typing = window.setInterval(() => {
        count += 1;
        setTyped(count);
        if (count >= PROMPT.length) window.clearInterval(typing);
      }, TYPE_STEP_MS);
    }, TYPE_START_MS);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(start);
      window.clearInterval(typing);
    };
  }, []);

  const windowOn = now >= WINDOW_IN_MS && now < WINDOW_OUT_MS;
  const finalOn = now >= FINAL_MS;
  const typingDone = typed >= PROMPT.length;

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-ink">
      <div style={{ width: STAGE_WIDTH * scale, height: STAGE_HEIGHT * scale }}>
        <div
          data-testid="launch-stage"
          className="relative origin-top-left overflow-hidden bg-ink text-white"
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-60"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)', backgroundSize: '24px 24px' }}
          />

          <div className={`absolute inset-x-[60px] top-[58px] overflow-hidden rounded-[22px] border border-white/12 bg-panel shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] ${fade(windowOn, 'duration-700')}`}>
            <div className="flex items-center gap-2.5 border-b border-white/10 px-7 py-4">
              <span aria-hidden="true" className="flex gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-white/15" />
                <span className="h-3.5 w-3.5 rounded-full bg-white/15" />
                <span className="h-3.5 w-3.5 rounded-full bg-white/15" />
              </span>
              <span className="ml-3 font-mono text-[15px] text-white/50">claude · seoforagent</span>
            </div>
            <div className="flex h-[494px] flex-col gap-[26px] px-10 py-9 font-mono text-[20px] leading-[1.5]">
              <p className="whitespace-pre text-white">
                <span className="mr-3 text-accent">❯</span>
                {PROMPT.slice(0, typed)}
                <span className={`ml-0.5 inline-block h-[24px] w-[11px] translate-y-[4px] bg-accent ${typingDone ? 'caret' : ''}`} />
              </p>
              {CALLS.map((call) => {
                const started = now >= call.startMs;
                const done = now >= call.doneMs;
                return (
                  <div key={call.tool} className={`flex flex-col gap-1 ${fade(started, 'duration-300')}`}>
                    <div className="flex items-center justify-between gap-6">
                      <span className="flex items-center">
                        <span className="mr-3 flex h-5 w-5 items-center justify-center">
                          {done ? <span className="h-3 w-3 rounded-full bg-[#4ade80]" /> : <Spinner className="h-5 w-5 text-white/70" />}
                        </span>
                        <span className="text-white">{call.tool}</span>
                        <span className="ml-3 text-white/40">{call.args}</span>
                      </span>
                      <TickingCost cents={call.cents} run={done} className={`text-white/70 ${fade(done, 'duration-300')}`} />
                    </div>
                    <p className={`pl-8 whitespace-nowrap text-white/65 ${fade(done)}`}>{call.result}</p>
                  </div>
                );
              })}
              <p className={`mt-auto border-t border-white/10 pt-6 text-white/90 ${fade(now >= PLAN_MS, 'duration-700')}`}>
                Plan: get on stork.ai and cybernews.com first. Pitch drafts are ready. Spent $1.10.
              </p>
            </div>
          </div>

          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-9 ${fade(finalOn, 'duration-1000')}`}>
            <div className="flex items-center gap-5">
              <Mark />
              <span className="text-[52px] font-semibold tracking-[-0.03em]">SEOforAgent</span>
              <span className="mt-3 text-[26px] font-medium text-white/45">by Outrank</span>
            </div>
            <p className="text-[84px] leading-none font-semibold tracking-[-0.04em]">The SEO tool for AI agents</p>
            <p className="flex items-center font-mono text-[30px] text-white/75">
              <span className="mr-4 text-accent">❯</span>
              seoforagent.com
              <span className="caret ml-2 inline-block h-[32px] w-[15px] bg-accent" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

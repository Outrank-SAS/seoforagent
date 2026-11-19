'use client';

import { useEffect, useState } from 'react';

const FRAMES = 14;
const FRAME_MS = 32;

export const formatCents = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

export const TickingCost = ({ cents, run, className = '' }: { cents: number; run: boolean; className?: string }) => {
  const [frame, setFrame] = useState(FRAMES);

  useEffect(() => {
    if (!run) return;
    let current = 0;
    const id = window.setInterval(() => {
      current += 1;
      setFrame(current);
      if (current >= FRAMES) window.clearInterval(id);
    }, FRAME_MS);
    return () => window.clearInterval(id);
  }, [run]);

  return <span className={`tabular-nums ${className}`}>{formatCents(Math.round((cents * Math.min(frame, FRAMES)) / FRAMES))}</span>;
};

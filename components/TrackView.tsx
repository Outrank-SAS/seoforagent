'use client';

import { useEffect } from 'react';
import { track, type TrackProps } from '@/lib/analytics';

export const TrackView = ({ event, tool }: { event: string; tool?: string }) => {
  useEffect(() => {
    const props: TrackProps = tool ? { tool } : {};
    track(event, props);
  }, [event, tool]);
  return null;
};

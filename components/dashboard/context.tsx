'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, type ApiOptions, type Envelope } from '@/lib/api';

export interface DashboardState {
  apiKey: string;
  whoami: Envelope | null;
  whoamiLoading: boolean;
  refreshWhoami: () => Promise<void>;
  signOut: () => void;
}

export const DashboardContext = createContext<DashboardState | null>(null);

export const useDashboard = (): DashboardState => {
  const value = useContext(DashboardContext);
  if (!value) throw new Error('useDashboard must be used inside the dashboard shell.');
  return value;
};

export interface Loaded<T = Record<string, unknown>> {
  loading: boolean;
  envelope: Envelope<T> | null;
  status: number;
  reload: () => void;
}

export const useApiGet = <T = Record<string, unknown>>(path: string | null, query?: ApiOptions['query']): Loaded<T> => {
  const { apiKey } = useDashboard();
  const [state, setState] = useState<{ loading: boolean; envelope: Envelope<T> | null; status: number }>({ loading: true, envelope: null, status: 0 });
  const [tick, setTick] = useState(0);
  const queryKey = JSON.stringify(query ?? {});

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    api<T>(path, { key: apiKey, query: JSON.parse(queryKey) as ApiOptions['query'], signal: controller.signal })
      .then((result) => setState({ loading: false, envelope: result.envelope, status: result.status }))
      .catch(() => undefined);
    return () => controller.abort();
  }, [apiKey, path, queryKey, tick]);

  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, loading: true }));
    setTick((value) => value + 1);
  }, []);
  return { ...state, reload };
};

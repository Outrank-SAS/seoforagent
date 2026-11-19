'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { api, dataOf, errorMessage } from '@/lib/api';
import { pickArray, pickBool, pickString } from '@/lib/pick';
import { buttonDark, inputClass } from '@/lib/styles';
import { Spinner } from '../ui';
import { useApiGet, useDashboard } from './context';
import { Card, EmptyState, ErrorState, Notice, SkeletonRows, relativeTime } from './widgets';

const cleanDomain = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');

export const projectIdOf = (row: Record<string, unknown>): string => pickString(row, ['id', 'project_id', 'product_id']);

export const ProjectsView = () => {
  const id = useId();
  const router = useRouter();
  const { apiKey } = useDashboard();
  const list = useApiGet('/sfa/projects');
  const [domain, setDomain] = useState('');
  const [name, setName] = useState('');
  const [state, setState] = useState<{ busy: boolean; error: string | null; upgradeUrl: string | null }>({ busy: false, error: null, upgradeUrl: null });
  const projects = list.envelope?.ok ? pickArray(dataOf(list.envelope), ['projects', 'rows', 'items']) : [];
  const listArray = list.envelope?.ok && Array.isArray(list.envelope.data) ? (list.envelope.data as Record<string, unknown>[]) : projects;

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = cleanDomain(domain);
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(clean)) {
      setState({ busy: false, error: 'Enter a domain such as example.com.', upgradeUrl: null });
      return;
    }
    setState({ busy: true, error: null, upgradeUrl: null });
    const { envelope } = await api('/sfa/projects', { method: 'POST', key: apiKey, body: { domain: clean, ...(name.trim() ? { name: name.trim() } : {}) } });
    if (envelope.ok) {
      const created = dataOf(envelope);
      const newId = pickString(created, ['id', 'project.id', 'project_id']);
      if (newId) {
        router.push(`/app/projects/${encodeURIComponent(newId)}`);
        return;
      }
      setDomain('');
      setName('');
      setState({ busy: false, error: null, upgradeUrl: null });
      list.reload();
      return;
    }
    setState({
      busy: false,
      error: errorMessage(envelope),
      upgradeUrl: envelope.error?.code === 'PLAN_REQUIRED' ? pickString(envelope.error.details, ['url', 'upgrade_url'], '/app/billing') : null,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>

      <Card title="Your websites">
        {list.loading ? <SkeletonRows /> : null}
        {!list.loading && list.envelope && !list.envelope.ok ? <ErrorState envelope={list.envelope} onRetry={list.reload} what="your projects" /> : null}
        {!list.loading && list.envelope?.ok && listArray.length === 0 ? (
          <EmptyState title="No project yet. Add your website below, or let your agent do it." prompt="Create a SEOforAgent project for my website and fill in its context." />
        ) : null}
        {listArray.length > 0 ? (
          <ul className="divide-y divide-line">
            {listArray.map((project) => {
              const projectId = projectIdOf(project);
              const last = relativeTime(pickString(project, ['last_activity_at', 'updated_at', 'created_at']));
              return (
                <li key={projectId}>
                  <Link href={`/app/projects/${encodeURIComponent(projectId)}`} className="flex min-h-14 flex-wrap items-center justify-between gap-2 py-3 hover:bg-surface sm:px-2">
                    <span>
                      <span className="block font-semibold">{pickString(project, ['domain', 'url', 'name'])}</span>
                      <span className="block text-sm text-muted">{pickString(project, ['name', 'description'])}</span>
                    </span>
                    <span className="text-sm text-muted">
                      {pickBool(project, ['gsc.connected', 'gsc_connected', 'connections.gsc']) ? 'Search Console connected. ' : ''}
                      {last.label ? `Active ${last.label}` : ''}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </Card>

      <Card title="New project">
        <form onSubmit={create} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-domain`} className="text-sm font-medium">
              Domain
            </label>
            <input id={`${id}-domain`} value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="example.com" autoComplete="url" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-name`} className="text-sm font-medium">
              Name (optional)
            </label>
            <input id={`${id}-name`} value={name} onChange={(event) => setName(event.target.value)} placeholder="Acme" className={inputClass} />
          </div>
          <button type="submit" className={buttonDark} disabled={state.busy}>
            {state.busy ? <Spinner /> : null}
            Create project
          </button>
        </form>
        {state.error ? (
          <Notice tone="danger">
            {state.error}{' '}
            {state.upgradeUrl ? (
              <Link href={state.upgradeUrl} className="font-semibold underline">
                See plans with more projects
              </Link>
            ) : null}
          </Notice>
        ) : null}
        <p className="text-sm text-muted">Starter and credit-only accounts have 1 project, Growth 5, Pro 15, Business 50, Agency 200.</p>
      </Card>
    </div>
  );
};

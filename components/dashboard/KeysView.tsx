'use client';

import { useId, useState } from 'react';
import { api, dataOf, errorMessage } from '@/lib/api';
import { pickArray, pickBool, pickString } from '@/lib/pick';
import { buttonDark, buttonPrimary, buttonSecondary, inputClass } from '@/lib/styles';
import { CopyButton } from '../CopyButton';
import { PromptCard } from '../PromptCard';
import { Spinner } from '../ui';
import { useApiGet, useDashboard } from './context';
import { Card, EmptyState, ErrorState, Modal, Notice, SkeletonRows, relativeTime, shortDate } from './widgets';

type Loose = Record<string, unknown>;

export const KeysView = () => {
  const id = useId();
  const { apiKey, signOut } = useDashboard();
  const keys = useApiGet('/sfa/keys');
  const [name, setName] = useState('');
  const [created, setCreated] = useState<string | null>(null);
  const [createState, setCreateState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const [revoking, setRevoking] = useState<Loose | null>(null);
  const [revokeState, setRevokeState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const rows = keys.envelope?.ok ? (Array.isArray(keys.envelope.data) ? (keys.envelope.data as Loose[]) : pickArray(dataOf(keys.envelope), ['keys', 'rows', 'items'])) : [];
  const currentTail = apiKey.slice(-4);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateState({ busy: true, error: null });
    const { envelope } = await api('/sfa/keys', { method: 'POST', key: apiKey, body: { name: name.trim() || 'Agent key' } });
    const newKey = pickString(dataOf(envelope), ['key', 'api_key', 'secret']);
    if (envelope.ok && newKey) {
      setCreated(newKey);
      setName('');
      setCreateState({ busy: false, error: null });
      keys.reload();
      return;
    }
    setCreateState({ busy: false, error: envelope.ok ? 'The new key did not come back. Try again.' : errorMessage(envelope) });
  };

  const revoke = async () => {
    if (!revoking) return;
    const keyId = pickString(revoking, ['id']);
    setRevokeState({ busy: true, error: null });
    const { envelope } = await api(`/sfa/keys/${encodeURIComponent(keyId)}`, { method: 'DELETE', key: apiKey });
    if (!envelope.ok) {
      setRevokeState({ busy: false, error: errorMessage(envelope) });
      return;
    }
    const wasCurrent = pickBool(revoking, ['current']) ?? pickString(revoking, ['key_display']).endsWith(currentTail);
    setRevoking(null);
    setRevokeState({ busy: false, error: null });
    if (wasCurrent) {
      signOut();
      return;
    }
    keys.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Keys</h1>

      {created ? (
        <section aria-labelledby="new-key" className="flex flex-col gap-4 rounded-2xl border border-accent bg-white p-5">
          <h2 id="new-key" className="text-lg font-semibold">
            Your new key
          </h2>
          <Notice tone="warn">Copy it now. For your security it is shown only once.</Notice>
          <div className="flex flex-col gap-3 rounded-xl bg-ink p-3 pl-4 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 font-mono text-sm break-all text-white">{created}</code>
            <CopyButton text={created} variant="dark" />
          </div>
          <PromptCard apiKey={created} />
          <div>
            <button type="button" className={buttonSecondary} onClick={() => setCreated(null)}>
              I saved it
            </button>
          </div>
        </section>
      ) : null}

      <Card title="Create a key">
        <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor={`${id}-name`} className="text-sm font-medium">
              Name, so you can tell keys apart
            </label>
            <input id={`${id}-name`} value={name} maxLength={60} onChange={(event) => setName(event.target.value)} placeholder="Claude Code on my laptop" className={inputClass} />
          </div>
          <button type="submit" className={buttonDark} disabled={createState.busy}>
            {createState.busy ? <Spinner /> : null}
            Create key
          </button>
        </form>
        {createState.error ? <Notice tone="danger">{createState.error}</Notice> : null}
        <p className="text-sm text-muted">Every key draws on the same balance and shows up separately in the activity feed. Use one per agent or person.</p>
      </Card>

      <Card title="API keys">
        {keys.loading ? <SkeletonRows /> : null}
        {!keys.loading && keys.envelope && !keys.envelope.ok ? <ErrorState envelope={keys.envelope} onRetry={keys.reload} what="your keys" /> : null}
        {!keys.loading && keys.envelope?.ok && rows.length === 0 ? <EmptyState title="No keys listed yet." /> : null}
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <caption className="sr-only">API keys</caption>
              <thead>
                <tr className="text-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Name
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Key
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Created
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Last used
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const display = pickString(row, ['key_display', 'suffix', 'display', 'prefix']);
                  const current = pickBool(row, ['current']) ?? display.endsWith(currentTail);
                  const lastUsed = relativeTime(pickString(row, ['last_used_at']));
                  return (
                    <tr key={pickString(row, ['id'], String(index))} className="border-t border-line">
                      <td className="py-2 pr-3 font-medium">
                        {pickString(row, ['name'], 'Key')}
                        {current ? <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs text-muted">This browser</span> : null}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">{display}</td>
                      <td className="py-2 pr-3 text-muted">{shortDate(pickString(row, ['created_at']))}</td>
                      <td className="py-2 pr-3 text-muted">{lastUsed.label ? <time title={lastUsed.exact}>{lastUsed.label}</time> : 'Never'}</td>
                      <td className="py-2 text-right">
                        <button type="button" className="min-h-11 px-2 text-sm font-medium text-danger underline" onClick={() => setRevoking(row)}>
                          Revoke
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Modal open={!!revoking} title="Revoke this key?" onClose={() => setRevoking(null)}>
        {revoking ? (
          <div className="flex flex-col gap-4">
            <p>
              <span className="font-mono">{pickString(revoking, ['key_display', 'suffix', 'display'])}</span> stops working right away. Agents using it will get an error until
              you give them another key.
            </p>
            {(pickBool(revoking, ['current']) ?? pickString(revoking, ['key_display']).endsWith(currentTail)) ? <Notice tone="warn">This browser uses this key, so you will be signed out.</Notice> : null}
            {revokeState.error ? <Notice tone="danger">{revokeState.error}</Notice> : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className={buttonSecondary} onClick={() => setRevoking(null)}>
                Keep it
              </button>
              <button type="button" className={`${buttonPrimary} bg-danger hover:bg-danger`} onClick={revoke} disabled={revokeState.busy}>
                {revokeState.busy ? <Spinner /> : null}
                Revoke key
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

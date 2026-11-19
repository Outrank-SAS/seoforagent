'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, dataOf, errorMessage } from '@/lib/api';
import { getPendingKey, isSfaKey, promotePendingKey, setActiveKey } from '@/lib/keys';
import { pickBool, pickString } from '@/lib/pick';
import { buttonDark, buttonSecondary } from '@/lib/styles';
import { Lockup } from '../Lockup';
import { Spinner } from '../ui';

type State = { name: 'working' } | { name: 'signed_in' } | { name: 'confirmed'; promoted: boolean } | { name: 'error'; message: string };

export const AuthView = () => {
  const router = useRouter();
  const [state, setState] = useState<State>({ name: 'working' });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const run = async () => {
      const token = new URLSearchParams(window.location.search).get('token');
      window.history.replaceState(null, '', window.location.pathname);
      if (!token) {
        setState({ name: 'error', message: 'This link is missing its token. Ask for a new sign-in link.' });
        return;
      }
      const { envelope } = await api('/sfa/auth/exchange', { method: 'POST', body: { token } });
      if (!envelope.ok) {
        setState({ name: 'error', message: `${errorMessage(envelope)} Links work once and for 30 minutes.` });
        return;
      }
      const data = dataOf(envelope);
      const purpose = pickString(data, ['purpose']);
      const key = pickString(data, ['key', 'api_key']);
      if (key && purpose !== 'confirm_activation') {
        setActiveKey(key);
        setState({ name: 'signed_in' });
        router.replace('/app');
        return;
      }
      if (pickBool(data, ['activated']) || purpose === 'confirm_activation') {
        const pending = getPendingKey();
        const promoted = isSfaKey(pending);
        if (promoted) promotePendingKey(pending);
        setState({ name: 'confirmed', promoted });
        return;
      }
      setState({ name: 'error', message: 'This link did not sign you in. Ask for a new one.' });
    };
    void run();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-6">
        <Lockup />
      </header>
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-10">
        {state.name === 'working' || state.name === 'signed_in' ? (
          <p className="flex items-center gap-2 text-lg" role="status">
            <Spinner /> {state.name === 'working' ? 'Checking your link' : 'Signed in. Opening the dashboard'}
          </p>
        ) : null}
        {state.name === 'confirmed' ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6">
            <h1 className="text-2xl font-semibold">Your key is active</h1>
            <p className="text-muted">
              {state.promoted
                ? 'Thanks for confirming. The key in this browser now works, and your agent can use it right away.'
                : 'Thanks for confirming. The key you paid for now works. Go back to your agent and say: done.'}
            </p>
            <div className="flex flex-wrap gap-3">
              {state.promoted ? (
                <Link href="/app" className={buttonDark}>
                  Open dashboard
                </Link>
              ) : null}
              <Link href="/" className={buttonSecondary}>
                Back to the homepage
              </Link>
            </div>
          </div>
        ) : null}
        {state.name === 'error' ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6">
            <h1 className="text-2xl font-semibold">This link did not work</h1>
            <p className="text-muted">{state.message}</p>
            <div>
              <Link href="/app" className={buttonDark}>
                Sign in another way
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

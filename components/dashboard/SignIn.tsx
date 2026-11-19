'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { setActiveKey } from '@/lib/keys';
import { buttonDark, buttonSecondary, inputClass } from '@/lib/styles';
import { Lockup } from '../Lockup';
import { Spinner } from '../ui';

export const SignIn = ({ onSignedIn }: { onSignedIn: (key: string) => void }) => {
  const id = useId();
  const [key, setKey] = useState('');
  const [keyState, setKeyState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const [email, setEmail] = useState('');
  const [emailState, setEmailState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');

  const submitKey = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = key.trim();
    if (trimmed.length < 16) {
      setKeyState({ busy: false, error: 'Paste the whole key. It starts with sfa_live_ or, for Outrank keys, with its own prefix.' });
      return;
    }
    setKeyState({ busy: true, error: null });
    const { envelope, status } = await api('/sfa/whoami', { key: trimmed });
    if (envelope.ok) {
      setActiveKey(trimmed);
      onSignedIn(trimmed);
      return;
    }
    setKeyState({
      busy: false,
      error: status === 401 || status === 403 ? 'This key does not work. Check that you copied all of it, or get a new one by email below.' : errorMessage(envelope),
    });
  };

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailState('error');
      return;
    }
    setEmailState('busy');
    await api('/sfa/auth/email-link', { method: 'POST', body: { email: email.trim(), return_origin: window.location.origin } });
    setEmailState('sent');
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-6">
        <Lockup />
      </header>
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-muted">
            New here? You do not need an account to start.{' '}
            <Link href="/" className="font-medium text-ink underline">
              Get a key on the homepage
            </Link>
            .
          </p>
        </div>

        <form onSubmit={submitKey} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5" noValidate>
          <label htmlFor={`${id}-key`} className="font-semibold">
            Paste your API key
          </label>
          <input
            id={`${id}-key`}
            value={key}
            onChange={(event) => setKey(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="sfa_live_..."
            aria-invalid={!!keyState.error}
            aria-describedby={keyState.error ? `${id}-key-error` : undefined}
            className={`${inputClass} font-mono text-sm`}
          />
          {keyState.error ? (
            <p id={`${id}-key-error`} className="text-sm text-danger">
              {keyState.error}
            </p>
          ) : null}
          <button type="submit" className={buttonDark} disabled={keyState.busy}>
            {keyState.busy ? <Spinner /> : null}
            Sign in with this key
          </button>
          <p className="text-sm text-muted">The key stays in this browser. An Outrank API key works too.</p>
        </form>

        <form onSubmit={submitEmail} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5" noValidate>
          <label htmlFor={`${id}-email`} className="font-semibold">
            Email me a sign-in link
          </label>
          {emailState === 'sent' ? (
            <p role="status" className="rounded-lg bg-ok-soft p-3 text-sm text-ok">
              If that email has an account, a sign-in link is on its way. It works for 30 minutes and creates a new key for this browser.
            </p>
          ) : (
            <>
              <input
                id={`${id}-email`}
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (emailState === 'error') setEmailState('idle');
                }}
                autoComplete="email"
                placeholder="you@company.com"
                aria-invalid={emailState === 'error'}
                aria-describedby={emailState === 'error' ? `${id}-email-error` : undefined}
                className={inputClass}
              />
              {emailState === 'error' ? (
                <p id={`${id}-email-error`} className="text-sm text-danger">
                  Enter a valid email address.
                </p>
              ) : null}
              <button type="submit" className={buttonSecondary} disabled={emailState === 'busy'}>
                {emailState === 'busy' ? <Spinner /> : null}
                Send the link
              </button>
            </>
          )}
          <p className="text-sm text-muted">Use the email you paid with on Stripe, or your Outrank email.</p>
        </form>
      </main>
    </div>
  );
};

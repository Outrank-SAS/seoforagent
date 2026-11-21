'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { api, dataOf, errorMessage } from '@/lib/api';
import { getActiveKey, setActiveKey, signOut } from '@/lib/keys';
import { OAUTH_RETURN_STORAGE } from '@/lib/config';
import { pickString } from '@/lib/pick';
import { buttonDark, buttonSecondary, inputClass } from '@/lib/styles';
import { Lockup } from './Lockup';
import { Spinner } from './ui';

type Request = { clientName: string; redirectHost: string; resource: string };
type Account = { key: string; email: string };
type Stage =
  | { name: 'loading' }
  | { name: 'invalid'; message: string }
  | { name: 'sign_in' }
  | { name: 'consent'; account: Account }
  | { name: 'redirecting' };

const AUTHORIZE_PATH = '/sfa/oauth/authorize';
const LISTED_RESOURCE_SUFFIXES = ['/mcp/chatgpt', '/mcp/claude'];

const readParams = (): Record<string, string> => {
  const params: Record<string, string> = {};
  new URLSearchParams(window.location.search).forEach((value, key) => {
    params[key] = value;
  });
  return params;
};

const loadAccount = async (key: string): Promise<Account | null> => {
  const { envelope } = await api('/sfa/whoami', { key });
  if (!envelope.ok) return null;
  return { key, email: pickString(dataOf(envelope), ['account.email', 'email'], 'your account') };
};

export const OAuthConsent = () => {
  const id = useId();
  const [stage, setStage] = useState<Stage>({ name: 'loading' });
  const [request, setRequest] = useState<Request | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState('');
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const run = async () => {
      const { envelope } = await api(AUTHORIZE_PATH, { method: 'POST', body: { params: readParams() } });
      const data = dataOf(envelope);
      if (!envelope.ok) {
        setStage({ name: 'invalid', message: errorMessage(envelope) });
        return;
      }
      if (data.valid !== true) {
        const redirect = pickString(data, ['redirect']);
        if (redirect) {
          setStage({ name: 'redirecting' });
          window.location.assign(redirect);
          return;
        }
        setStage({ name: 'invalid', message: pickString(data, ['message'], 'This connection request is not valid.') });
        return;
      }
      setRequest({
        clientName: pickString(data, ['client_name'], 'An app'),
        redirectHost: pickString(data, ['redirect_host']),
        resource: pickString(data, ['resource']),
      });
      const stored = getActiveKey();
      const account = stored ? await loadAccount(stored) : null;
      setStage(account ? { name: 'consent', account } : { name: 'sign_in' });
    };
    void run();
  }, []);

  const decide = async (decision: 'approve' | 'deny', account?: Account) => {
    setBusy(true);
    setError(null);
    const { envelope } = await api(AUTHORIZE_PATH, {
      method: 'POST',
      key: account?.key,
      body: { params: readParams(), decision },
    });
    const redirect = pickString(dataOf(envelope), ['redirect']);
    if (envelope.ok && redirect) {
      setStage({ name: 'redirecting' });
      window.location.assign(redirect);
      return;
    }
    setBusy(false);
    setError(errorMessage(envelope));
  };

  const submitKey = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const account = await loadAccount(key.trim());
    setBusy(false);
    if (!account) {
      setError('This key does not work. Check that you copied all of it, or get a sign-in link by email.');
      return;
    }
    setActiveKey(account.key);
    setStage({ name: 'consent', account });
  };

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      window.localStorage.setItem(OAUTH_RETURN_STORAGE, JSON.stringify({ url: window.location.href, at: Date.now() }));
    } catch {
      setError('This browser blocks storage, so the email link cannot bring you back here. Paste your API key instead.');
      setBusy(false);
      return;
    }
    await api('/sfa/auth/email-link', { method: 'POST', body: { email: email.trim(), return_origin: window.location.origin } });
    setBusy(false);
    setEmailSent(true);
  };

  const switchAccount = () => {
    signOut();
    setError(null);
    setStage({ name: 'sign_in' });
  };

  const listed = request ? LISTED_RESOURCE_SUFFIXES.some((suffix) => request.resource.endsWith(suffix)) : false;
  const appName = request?.clientName ?? 'This app';

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-6">
        <Lockup />
      </header>
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-8">
        {stage.name === 'loading' || stage.name === 'redirecting' ? (
          <p className="flex items-center gap-2 text-lg" role="status">
            <Spinner /> {stage.name === 'loading' ? 'Checking the connection request' : `Returning to ${appName}`}
          </p>
        ) : null}

        {stage.name === 'invalid' ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6">
            <h1 className="text-2xl font-semibold">This connection request did not work</h1>
            <p className="text-muted">{stage.message}</p>
            <p className="text-muted">Start the connection again from the app.</p>
          </div>
        ) : null}

        {stage.name === 'sign_in' && request ? (
          <>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Connect {appName} to SEOforAgent</h1>
              <p className="mt-2 text-muted">Sign in to choose the SEOforAgent account {appName} will use.</p>
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
                className={`${inputClass} font-mono text-sm`}
              />
              <button type="submit" className={buttonDark} disabled={busy || key.trim().length < 16}>
                {busy ? <Spinner /> : null}
                Continue
              </button>
              <p className="text-sm text-muted">Your key is only used to sign you in. {appName} gets its own key, which you can revoke.</p>
            </form>
            <form onSubmit={submitEmail} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5" noValidate>
              <label htmlFor={`${id}-email`} className="font-semibold">
                Or email me a sign-in link
              </label>
              {emailSent ? (
                <p role="status" className="rounded-lg bg-ok-soft p-3 text-sm text-ok">
                  If that email has an account, a sign-in link is on its way. Open it in this browser and you will come back here.
                </p>
              ) : (
                <>
                  <input
                    id={`${id}-email`}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="you@company.com"
                    className={inputClass}
                  />
                  <button type="submit" className={buttonSecondary} disabled={busy}>
                    Send the link
                  </button>
                </>
              )}
            </form>
            <p className="text-sm text-muted">
              No account yet?{' '}
              <a href="/" target="_blank" rel="noopener" className="font-medium text-ink underline">
                Start on seoforagent.com
              </a>
              , then come back to this page.
            </p>
          </>
        ) : null}

        {stage.name === 'consent' && request ? (
          <div className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Allow {appName} to use SEOforAgent?</h1>
              <p className="mt-2 text-muted">
                Signed in as <span className="font-medium text-ink">{stage.account.email}</span>.{' '}
                <button type="button" onClick={switchAccount} className="font-medium text-ink underline">
                  Use another account
                </button>
              </p>
            </div>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
              <li>Read and change your projects, rank tracking and saved results.</li>
              <li>Run SEO research, rank checks and AI visibility checks. Paid tools use your included usage or credit, within your spend limits.</li>
              {listed ? null : <li>Buy backlinks and listicle placements from your backlink credits when you ask it to.</li>}
              <li>Read Google Search Console data for projects where you connected it.</li>
            </ul>
            <p className="text-sm text-muted">
              {appName} gets its own key. You can disconnect it at any time on the Keys page of your dashboard.
              {request.redirectHost ? ` You will return to ${request.redirectHost}.` : ''}
            </p>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex flex-wrap gap-3">
              <button type="button" className={buttonDark} disabled={busy} onClick={() => decide('approve', stage.account)}>
                {busy ? <Spinner /> : null}
                Allow
              </button>
              <button type="button" className={buttonSecondary} disabled={busy} onClick={() => decide('deny')}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {error && stage.name === 'sign_in' ? <p className="text-sm text-danger">{error}</p> : null}
      </main>
    </div>
  );
};

'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { dataOf } from '@/lib/api';
import { buttonPrimary, buttonSecondary } from '@/lib/styles';
import { useApiGet } from './context';
import { bestSiteForProject, formatCount, GSC_PATH, plural, propertyTypeLabel, readOverview, readState } from './search-console';
import { ChangeText } from './SearchConsoleView';
import { Card, ErrorState, SkeletonRows } from './widgets';

const DAYS = 28;

const useSearchConsoleSummary = () => {
  const stateCall = useApiGet('/sfa/gsc');
  const overviewCall = useApiGet('/sfa/gsc/overview', { days: DAYS });
  const state = useMemo(() => (stateCall.envelope?.ok ? readState(dataOf(stateCall.envelope)) : null), [stateCall.envelope]);
  const overview = useMemo(
    () => (state?.connected && overviewCall.envelope?.ok ? readOverview(dataOf(overviewCall.envelope), state) : null),
    [overviewCall.envelope, state],
  );
  return { stateCall, overviewCall, state, overview };
};

const Metric = ({ label, value, change }: { label: string; value: string; change: React.ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-surface p-3">
    <dt className="text-xs text-muted">{label}</dt>
    <dd className="font-mono text-xl font-semibold">{value}</dd>
    <dd className="text-xs">{change}</dd>
  </div>
);

export const ProjectSearchConsoleCard = ({ projectId, domain }: { projectId: string; domain: string }) => {
  const { stateCall, overviewCall, state, overview } = useSearchConsoleSummary();
  const match = state ? bestSiteForProject(projectId, state, overview) : null;

  return (
    <Card
      title="Search Console"
      action={
        match ? (
          <Link href={`${GSC_PATH}?site=${encodeURIComponent(match.site.siteUrl)}`} className="inline-flex min-h-11 items-center text-sm font-medium underline">
            Open in Search Console
          </Link>
        ) : null
      }
    >
      {stateCall.loading && !state ? <SkeletonRows rows={2} /> : null}
      {!stateCall.loading && stateCall.envelope && !stateCall.envelope.ok ? <ErrorState envelope={stateCall.envelope} onRetry={stateCall.reload} what="Search Console" /> : null}
      {state && !state.connected ? (
        <>
          <p className="text-muted">See real clicks, impressions and positions for this site, free. Your agent reads them too.</p>
          <div>
            <Link href={GSC_PATH} className={buttonPrimary}>
              Connect Google Search Console
            </Link>
          </div>
        </>
      ) : null}
      {state?.connected && !match ? (
        <p className="text-muted">
          No Search Console property matches {domain || 'this project'}. Add the site in Google Search Console, or connect the Google account that owns it.{' '}
          <Link href={GSC_PATH} className="font-medium text-ink underline">
            Manage Search Console
          </Link>
        </p>
      ) : null}
      {state?.connected && match ? (
        <>
          <p className="-mt-2 text-sm text-muted">
            {match.site.domain}, {propertyTypeLabel(match.site.propertyType).toLowerCase()}. Last {DAYS} days compared with the {DAYS} days before.
          </p>
          {overviewCall.loading && !overview ? <SkeletonRows rows={1} /> : null}
          {!overviewCall.loading && overviewCall.envelope && !overviewCall.envelope.ok ? <ErrorState envelope={overviewCall.envelope} onRetry={overviewCall.reload} what="the numbers" /> : null}
          {match.row && match.row.ok ? (
            <dl className="grid grid-cols-2 gap-3">
              <Metric label="Clicks" value={formatCount(match.row.clicks)} change={<ChangeText change={match.row.clicksChange} />} />
              <Metric label="Impressions" value={formatCount(match.row.impressions)} change={<ChangeText change={match.row.impressionsChange} />} />
            </dl>
          ) : null}
          {match.row && !match.row.ok ? <p className="text-sm text-muted">{match.row.error || 'Google did not return data for this site.'}</p> : null}
        </>
      ) : null}
    </Card>
  );
};

export const OverviewSearchConsoleCard = () => {
  const { stateCall, overviewCall, state, overview } = useSearchConsoleSummary();

  if (stateCall.loading && !state) {
    return (
      <Card title="Search Console">
        <SkeletonRows rows={1} />
      </Card>
    );
  }
  if (!state) return null;

  if (!state.connected) {
    return (
      <section aria-labelledby="overview-gsc-title" className="flex flex-col gap-4 rounded-2xl border-2 border-accent/30 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="overview-gsc-title" className="text-lg font-semibold">
            Connect Google Search Console
          </h2>
          <p className="text-muted">Real clicks, impressions and positions for every site you own, free. Your agent reads them too.</p>
        </div>
        <Link href={GSC_PATH} className={buttonPrimary}>
          Connect with Google
        </Link>
      </section>
    );
  }

  return (
    <Card
      title={`Search Console, last ${DAYS} days`}
      action={
        <Link href={GSC_PATH} className={`${buttonSecondary} min-h-11 px-4 text-sm`}>
          Open Search Console
        </Link>
      }
    >
      {overviewCall.loading && !overview ? <SkeletonRows rows={1} /> : null}
      {!overviewCall.loading && overviewCall.envelope && !overviewCall.envelope.ok ? <ErrorState envelope={overviewCall.envelope} onRetry={overviewCall.reload} what="your Search Console numbers" /> : null}
      {overview ? (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <Metric label="Clicks" value={formatCount(overview.clicks)} change={<ChangeText change={overview.clicksChange} />} />
            <Metric label="Impressions" value={formatCount(overview.impressions)} change={<ChangeText change={overview.impressionsChange} />} />
          </dl>
          <p className="text-sm text-muted">
            {state.sites.length === 1 ? 'Your site' : `All ${plural(state.sites.length, 'site', 'sites')} together`}, compared with the {DAYS} days before.
          </p>
        </>
      ) : null}
    </Card>
  );
};

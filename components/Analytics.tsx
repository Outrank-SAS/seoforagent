import Script from 'next/script';
import { POSTHOG_KEY, REWARDFUL_KEY } from '@/lib/config';
import { REWARDFUL_QUEUE, posthogInit } from '@/lib/snippets';

export const Analytics = () => (
  <>
    {POSTHOG_KEY ? (
      <Script id="posthog" strategy="afterInteractive">
        {posthogInit(POSTHOG_KEY)}
      </Script>
    ) : null}
    {REWARDFUL_KEY ? (
      <>
        <Script id="rewardful-queue" strategy="afterInteractive">
          {REWARDFUL_QUEUE}
        </Script>
        <Script id="rewardful" src="https://r.wdfl.co/rw.js" data-rewardful={REWARDFUL_KEY} strategy="afterInteractive" />
      </>
    ) : null}
  </>
);

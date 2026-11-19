import type { Metadata } from 'next';
import { KeyFlow } from '@/components/KeyFlow';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { fetchPricing } from '@/lib/pricing';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Activate your API key',
  description: 'Choose a plan or buy credit once on Stripe to activate your SEOforAgent API key. The key works as soon as you pay.',
  alternates: { canonical: '/activate' },
  robots: { index: false, follow: true },
};

const ActivatePage = async () => {
  const pricing = await fetchPricing();
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-10 sm:px-6 sm:pt-14">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Activate your API key</h1>
          <p className="text-lg text-muted">Pick a plan or buy credit once. Stripe handles the payment and the key works the moment it is confirmed.</p>
        </div>
        <KeyFlow
          mode="activate"
          plans={pricing.plans}
          presetsUsd={pricing.credit.presetsUsd}
          minUsd={pricing.credit.minUsd}
          maxUsd={pricing.credit.maxUsd}
        />
      </main>
      <SiteFooter />
    </>
  );
};

export default ActivatePage;

import type { Metadata } from 'next';
import { OAuthConsent } from '@/components/OAuthConsent';

export const metadata: Metadata = {
  title: 'Connect an app',
  description: 'Allow an AI app to use your SEOforAgent account.',
  robots: { index: false, follow: false },
};

const Page = () => <OAuthConsent />;

export default Page;

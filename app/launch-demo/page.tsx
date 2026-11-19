import type { Metadata } from 'next';
import { LaunchDemo } from '@/components/LaunchDemo';

export const metadata: Metadata = {
  title: 'Launch demo',
  description: 'A 25-second recording of an agent using SEOforAgent.',
  robots: { index: false, follow: false },
};

const LaunchDemoPage = () => <LaunchDemo />;

export default LaunchDemoPage;

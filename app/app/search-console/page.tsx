import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchConsoleView } from '@/components/dashboard/SearchConsoleView';
import { SkeletonRows } from '@/components/dashboard/widgets';

export const metadata: Metadata = { title: 'Search Console', description: 'Real clicks, impressions and positions from Google Search Console for every site you own.' };

const Page = () => (
  <Suspense fallback={<SkeletonRows rows={4} />}>
    <SearchConsoleView />
  </Suspense>
);

export default Page;

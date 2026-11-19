import type { Metadata } from 'next';
import { OverviewView } from '@/components/dashboard/OverviewView';

export const metadata: Metadata = { title: { absolute: 'Overview | SEOforAgent dashboard' }, description: 'What your agent did, what it cost, and how much usage is left.' };

const Page = () => <OverviewView />;

export default Page;

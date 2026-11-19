import type { Metadata } from 'next';
import { BillingView } from '@/components/dashboard/BillingView';

export const metadata: Metadata = { title: 'Plan and credit', description: 'Your plan, credit, spend limits and ledger.' };

const Page = () => <BillingView />;

export default Page;

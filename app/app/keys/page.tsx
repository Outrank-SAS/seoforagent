import type { Metadata } from 'next';
import { KeysView } from '@/components/dashboard/KeysView';

export const metadata: Metadata = { title: 'Keys', description: 'Create and revoke API keys.' };

const Page = () => <KeysView />;

export default Page;

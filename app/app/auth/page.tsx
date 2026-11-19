import type { Metadata } from 'next';
import { AuthView } from '@/components/dashboard/AuthView';

export const metadata: Metadata = { title: 'Signing in', description: 'Finishing sign-in from an email link.' };

const Page = () => <AuthView />;

export default Page;

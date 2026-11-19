import type { Metadata } from 'next';
import { DashboardShell } from '@/components/dashboard/Shell';

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s | SEOforAgent dashboard' },
  description: 'See what your agent did and what it cost, manage your plan, credit, projects, backlinks and API keys.',
  robots: { index: false, follow: false },
};

const DashboardLayout = ({ children }: { children: React.ReactNode }) => <DashboardShell>{children}</DashboardShell>;

export default DashboardLayout;

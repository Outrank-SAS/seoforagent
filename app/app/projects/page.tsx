import type { Metadata } from 'next';
import { ProjectsView } from '@/components/dashboard/ProjectsView';

export const metadata: Metadata = { title: 'Projects', description: 'Your websites and their SEO context.' };

const Page = () => <ProjectsView />;

export default Page;

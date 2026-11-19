import type { Metadata } from 'next';
import { ProjectView } from '@/components/dashboard/ProjectView';

export const metadata: Metadata = { title: 'Project', description: 'Rankings, listicles and backlinks for one website.' };

const Page = () => <ProjectView />;

export default Page;

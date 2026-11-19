import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { buttonPrimary } from '@/lib/styles';

const SharedNotFound = () => (
  <>
    <SiteHeader />
    <main id="main" className="mx-auto flex max-w-3xl flex-col items-start gap-5 px-4 pt-20 sm:px-6 sm:pt-28">
      <p className="font-mono text-[13px] text-muted">
        <span aria-hidden="true" className="mr-2 text-accent">
          ❯
        </span>
        404
      </p>
      <h1 className="text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-5xl">This result is not shared</h1>
      <p className="max-w-xl text-lg text-muted">The link is wrong, or its owner stopped sharing it. You can run the same check on your own site.</p>
      <Link href="/" className={`${buttonPrimary} min-h-12`}>
        Try it on your site
        <span aria-hidden="true">→</span>
      </Link>
    </main>
    <SiteFooter />
  </>
);

export default SharedNotFound;

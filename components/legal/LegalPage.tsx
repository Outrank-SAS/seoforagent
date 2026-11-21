import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { SUPPORT_EMAIL } from '@/lib/config';

export const LEGAL_LAST_UPDATED = 'November 21, 2026';
export const COMPANY_LEGAL_NAME = 'Outrank SAS';
export const COMPANY_LEGAL_FORM = 'société par actions simplifiée';
export const COMPANY_REGISTRATION = 'SIREN 988 048 575';
export const COMPANY_VAT = 'VAT FR46 988 048 575';
export const COMPANY_ADDRESS = 'Bureau 326, 59 Rue de Ponthieu, 75008 Paris, France';

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

export const SupportLink = () => <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;

export const LegalPage = ({ title, intro, sections }: { title: string; intro: React.ReactNode; sections: LegalSection[] }) => (
  <>
    <SiteHeader />
    <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <nav aria-label={title} className="flex flex-col gap-0.5 text-sm">
          <p className="px-3 pb-2 text-xs font-medium text-faint">On this page</p>
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-muted transition-colors hover:bg-surface hover:text-ink lg:min-h-9"
            >
              {section.title}
            </a>
          ))}
        </nav>
      </aside>

      <main id="main" className="prose-docs min-w-0 max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-faint">Last updated: {LEGAL_LAST_UPDATED}</p>
        <div className="text-lg">{intro}</div>
        {sections.map((section) => (
          <section key={section.id} aria-labelledby={section.id}>
            <h2 id={section.id}>{section.title}</h2>
            {section.body}
          </section>
        ))}
      </main>
    </div>
    <SiteFooter />
  </>
);

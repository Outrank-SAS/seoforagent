import type { Metadata } from 'next';
import Link from 'next/link';
import { COMPANY_ADDRESS, COMPANY_LEGAL_FORM, COMPANY_LEGAL_NAME, COMPANY_REGISTRATION, COMPANY_VAT, LegalPage, SupportLink, type LegalSection } from '@/components/legal/LegalPage';
import { GITHUB_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms for using SEOforAgent, run by Outrank SAS: accounts and API keys, agents, prepaid billing, backlinks and listicle placements, acceptable use and liability.',
  alternates: { canonical: '/terms' },
  openGraph: { title: 'SEOforAgent Terms of Service', url: '/terms' },
};

const SECTIONS: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: (
      <p>
        SEOforAgent (seoforagent.com) is run by {COMPANY_LEGAL_NAME}, a French <em>{COMPANY_LEGAL_FORM}</em>, {COMPANY_REGISTRATION}, {COMPANY_VAT}, with registered office at{' '}
        {COMPANY_ADDRESS}. {COMPANY_LEGAL_NAME} also runs <a href="https://www.outrank.so">outrank.so</a>. In these terms, &quot;we&quot; and &quot;us&quot; mean{' '}
        {COMPANY_LEGAL_NAME}, and &quot;you&quot; means the person or organization using SEOforAgent.
      </p>
    ),
  },
  {
    id: 'the-service',
    title: 'The service',
    body: (
      <>
        <p>
          SEOforAgent gives AI agents such as Claude, ChatGPT, Codex and Cursor SEO tools over MCP and a REST API: keyword and Google results data, domain and backlink data,
          rank tracking, AI visibility checks, a diagnosis of why a brand is left out of AI answers, a listicle hunt, Google Search Console reading if you connect it, and buying
          backlinks and listicle placements through Outrank from prepaid credit.
        </p>
        <p>SEOforAgent is by Outrank. It runs on Outrank&apos;s infrastructure, and your account is an Outrank organization.</p>
      </>
    ),
  },
  {
    id: 'accounts-and-keys',
    title: 'Accounts and API keys',
    body: (
      <>
        <p>
          You get an account by paying for a plan or one-time credit on Stripe, or through an existing Outrank account. You sign in with an API key or an emailed sign-in link.
          Connecting ChatGPT or Claude uses OAuth and creates an API key for that app.
        </p>
        <ul>
          <li>Keep your API keys secret. Anyone who has a key can use your account and spend your balance.</li>
          <li>You are responsible for everything done with your keys, including by the agents and apps you connect.</li>
          <li>
            If a key leaks, revoke it right away on the <Link href="/app/keys">Keys page</Link> of the dashboard.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'agents',
    title: 'Agents act on your instructions',
    body: (
      <>
        <p>
          The agents you connect call SEOforAgent on your behalf. We treat their calls as your instructions. Some calls spend money, such as buying a backlink or a listicle
          placement.
        </p>
        <p>
          You are responsible for confirming paid actions before your agent takes them. Use the per-call and daily spend limits in{' '}
          <Link href="/app/billing">Plan and credit</Link> to cap what an agent can spend.
        </p>
      </>
    ),
  },
  {
    id: 'pricing-and-billing',
    title: 'Pricing and billing',
    body: (
      <ul>
        <li>
          Prices are in US dollars and listed on the <Link href="/pricing">pricing page</Link>. Payments are handled by Stripe.
        </li>
        <li>SEOforAgent is prepaid. Paid tool calls are deducted from the usage included in your plan first, then from your credit.</li>
        <li>Monthly plans renew each month until you cancel. You can cancel at any time from billing in the dashboard. A cancelled plan runs until the end of the period.</li>
        <li>One-time credit does not expire and does not reset.</li>
        <li>Credit that has been spent is non-refundable.</li>
        <li>
          We may refund unused credit at our discretion if you ask within 14 days of buying it. Write to <SupportLink />.
        </li>
        <li>Nothing in these terms limits the rights you have under consumer law.</li>
      </ul>
    ),
  },
  {
    id: 'backlinks-and-listicles',
    title: 'Backlinks and listicle placements',
    body: (
      <ul>
        <li>Backlinks and listicle placements are bought through Outrank and published on third-party sites. We do not control those sites.</li>
        <li>We do not guarantee any rankings, traffic or mentions in AI answers.</li>
        <li>
          A link that is lost is refunded in credits, as described on the <Link href="/pricing">pricing page</Link>.
        </li>
      </ul>
    ),
  },
  {
    id: 'ai-visibility',
    title: 'AI visibility results',
    body: (
      <p>
        AI visibility checks send your questions to third-party AI services and record what they answer. Each result is a sample. The same question can get a different answer
        at another time, so results may vary.
      </p>
    ),
  },
  {
    id: 'third-party-data',
    title: 'Third-party data',
    body: (
      <p>
        Much of the data we return comes from third parties, including DataForSEO, Google and AI providers. We provide it as is. We do not guarantee that it is complete or
        accurate.
      </p>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Use SEOforAgent to send spam.</li>
          <li>Use it for illegal content or illegal purposes.</li>
          <li>Resell the raw data as a competing data service.</li>
          <li>Abuse or try to get around rate limits.</li>
          <li>Try to break, probe or bypass our security, or access accounts that are not yours.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'suspension',
    title: 'Suspension and termination',
    body: (
      <>
        <p>
          We may suspend or close an account that breaks these terms, puts the service or other users at risk, or is used for fraud.
        </p>
        <p>
          You can stop using SEOforAgent at any time. Cancel your plan from billing and ask for account deletion at <SupportLink />.
        </p>
      </>
    ),
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual property',
    body: (
      <p>
        The SEOforAgent client code is open source under the MIT license on <a href={GITHUB_URL}>GitHub</a>. The service itself, the backend and the data we provide are not
        open source and remain ours or our licensors&apos;. You keep the rights to the project data you give us.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Disclaimers and limitation of liability',
    body: (
      <>
        <p>
          To the extent permitted by law, SEOforAgent is provided as is and as available. We do not promise that it will be uninterrupted or error free, or that it will
          improve your rankings, traffic or AI visibility.
        </p>
        <p>
          To the extent permitted by law, we are not liable for indirect or consequential losses, such as lost profits, lost revenue or lost data. Our total liability for any
          claim is capped at the fees you paid us in the 3 months before the event that caused it.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: <p>We may update these terms. We will give you notice by email or on the site, and change the date at the top of this page.</p>,
  },
  {
    id: 'governing-law',
    title: 'Governing law',
    body: <p>These terms are governed by French law. The courts of Paris have jurisdiction, unless consumer law gives you the right to go to another court.</p>,
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        For any question about these terms, write to <SupportLink />. Our <Link href="/privacy">Privacy Policy</Link> explains how we handle personal data.
      </p>
    ),
  },
];

const TermsPage = () => (
  <LegalPage
    title="Terms of Service"
    intro={<p>These terms apply when you or your agents use SEOforAgent. By creating an account or using the service, you agree to them.</p>}
    sections={SECTIONS}
  />
);

export default TermsPage;

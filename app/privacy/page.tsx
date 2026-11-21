import type { Metadata } from 'next';
import Link from 'next/link';
import { COMPANY_ADDRESS, COMPANY_LEGAL_NAME, COMPANY_REGISTRATION, COMPANY_VAT, LegalPage, SupportLink, type LegalSection } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How SEOforAgent, run by Outrank SAS, collects, uses, shares and keeps personal data, which providers receive it, how long we keep it and how you control it.',
  alternates: { canonical: '/privacy' },
  openGraph: { title: 'SEOforAgent Privacy Policy', url: '/privacy' },
};

const SECTIONS: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: (
      <>
        <p>
          SEOforAgent (seoforagent.com) is run by {COMPANY_LEGAL_NAME}, the company behind{' '}
          <a href="https://www.outrank.so">outrank.so</a>. {COMPANY_LEGAL_NAME} is the data controller for the personal data described here. It is a French company, {COMPANY_REGISTRATION},{' '}
          {COMPANY_VAT}, with registered office at {COMPANY_ADDRESS}.
        </p>
        <p>
          SEOforAgent is by Outrank. The backend, the database and billing run on Outrank&apos;s infrastructure, and every SEOforAgent account is an Outrank organization.
        </p>
      </>
    ),
  },
  {
    id: 'what-it-does',
    title: 'What SEOforAgent does',
    body: (
      <p>
        SEOforAgent gives AI agents such as Claude, ChatGPT, Codex and Cursor SEO tools over MCP and a REST API: keyword and Google results data, domain and backlink data, rank
        tracking, AI visibility checks, a diagnosis of why a brand is left out of AI answers, a listicle hunt, Google Search Console reading if you connect it, and buying
        backlinks and listicle placements through Outrank from prepaid credit.
      </p>
    ),
  },
  {
    id: 'data-we-collect',
    title: 'Categories of personal data we collect',
    body: (
      <ul>
        <li>
          <strong>Account data.</strong> Your email address and your organization.
        </li>
        <li>
          <strong>Billing records.</strong> Your Stripe customer id, plan, payments and invoices. Stripe handles your card details. We never see or store them.
        </li>
        <li>
          <strong>API keys and connected apps.</strong> The keys you create and the keys created when you connect ChatGPT or Claude. We store keys hashed, not in plain text.
        </li>
        <li>
          <strong>Project data you provide.</strong> Domains, descriptions, audiences, competitors, keywords and AI prompts you or your agent save.
        </li>
        <li>
          <strong>Tool calls and their results.</strong> The tools your agent calls, the arguments it sends and the results we return.
        </li>
        <li>
          <strong>Usage ledger.</strong> What each call cost, which key made it and when.
        </li>
        <li>
          <strong>Search Console data.</strong> Only if you connect Google Search Console. We ask for a read-only Google scope.
        </li>
        <li>
          <strong>Technical data.</strong> Your IP address, used for rate limiting and fraud prevention, and server logs.
        </li>
        <li>
          <strong>Website analytics and referrals.</strong> Pages viewed and clicks on seoforagent.com, measured with PostHog on its EU host, and affiliate referral data
          from Rewardful. We do not record sessions.
        </li>
      </ul>
    ),
  },
  {
    id: 'purposes',
    title: 'Why we use it (purposes)',
    body: (
      <ul>
        <li>To create and run your account, sign you in and keep your API keys working.</li>
        <li>To run the tools your agent calls and return the results.</li>
        <li>To charge plans and credit, deduct usage and keep invoices.</li>
        <li>To send you sign-in links and answer support requests.</li>
        <li>To limit request rates, keep the service secure and prevent fraud and abuse.</li>
        <li>To understand how the website is used and improve the product.</li>
        <li>To credit affiliates for the customers they refer.</li>
        <li>To meet our legal, tax and accounting obligations.</li>
      </ul>
    ),
  },
  {
    id: 'legal-bases',
    title: 'Legal bases',
    body: (
      <ul>
        <li>
          <strong>Contract.</strong> Running your account, the tools, billing and support.
        </li>
        <li>
          <strong>Legitimate interest.</strong> Security, rate limiting, fraud prevention and product analytics.
        </li>
        <li>
          <strong>Consent.</strong> Where the law requires it.
        </li>
        <li>
          <strong>Legal obligation.</strong> Keeping billing and accounting records.
        </li>
      </ul>
    ),
  },
  {
    id: 'recipients',
    title: 'Categories of recipients',
    body: (
      <>
        <p>We share data only with the providers that help us run SEOforAgent, and only what each one needs.</p>
        <ul>
          <li>
            <strong>Hosting and database.</strong> Outrank SAS infrastructure, hosted on Vercel, with the database on Supabase.
          </li>
          <li>
            <strong>Payments.</strong> Stripe.
          </li>
          <li>
            <strong>SEO data.</strong> DataForSEO receives the keyword, search and backlink queries your agent sends.
          </li>
          <li>
            <strong>AI providers.</strong> OpenAI, Anthropic, Google (Gemini) and Perplexity receive the questions used for AI visibility checks and the answers we analyze. When
            you run a check, we send your questions to ChatGPT, Perplexity, Gemini and Claude and record whether your brand is named and which pages are cited.
          </li>
          <li>
            <strong>Google Search Console.</strong> Only when you connect it.
          </li>
          <li>
            <strong>Analytics.</strong> PostHog.
          </li>
          <li>
            <strong>Affiliate tracking.</strong> Rewardful.
          </li>
          <li>
            <strong>Email.</strong> Our email provider, to send sign-in links.
          </li>
        </ul>
        <p>
          When you ask for a diagnosis of why a brand is left out, we fetch the public pages the assistants cited, your own homepage and your robots.txt. When you buy a
          backlink or listicle placement, the order is handled by Outrank with third-party sites.
        </p>
        <p>We do not sell personal data. We do not use customer data to train AI models.</p>
      </>
    ),
  },
  {
    id: 'ai-assistants',
    title: 'ChatGPT, Claude and other assistants',
    body: (
      <>
        <p>
          Connecting ChatGPT or Claude uses OAuth and creates an API key for that app. We receive the tool calls the assistant makes and their arguments, and we return the
          results. We do not receive your conversation history with the assistant.
        </p>
        <p>The assistant&apos;s provider handles your conversation under its own privacy policy.</p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'Data retention',
    body: (
      <ul>
        <li>
          <strong>Account data.</strong> Kept while your account is active, and deleted within 30 days after you ask for deletion at <SupportLink />.
        </li>
        <li>
          <strong>Billing and invoice records.</strong> Kept 10 years, to meet legal accounting obligations.
        </li>
        <li>
          <strong>Tool results.</strong> Kept 30 days, so your agent can read them again for free. A result you share stays public until you unshare it.
        </li>
        <li>
          <strong>Rate-limit records.</strong> Kept 24 hours at most.
        </li>
        <li>
          <strong>Logs.</strong> Kept 30 days at most.
        </li>
      </ul>
    ),
  },
  {
    id: 'your-controls',
    title: 'Your controls and rights',
    body: (
      <>
        <ul>
          <li>
            Revoke any API key or connected app at any time on the <Link href="/app/keys">Keys page</Link> of the dashboard.
          </li>
          <li>Unshare a public result at any time.</li>
          <li>Disconnect Google Search Console at any time.</li>
          <li>
            Set a per-call and a daily spend limit in <Link href="/app/billing">Plan and credit</Link>.
          </li>
          <li>
            Ask for a copy of your data, or for its deletion, by writing to <SupportLink />.
          </li>
        </ul>
        <p>
          Under the GDPR you can also ask us to access, correct, restrict or move your data, and you can object to processing based on legitimate interest. Write to{' '}
          <SupportLink />. You can also complain to the French data protection authority, the CNIL (<a href="https://www.cnil.fr">cnil.fr</a>).
        </p>
      </>
    ),
  },
  {
    id: 'transfers',
    title: 'International transfers',
    body: (
      <p>
        Some of our providers process data outside the European Economic Area. Where needed, these transfers are covered by the European Commission&apos;s Standard Contractual
        Clauses.
      </p>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        We protect your data with technical and organizational measures. API keys are stored hashed. Card details stay with Stripe. No system is perfectly secure, so keep your
        keys private and revoke any key you think has leaked.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: <p>SEOforAgent is not intended for anyone under 16.</p>,
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: <p>We may update this policy. We will post the new version on this page and change the date at the top. For significant changes, we will also give you notice by email or on the site.</p>,
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        For any question about this policy or your data, write to <SupportLink />. Our <Link href="/terms">Terms of Service</Link> explain the rules for using SEOforAgent.
      </p>
    ),
  },
];

const PrivacyPage = () => (
  <LegalPage
    title="Privacy Policy"
    intro={<p>This policy explains what personal data SEOforAgent collects, why, who receives it, how long we keep it and how you control it.</p>}
    sections={SECTIONS}
  />
);

export default PrivacyPage;

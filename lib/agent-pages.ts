import type { AgentId } from './setup';

export interface AgentPrompt {
  prompt: string;
  tools: string[];
  cost: string;
}

export interface AgentPage {
  slug: string;
  agentId: AgentId;
  label: string;
  h1: string;
  description: string;
  lede: string;
  connectNote: string;
  prompts: AgentPrompt[];
}

export const AGENT_PAGES: AgentPage[] = [
  {
    slug: 'claude-code',
    agentId: 'claude-code',
    label: 'Claude Code',
    h1: 'SEO tools for Claude Code',
    description:
      'Connect SEOforAgent to Claude Code with one command. Claude researches keywords, checks rankings and AI visibility, and edits your site in the same session.',
    lede: 'Claude Code already works inside your site. Connect SEOforAgent and it can research keywords, read live Google results, check whether AI assistants recommend you and plan backlinks, then make the changes in the same session.',
    connectNote: 'One command. The key travels in a header, so it never appears in a URL.',
    prompts: [
      {
        prompt: 'Research keywords this site can win, pick the best three, and write the title and meta description for each page in this repo.',
        tools: ['keywords_research', 'serp_results'],
        cost: 'About $0.07: one seed keyword and three live result checks.',
      },
      {
        prompt: 'Ask ChatGPT, Perplexity, Gemini and Claude who they recommend for "best invoicing app for freelancers" and tell me if we are named.',
        tools: ['ai_visibility_check'],
        cost: '$0.32: one prompt, four assistants.',
      },
      {
        prompt: 'Check where we rank for our 10 main keywords and compare with the last check.',
        tools: ['rank_check', 'rank_history'],
        cost: 'Up to $0.28. Reading the history is free.',
      },
    ],
  },
  {
    slug: 'codex',
    agentId: 'codex',
    label: 'Codex',
    h1: 'SEO tools for Codex',
    description:
      'Add SEOforAgent to Codex with three lines of config. Codex pulls keyword gaps, listicles and backlink data while it works on your pages.',
    lede: 'Codex reads and edits your code. Add SEOforAgent to its config and it can pull keyword gaps, live search results and backlink data while it works on your pages, with the dollar cost of every call in the response.',
    connectNote: 'Three lines in config.toml. Restart Codex and the tools are there in every session.',
    prompts: [
      {
        prompt: 'Find the keywords our two closest competitors rank for and we do not, then list the five pages we should build first.',
        tools: ['domain_keywords'],
        cost: 'Up to $0.038 for 100 rows.',
      },
      {
        prompt: 'Find the "best X" lists that rank or get cited for our category and draft a pitch for the three worth being on.',
        tools: ['listicles_find', 'listicles_get', 'listicles_pitch'],
        cost: '$1.10: $0.50 for the hunt, then $0.20 a page for detail and a pitch.',
      },
      {
        prompt: 'Price a backlink profile check for our domain with dry_run, then run it if it is under 10 cents.',
        tools: ['backlinks_profile'],
        cost: 'The dry run is free. The check is up to $0.079.',
      },
    ],
  },
  {
    slug: 'cursor',
    agentId: 'cursor',
    label: 'Cursor',
    h1: 'SEO tools for Cursor',
    description:
      'Add SEOforAgent to Cursor through mcp.json. Cursor checks real search data before it rewrites a page, and reports what each lookup cost.',
    lede: 'Cursor writes your pages. With SEOforAgent in mcp.json it can check real search data first: what people search for, who ranks today and which sites link to your competitors.',
    connectNote: 'One block in mcp.json, for every project or for one.',
    prompts: [
      {
        prompt: 'Look at this landing page, find a keyword with real volume it could rank for, and rewrite the h1 and intro for it.',
        tools: ['keywords_research'],
        cost: 'About $0.06 for one seed keyword.',
      },
      {
        prompt: 'Who ranks in the top 10 for "ai video editor", and what do their titles have in common?',
        tools: ['serp_results'],
        cost: 'Up to $0.004.',
      },
      {
        prompt: 'Which sites link to our two closest competitors and not to us?',
        tools: ['backlinks_gap'],
        cost: 'Up to $0.04 for 50 rows.',
      },
    ],
  },
  {
    slug: 'claude',
    agentId: 'claude-app',
    label: 'Claude',
    h1: 'SEO tools for Claude',
    description:
      'Add SEOforAgent to the Claude app as a custom connector. Claude runs keyword research, AI visibility checks and weekly SEO reviews in any chat.',
    lede: 'The Claude app takes custom connectors. Add SEOforAgent as one and Claude can run keyword research, AI visibility checks and a weekly review of your site in any chat, without a terminal.',
    connectNote: 'The Claude app cannot set headers, so the key is part of the connector URL. Treat that URL like a password.',
    prompts: [
      {
        prompt: 'Do ChatGPT, Perplexity, Gemini and Claude mention my brand when people ask for the best tools in my category? Check three questions.',
        tools: ['ai_visibility_check'],
        cost: '$0.96: three prompts, four assistants.',
      },
      {
        prompt: 'Build a keyword plan for my site: 30 keywords grouped by intent, with volume and difficulty.',
        tools: ['keywords_research'],
        cost: 'About $0.12 for two seed keywords.',
      },
      {
        prompt: 'Run my weekly SEO review: rankings, backlinks and listicles placed, and what to do next.',
        tools: ['rank_history', 'backlinks_placements', 'gsc_performance'],
        cost: 'Free. These three tools only read what is already stored.',
      },
    ],
  },
  {
    slug: 'chatgpt',
    agentId: 'chatgpt',
    label: 'ChatGPT',
    h1: 'SEO tools for ChatGPT',
    description:
      'Add SEOforAgent to ChatGPT as a connector in developer mode. ChatGPT reads real search data and sees how AI assistants talk about your brand.',
    lede: 'ChatGPT can call outside tools through connectors in developer mode. Add SEOforAgent and it reads real search data instead of guessing, and can check how it and three other assistants talk about your brand.',
    connectNote: 'ChatGPT cannot set headers, so the key is part of the connector URL. Treat that URL like a password.',
    prompts: [
      {
        prompt: 'How much traffic does my main competitor get from Google, and which keywords bring it?',
        tools: ['domain_overview', 'domain_keywords'],
        cost: 'About $0.08 for one domain.',
      },
      {
        prompt: 'Find the lists AI assistants cite for "best crm for startups" and tell me which are worth being on.',
        tools: ['listicles_find'],
        cost: '$0.50 a query.',
      },
      {
        prompt: 'Show me where I can earn the backlinks my competitors already have, and what it would cost to buy the rest.',
        tools: ['backlinks_suggest'],
        cost: 'About $0.29 a run.',
      },
    ],
  },
];

export const AGENT_PAGE_BY_SLUG: Map<string, AgentPage> = new Map(AGENT_PAGES.map((page) => [page.slug, page]));

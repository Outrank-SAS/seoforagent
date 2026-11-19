import type { z } from 'zod';
import { MCP_URL, PUBLIC_API_BASE, SITE_URL } from './config';
import { BACKLINK_CREDIT_USD, BACKLINK_CREDITS_PER_DR, FALLBACK_PLANS, linkPriceUsd } from './pricing';
import { AGENTS, KEY_PLACEHOLDER, setupPrompt } from './setup';
import { AREA_LABELS, TOOLS, type ToolArea, type ToolDefinition } from './tools';

export interface ParamDoc {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

type ZodLike = z.ZodType & { _zod: { def: Record<string, unknown> }; description?: string };

const typeOf = (schema: ZodLike): { type: string; optional: boolean; description: string } => {
  let current: ZodLike = schema;
  let optional = false;
  let description = schema.description ?? '';
  for (let depth = 0; depth < 5; depth += 1) {
    const def = current._zod.def;
    if (def.type === 'optional' || def.type === 'default' || def.type === 'nullable') {
      optional = true;
      current = def.innerType as ZodLike;
      description = description || current.description || '';
      continue;
    }
    break;
  }
  const def = current._zod.def;
  const kind = String(def.type);
  if (kind === 'array') {
    const inner = typeOf(def.element as ZodLike);
    return { type: `${inner.type}[]`, optional, description };
  }
  if (kind === 'enum') {
    const entries = Object.values((def.entries ?? {}) as Record<string, string>);
    return { type: entries.map((entry) => `"${entry}"`).join(' | '), optional, description };
  }
  return { type: kind === 'number' && (current as unknown as { isInt?: boolean }).isInt ? 'integer' : kind, optional, description };
};

export const toolParams = (tool: ToolDefinition): ParamDoc[] =>
  Object.entries(tool.input).map(([name, schema]) => {
    const info = typeOf(schema as unknown as ZodLike);
    return { name, type: info.type, required: !info.optional, description: info.description };
  });

export const KIND_LABELS: Record<ToolDefinition['kind'], string> = {
  read: 'Free read',
  write: 'Free write',
  paid: 'Paid',
  money: 'Moves money',
};

export const toolsByArea = (): [ToolArea, ToolDefinition[]][] => {
  const map = new Map<ToolArea, ToolDefinition[]>();
  for (const tool of TOOLS) map.set(tool.area, [...(map.get(tool.area) ?? []), tool]);
  return [...map.entries()];
};

export const routeOf = (tool: ToolDefinition): string => {
  const sample: Record<string, string> = { project_id: ':project_id', page_id: ':page_id', result_id: ':result_id' };
  return `${tool.method} ${tool.path(sample).replace(/%3A/g, ':')}`;
};

export const BILLING_POINTS = [
  'Every price is in US dollars. Plans include a monthly amount of usage; one-time credit is spent after it and does not reset.',
  'A paid call is held at its upper estimate, then charged its actual cost. Data tools cost the provider price × 1.28, rounded up to $0.001 with a $0.001 minimum. AI checks and listicle tools have fixed prices.',
  'Every paid response carries cost.charged_usd, cost.included_left_usd and cost.credit_left_usd, plus a result_id you can re-read for free for 30 days with results_get.',
  'Every paid tool accepts dry_run (price only, free), max_cost_usd (refuse above this amount) and fresh (skip the free 24-hour repeat).',
  'Per-call and daily spend limits are set by the human in the dashboard. A call over a limit returns OVER_SPEND_LIMIT and is not charged.',
  `Backlinks: credit converts to Outrank backlink credits at $${BACKLINK_CREDIT_USD.toFixed(2)} each. A link costs DR × ${BACKLINK_CREDITS_PER_DR} credits, so a DR 50 link is 200 credits, $${linkPriceUsd(50)}. Buying is two calls: backlinks_quote, then backlinks_allocate with the quote_id and the exact confirm_usd the human approved.`,
];

export const ERROR_CODES: [string, string][] = [
  ['ACTIVATION_REQUIRED', 'The key is not active, or the account has no plan or credit. Show the activation link.'],
  ['PLAN_REQUIRED', 'The plan does not include this. The error names the plan and the upgrade link.'],
  ['INSUFFICIENT_BALANCE', 'Not enough usage or credit for this call. Show the top-up link.'],
  ['OVER_MAX_COST', 'The call would cost more than max_cost_usd. Nothing was charged.'],
  ['OVER_SPEND_LIMIT', 'The call is over a per-call or daily limit the human set.'],
  ['QUOTE_EXPIRED', 'The backlink quote expired or was used. Quote again and ask again.'],
  ['QUOTE_MISMATCH', 'confirm_usd does not match the quote total.'],
  ['NOT_FOUND', 'Unknown or expired id.'],
  ['INVALID_ARGUMENT', 'An argument is missing or out of range.'],
  ['RATE_LIMITED', 'Too many requests. Wait for Retry-After.'],
  ['PROVIDER_UNAVAILABLE', 'The data provider did not answer. Nothing was charged.'],
];

export const ACCOUNT_ROUTES: [string, string][] = [
  ['GET /sfa/pricing', 'Plans, credit options, tool prices and the backlink rate. No key needed.'],
  ['POST /sfa/activation/checkout', 'Body: key, kind (plan or credit), plan or amount_usd, return_origin, referral. Returns checkout_url. No key needed.'],
  ['GET /sfa/activation/status', 'Bearer: the pending key. Returns status: pending_payment, pending_owner_confirmation, active, expired or unknown.'],
  ['POST /sfa/auth/email-link', 'Body: email, return_origin. Always returns sent: true.'],
  ['POST /sfa/auth/exchange', 'Body: token. Returns purpose; a new key for a login, activated: true for a confirmation.'],
  ['GET /sfa/activity', 'Recent tool calls with their cost.'],
  ['PATCH /sfa/wallet', 'Change the per-call and daily spend limits.'],
  ['GET /sfa/keys, POST /sfa/keys, DELETE /sfa/keys/:id', 'List, create and revoke API keys.'],
];

export const CURL_EXAMPLES: { title: string; code: string }[] = [
  {
    title: 'Check the key',
    code: `curl ${PUBLIC_API_BASE}/sfa/whoami \\\n  -H "Authorization: Bearer $SEOFORAGENT_API_KEY"`,
  },
  {
    title: 'Price a keyword research call without running it',
    code: `curl -X POST ${PUBLIC_API_BASE}/sfa/keywords/research \\\n  -H "Authorization: Bearer $SEOFORAGENT_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"seeds":["ai video editor"],"limit":150,"dry_run":true}'`,
  },
  {
    title: 'Ask four AI assistants about your brand',
    code: `curl -X POST ${PUBLIC_API_BASE}/sfa/ai/check \\\n  -H "Authorization: Bearer $SEOFORAGENT_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"prompts":["best ai video editor for youtube"],"brand":"Acme","max_cost_usd":0.5}'`,
  },
  {
    title: 'Quote, then allocate backlink credit (after the human says yes)',
    code: `curl -X POST ${PUBLIC_API_BASE}/sfa/projects/$PROJECT_ID/backlinks/quote \\\n  -H "Authorization: Bearer $SEOFORAGENT_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"credits":200}'\n\ncurl -X POST ${PUBLIC_API_BASE}/sfa/projects/$PROJECT_ID/backlinks/allocate \\\n  -H "Authorization: Bearer $SEOFORAGENT_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -H "Idempotency-Key: sfa-allocate-$QUOTE_ID" \\\n  -d '{"quote_id":"'$QUOTE_ID'","confirm_usd":160}'`,
  },
];

const mdTable = (headers: string[], rows: string[][]): string =>
  [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.map((cell) => cell.replace(/\|/g, '\\|')).join(' | ')} |`)].join('\n');

export const docsMarkdown = (): string => {
  const parts: string[] = [];
  parts.push('# SEOforAgent docs', '');
  parts.push(
    'SEOforAgent is the SEO tool for AI agents, by Outrank. Connect it to Claude, ChatGPT, Codex or Cursor over MCP and your agent gets keyword and search data, AI visibility checks across ChatGPT, Perplexity, Gemini and Claude, a listicle hunt, and backlink buying through Outrank. Every call is priced in US dollars.',
    '',
  );
  parts.push('## Quickstart', '');
  parts.push(`1. Open ${SITE_URL}. An API key (\`sfa_live_...\`) is generated in your browser.`);
  parts.push('2. Click Activate, choose a plan or buy credit once, and pay on Stripe. The key works as soon as the payment is confirmed.');
  parts.push('3. Connect your agent with one of the snippets below, then paste the setup prompt.', '');
  parts.push(`MCP endpoint (Streamable HTTP, stateless): \`${MCP_URL}\` with \`Authorization: Bearer ${KEY_PLACEHOLDER}\`. Apps that cannot set headers use \`${MCP_URL}/${KEY_PLACEHOLDER}\`.`, '');
  for (const agent of AGENTS) {
    parts.push(`### ${agent.label}`, '', agent.intro, '', `\`\`\`${agent.language === 'shell' ? 'sh' : agent.language}`, agent.snippet(KEY_PLACEHOLDER), '```', '');
    agent.steps.forEach((step, index) => parts.push(`${index + 1}. ${step}`));
    parts.push('');
  }
  parts.push('### Setup prompt', '', '```text', setupPrompt(), '```', '');
  parts.push('## How billing works', '');
  parts.push(
    mdTable(
      ['Plan', 'Price', 'Included each month', 'Projects'],
      FALLBACK_PLANS.map((plan) => [plan.name, `$${plan.priceUsd} a month`, `$${plan.includedUsd}`, String(plan.projects)]),
    ),
    '',
    'Credit only: one payment from $10 to $5,000, one project, no reset. Outrank customers on a paid plan: included, $10 of usage a month.',
    '',
  );
  BILLING_POINTS.forEach((point) => parts.push(`- ${point}`));
  parts.push('');
  parts.push('### Errors', '', mdTable(['Code', 'Meaning'], ERROR_CODES), '');
  parts.push('## Tools', '', `${TOOLS.length} tools. Every response is a JSON envelope: \`ok\`, \`data\` or \`error\`, \`cost\`, \`result_id\`, \`next_actions\`, \`agent_guidance\`.`, '');
  for (const [area, tools] of toolsByArea()) {
    parts.push(`### ${AREA_LABELS[area]}`, '');
    for (const tool of tools) {
      parts.push(`#### \`${tool.name}\``, '', `${KIND_LABELS[tool.kind]}. Price: ${tool.price}. Route: \`${routeOf(tool)}\``, '', tool.description, '');
      const params = toolParams(tool);
      if (params.length > 0) {
        parts.push(mdTable(['Parameter', 'Type', 'Required', 'Description'], params.map((param) => [`\`${param.name}\``, `\`${param.type}\``, param.required ? 'yes' : 'no', param.description])), '');
      }
    }
  }
  parts.push('## REST API', '');
  parts.push(
    `Base URL: \`${PUBLIC_API_BASE}\`. Send the key as \`Authorization: Bearer <key>\`. Paid routes take \`dry_run\`, \`max_cost_usd\` and \`fresh\` in the JSON body. Every tool above maps to the route shown with it; GET routes take their parameters as query strings, with arrays comma-separated.`,
    '',
  );
  parts.push(mdTable(['Route', 'Purpose'], ACCOUNT_ROUTES.map(([route, purpose]) => [`\`${route}\``, purpose])), '');
  for (const example of CURL_EXAMPLES) parts.push(`### ${example.title}`, '', '```sh', example.code, '```', '');
  parts.push('## Open source', '', 'The client (this site, the MCP server, skills and plugin) is MIT licensed. The service, data and billing run on Outrank.', '');
  return parts.join('\n');
};

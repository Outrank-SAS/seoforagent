# SEOforAgent

The SEO tool for AI agents, by [Outrank](https://www.outrank.so). Connect it to Claude, ChatGPT, Codex or Cursor and your agent gets keyword and search data, AI visibility checks across ChatGPT, Perplexity, Gemini and Claude, a listicle hunt, and backlink buying through Outrank. Every call is priced in US dollars and reports what it cost.

This repository is the client: the website at [seoforagent.com](https://seoforagent.com), the dashboard at `/app`, the hosted MCP server at `/mcp`, the REST proxy at `/api/v1`, the agent skills and the Claude Code plugin. It is MIT licensed. **The service itself (data, billing, accounts, backlink matching) is hosted by Outrank and is not part of this repository.** Every request is forwarded to the Outrank agent API.

## Get started

1. Open [seoforagent.com](https://seoforagent.com). An API key (`sfa_live_...`) is generated in your browser.
2. Click Activate, pick a plan (from $9 a month) or buy credit once (from $10), and pay on Stripe.
3. Connect your agent, then paste the setup prompt from the homepage or [/setup.md](https://seoforagent.com/setup.md).

### Claude Code

```sh
claude mcp add --transport http seoforagent https://seoforagent.com/mcp --header "Authorization: Bearer <YOUR_API_KEY>"
```

Or install the plugin, which adds the MCP server and the skills:

```sh
export SEOFORAGENT_API_KEY=sfa_live_...
claude plugin marketplace add Outrank-SAS/seoforagent
claude plugin install seoforagent@seoforagent
```

### Codex (`~/.codex/config.toml`)

```toml
[mcp_servers.seoforagent]
url = "https://seoforagent.com/mcp"
http_headers = { Authorization = "Bearer <YOUR_API_KEY>" }
```

### Cursor (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "seoforagent": {
      "url": "https://seoforagent.com/mcp",
      "headers": { "Authorization": "Bearer <YOUR_API_KEY>" }
    }
  }
}
```

### Claude app and ChatGPT

These apps cannot set headers, so the key goes in the URL: `https://seoforagent.com/mcp/<YOUR_API_KEY>`. Keep that URL private.

- Claude: Settings, Connectors, Add custom connector, paste the URL.
- ChatGPT: Settings, Apps and connectors, Advanced settings, turn on developer mode, Create, paste the URL, No authentication.

## Tools

| Area | Tools |
|---|---|
| Account | `whoami`, `wallet_get`, `pricing_get`, `account_link`, `results_get` |
| Projects | `projects_list`, `projects_create`, `projects_get`, `projects_update` |
| Search Console | `gsc_connect`, `gsc_performance` |
| Keywords and search results | `keywords_research`, `keywords_metrics`, `serp_results`, `serp_competitors` |
| Domains | `domain_overview`, `domain_keywords` |
| Rank tracking | `rank_check`, `rank_history` |
| AI visibility | `ai_visibility_check` |
| Listicle hunt | `listicles_find`, `listicles_list`, `listicles_get`, `listicles_pitch` |
| Backlinks | `backlinks_profile`, `backlinks_gap`, `backlinks_suggest`, `backlinks_buying_get`, `backlinks_buying_set`, `backlinks_placements`, `backlinks_quote`, `backlinks_allocate` |

All tools are defined in one registry, [`lib/tools.ts`](lib/tools.ts): name, description, price, zod input schema, HTTP method and route, and kind (read, paid, write or money). Paid tools accept `dry_run`, `max_cost_usd` and `fresh`. `backlinks_allocate` moves money: it needs a `quote_id` and the exact `confirm_usd`, sends an `Idempotency-Key`, and is annotated `destructiveHint: true`. Full reference: [/docs](https://seoforagent.com/docs) or [/docs.md](https://seoforagent.com/docs.md).

## Skills

In [`skills/`](skills), each a Markdown workflow that states its expected spend and stops to ask before going over it: `seo-setup`, `keyword-plan`, `ai-visibility-audit`, `listicle-hunt`, `link-building`, `weekly-review`. The plugin in [`plugin/`](plugin) links to them.

## How it works

```
agent ──MCP──▶ seoforagent.com/mcp ─┐
browser ─────▶ seoforagent.com/api/v1/* ─┼──▶ www.outrank.so/api/agent/v1/*
                                    │
dashboard (/app, key in localStorage) ┘
```

- `app/mcp/route.ts` and `app/mcp/[key]/route.ts`: stateless Streamable HTTP MCP server. A fresh `McpServer` per request, JSON responses, `GET` and `DELETE` answer 405. The key comes from `Authorization: Bearer` or the path. Without a key, tools list but calls return a message pointing to seoforagent.com (except `pricing_get`, which is public).
- `app/api/v1/[...path]/route.ts`: forwards GET, POST, PATCH and DELETE with the query string, body, `Authorization`, `Content-Type`, `Idempotency-Key` and the client's `X-Forwarded-For`. Status, body and content type come back unchanged. `maxDuration` is 300 seconds because listicle hunts can take about 90.
- The homepage generates the key in the browser (`sfa_live_` + base64url of 32 random bytes) and keeps it in `localStorage` (`sfa_pending_key`, then `sfa_key` once active). Nothing is sent until Activate.
- Tool results over MCP: `content` is the JSON envelope, with arrays over 25 items trimmed and a pointer to `results_get`; `structuredContent` is the full envelope.

## Environment variables

None are secret. See [`.env.example`](.env.example).

| Name | Default | Purpose |
|---|---|---|
| `OUTRANK_API_BASE` | `https://www.outrank.so/api/agent/v1` | Backend every request is forwarded to |
| `NEXT_PUBLIC_SITE_URL` | `https://seoforagent.com` | Public origin used in prompts, MCP URLs, sitemap and metadata |
| `NEXT_PUBLIC_POSTHOG_KEY` | empty | Optional PostHog project key. Without it no analytics load |

## Local development

Requires Node 22.

```sh
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
npm test           # registry and formatter unit tests
npm run lint
npm run typecheck
npm run build
```

Check the MCP server:

```sh
curl -s http://localhost:3000/mcp \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

To point at a local Outrank, set `OUTRANK_API_BASE=http://localhost:3001/api/agent/v1`.

## Deploy

Vercel, Next.js preset, Node 22. Set the environment variables above. The MCP and proxy routes run on the Node.js runtime with `maxDuration = 300`, which needs a plan that allows it (Fluid compute). Point `seoforagent.com` at the project. `server.json` is the MCP registry manifest; publishing it under `com.seoforagent/seoforagent` needs DNS or HTTP verification of seoforagent.com.

## License

MIT, see [LICENSE](LICENSE). The client is open source. The service runs on Outrank and is covered by [Outrank's terms](https://www.outrank.so/terms).

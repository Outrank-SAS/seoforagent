# Contributing

Thanks for helping. This repository is the open-source client of SEOforAgent: the site, dashboard, MCP server, skills and plugin. The service behind it runs on Outrank, so changes here cannot add new data sources or prices on their own.

## Setup

Node 22, then:

```sh
npm install
cp .env.example .env.local
npm run dev
```

Before opening a pull request, run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`.

## Conventions

- Tools live in one registry, `lib/tools.ts`. A new tool needs a route on the Outrank agent API, a description that follows the template (what it does, when to use it instead of its sibling, the price, what goes wrong), and a line in `tests/tools.test.ts`.
- Keep the tool count low. Prefer a parameter on an existing tool over a new tool.
- Copy is plain and specific, in sentence case. Prices and limits are stated. No emoji.
- UI must stay keyboard reachable, with visible focus, 44 px touch targets and 4.5:1 contrast.
- Skills state their expected spend at the top and stop to ask before going over it.

## Reporting bugs

Open an issue with what you did, what you expected and what happened. For anything security related, see [SECURITY.md](SECURITY.md).

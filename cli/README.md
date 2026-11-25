# seoforagent

Command line for [SEOforAgent](https://seoforagent.com), the SEO tool for AI agents, by Outrank. It creates an API key, connects your agent, and gives humans and shell-based agents direct access to Google Search Console data and every SEOforAgent tool. No dependencies, Node 18 or later.

## Set up

```sh
npx seoforagent init
```

`init` does four things:

1. Creates an API key on your machine (`sfa_live_` followed by 32 random bytes in base64url). Nothing is sent anywhere.
2. Prints the activation link, `https://seoforagent.com/activate#<key>`. Open it, pick a plan or one-time credit, and pay on Stripe. The key works as soon as Stripe confirms.
3. Saves the key to `~/.config/seoforagent/key` (or `$XDG_CONFIG_HOME/seoforagent/key`) with mode 0600, so the other commands work without `--key`.
4. Connects your agent. If the `claude` command is on your PATH it asks before running `claude mcp add --transport http seoforagent https://seoforagent.com/mcp --header "Authorization: Bearer <key>"`. Otherwise it prints the config for Claude Code, Codex and Cursor.

Already have a key from the website? Pass it:

```sh
npx seoforagent init --key sfa_live_...
```

Check a key:

```sh
npx seoforagent status
```

`status` calls `GET https://seoforagent.com/api/v1/sfa/whoami` and prints the plan, the included usage left and the one-time credit.

## Google Search Console

```sh
npx seoforagent gsc connect                     # opens the Google link, waits until the new sites show up
npx seoforagent gsc sites                       # connected sites, Google account and project
npx seoforagent gsc overview --days 28          # every site: clicks, impressions, CTR, position and change (7, 28 or 90 days)
npx seoforagent gsc query example.com --dimensions query,page --days 28 --compare --limit 50
npx seoforagent gsc query example.com --query-contains pricing --country usa --device MOBILE
npx seoforagent gsc insights example.com        # what to do, pages and queries up and down, striking distance
npx seoforagent gsc inspect https://example.com/pricing   # verdict, coverage, last crawl, Google canonical
```

`gsc connect` polls every 3 seconds for up to 10 minutes. Pass `--no-open` to print the link without opening the browser. With `--json` it prints the link and returns at once.

## Any tool

```sh
npx seoforagent tools                                   # every tool with what it does
npx seoforagent call whoami
npx seoforagent call domain_overview '{"domain":"example.com"}'
```

`call` prints the JSON envelope the tool returns: `ok`, `data`, `error`, `agent_guidance`, `cost`, `result_id`, `next_actions`.

## For agents

Agents without MCP can run `npx seoforagent call <tool> '{...}' --json`, or any `gsc` command with `--json`. The output is one line of JSON, the same envelope the MCP server returns, and the exit code is 1 when `ok` is false. Run `npx seoforagent tools --json` to read every tool's name, description and input schema. Follow `agent_guidance` in each answer.

The CLI talks to `https://seoforagent.com/mcp` (Streamable HTTP, JSON-RPC 2.0) with the key as a Bearer token.

## Options

| Option | What it does |
|---|---|
| `--key <key>` | Use this key. Otherwise `SEOFORAGENT_API_KEY`, then the key `init` saved. |
| `--json` | Print the raw JSON envelope instead of a table. Agents should always pass it. |
| `--yes`, `-y` | With `init`: add SEOforAgent to Claude Code without asking. |
| `--no-open` | With `gsc connect`: do not open the browser. |
| `--version` | Print the version. |
| `help` | Show the help. |

## Notes

- The key is shown in your terminal, saved in `~/.config/seoforagent/key` and, if you accept, stored by Claude Code in its MCP config. Treat it like a password. You can revoke it in the dashboard at https://seoforagent.com/app/keys.
- On Windows `init` prints the config instead of running `claude` for you.
- `SEOFORAGENT_URL` points the CLI at another origin, for local development.

MIT licensed.

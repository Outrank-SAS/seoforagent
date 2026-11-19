# seoforagent

Command line setup for [SEOforAgent](https://seoforagent.com), the SEO tool for AI agents, by Outrank. It creates an API key, prints the link to activate it and connects your agent. No dependencies, Node 18 or later.

## Use

```sh
npx seoforagent init
```

`init` does three things:

1. Creates an API key on your machine (`sfa_live_` followed by 32 random bytes in base64url). Nothing is sent anywhere.
2. Prints the activation link, `https://seoforagent.com/activate#<key>`. Open it, pick a plan or one-time credit, and pay on Stripe. The key works as soon as Stripe confirms.
3. Connects your agent. If the `claude` command is on your PATH it asks before running `claude mcp add --transport http seoforagent https://seoforagent.com/mcp --header "Authorization: Bearer <key>"`. Otherwise it prints the config for Claude Code, Codex and Cursor.

Already have a key from the website? Pass it:

```sh
npx seoforagent init --key sfa_live_...
```

Check a key:

```sh
npx seoforagent status --key sfa_live_...
# or
SEOFORAGENT_API_KEY=sfa_live_... npx seoforagent status
```

`status` calls `GET https://seoforagent.com/api/v1/sfa/whoami` and prints the plan, the included usage left and the one-time credit.

## Options

| Option | What it does |
|---|---|
| `--key <key>` | Use this key. `status` also reads `SEOFORAGENT_API_KEY`. |
| `--yes`, `-y` | With `init`: add SEOforAgent to Claude Code without asking. |
| `--version` | Print the version. |
| `help` | Show the help. |

## Notes

- The key is shown in your terminal and, if you accept, stored by Claude Code in its MCP config. Treat it like a password. You can revoke it in the dashboard at https://seoforagent.com/app/keys.
- On Windows `init` prints the config instead of running `claude` for you.
- `SEOFORAGENT_URL` points the CLI at another origin, for local development.

MIT licensed.

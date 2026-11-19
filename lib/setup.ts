import { MCP_URL, SITE_URL } from './config';

export const KEY_PLACEHOLDER = '<YOUR_API_KEY>';

export type AgentId = 'claude-code' | 'codex' | 'cursor' | 'claude-app' | 'chatgpt';

export interface AgentSetup {
  id: AgentId;
  label: string;
  intro: string;
  language: 'shell' | 'toml' | 'json' | 'text';
  snippet: (key: string) => string;
  steps: string[];
}

export const claudeCodeCommand = (key: string): string =>
  `claude mcp add --transport http seoforagent ${MCP_URL} --header "Authorization: Bearer ${key}"`;

export const codexConfig = (key: string): string =>
  ['[mcp_servers.seoforagent]', `url = "${MCP_URL}"`, `http_headers = { Authorization = "Bearer ${key}" }`].join('\n');

export const cursorConfig = (key: string): string =>
  JSON.stringify({ mcpServers: { seoforagent: { url: MCP_URL, headers: { Authorization: `Bearer ${key}` } } } }, null, 2);

export const pathKeyUrl = (key: string): string => `${MCP_URL}/${key}`;

export const AGENTS: AgentSetup[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    intro: 'Run this in your terminal, then start Claude Code and paste the setup prompt.',
    language: 'shell',
    snippet: claudeCodeCommand,
    steps: ['Run the command above.', 'Open Claude Code and paste the setup prompt below.'],
  },
  {
    id: 'codex',
    label: 'Codex',
    intro: 'Add this to ~/.codex/config.toml, then restart Codex.',
    language: 'toml',
    snippet: codexConfig,
    steps: ['Paste the block into ~/.codex/config.toml.', 'Restart Codex and paste the setup prompt below.'],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    intro: 'Add this to ~/.cursor/mcp.json (or .cursor/mcp.json in a project).',
    language: 'json',
    snippet: cursorConfig,
    steps: ['Merge the block into mcp.json.', 'Open Cursor settings, check that seoforagent is on, then paste the setup prompt in chat.'],
  },
  {
    id: 'claude-app',
    label: 'Claude app',
    intro: 'The Claude app cannot set headers, so the key goes in the URL. Keep this URL private.',
    language: 'text',
    snippet: pathKeyUrl,
    steps: [
      'Open Settings, then Connectors, then Add custom connector.',
      'Name it SEOforAgent and paste the URL above. Leave the OAuth fields empty.',
      'In a new chat, turn the connector on and paste the setup prompt below.',
    ],
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    intro: 'ChatGPT cannot set headers, so the key goes in the URL. Keep this URL private.',
    language: 'text',
    snippet: pathKeyUrl,
    steps: [
      'Open Settings, then Apps and connectors, then Advanced settings, and turn on developer mode.',
      'Choose Create, name it SEOforAgent, paste the URL above and pick No authentication.',
      'In a new chat, add SEOforAgent from the tools menu and paste the setup prompt below.',
    ],
  },
];

export const setupPrompt = (key: string = KEY_PLACEHOLDER): string =>
  [
    'Set up SEOforAgent for me.',
    '',
    `1. Add the MCP server ${MCP_URL} with this API key as a Bearer token: ${key}`,
    `   If you cannot set headers, use ${pathKeyUrl(key)} instead.`,
    '   If you support plugins, install the seoforagent plugin instead and give it the key.',
    '2. Call whoami. If it says the key is not active, show me the link and wait.',
    '3. Ask me for my website, then run the seo-setup skill if you have it, or create the project with projects_create.',
    '4. Finish with the three most useful things you can do for my site and what each would cost.',
  ].join('\n');

export const SETUP_MD = (): string =>
  [
    '# SEOforAgent setup prompt',
    '',
    `Get an API key at ${SITE_URL} (it is generated in your browser and works once you activate it on Stripe), then paste this into your agent with the key in place of ${KEY_PLACEHOLDER}:`,
    '',
    '```text',
    setupPrompt(),
    '```',
    '',
    '## Connect by hand',
    '',
    `- MCP endpoint (Streamable HTTP): ${MCP_URL} with the header \`Authorization: Bearer ${KEY_PLACEHOLDER}\``,
    `- Apps that cannot set headers (Claude app, ChatGPT): ${pathKeyUrl(KEY_PLACEHOLDER)}`,
    `- Claude Code: \`${claudeCodeCommand(KEY_PLACEHOLDER)}\``,
    '',
    `Full docs: ${SITE_URL}/docs.md`,
    '',
  ].join('\n');

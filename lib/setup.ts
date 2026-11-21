import { CLI_PUBLISHED, MCP_URL, SITE_URL } from './config';

export const KEY_PLACEHOLDER = '<YOUR_API_KEY>';

export type AgentId = 'cli' | 'claude-code' | 'codex' | 'cursor' | 'claude-app' | 'chatgpt';

export interface AgentSetup {
  id: AgentId;
  label: string;
  stepTitle?: string;
  intro: string;
  language: 'shell' | 'toml' | 'json' | 'text';
  snippet: (key: string) => string;
  steps: string[];
}

export const claudeCodeCommand = (key: string): string =>
  [`claude mcp add --transport http seoforagent \\`, `  ${MCP_URL} \\`, `  --header "Authorization: Bearer ${key}"`].join('\n');

export const codexConfig = (key: string): string =>
  ['[mcp_servers.seoforagent]', `url = "${MCP_URL}"`, `http_headers = { Authorization = "Bearer ${key}" }`].join('\n');

export const cursorConfig = (key: string): string =>
  JSON.stringify({ mcpServers: { seoforagent: { url: MCP_URL, headers: { Authorization: `Bearer ${key}` } } } }, null, 2);

export const pathKeyUrl = (key: string): string => `${MCP_URL}/${key}`;

export const CLI_COMMAND = 'npx seoforagent init';

export const cliCommand = (key: string): string => (key === KEY_PLACEHOLDER ? CLI_COMMAND : `${CLI_COMMAND} --key ${key}`);

const CLI_AGENT: AgentSetup = {
  id: 'cli',
  label: 'npx',
  stepTitle: 'Run the installer',
  intro: 'Run this in your terminal. It prints your activation link and adds SEOforAgent to Claude Code, or prints the config for Codex and Cursor.',
  language: 'shell',
  snippet: cliCommand,
  steps: ['Open your agent and paste the setup prompt below.'],
};

const MANUAL_AGENTS: AgentSetup[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    intro: 'Run this in your terminal. It adds SEOforAgent to every Claude Code session.',
    language: 'shell',
    snippet: claudeCodeCommand,
    steps: ['Open Claude Code and paste the setup prompt below.'],
  },
  {
    id: 'codex',
    label: 'Codex',
    intro: 'Add this block to ~/.codex/config.toml, then restart Codex.',
    language: 'toml',
    snippet: codexConfig,
    steps: ['Paste the setup prompt below in Codex.'],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    intro: 'Merge this into ~/.cursor/mcp.json, or .cursor/mcp.json for one project.',
    language: 'json',
    snippet: cursorConfig,
    steps: ['In Cursor settings, under MCP, check that seoforagent is on.', 'Paste the setup prompt below in chat.'],
  },
  {
    id: 'claude-app',
    label: 'Claude app',
    intro: 'Add this URL as a custom connector. Claude asks you to sign in to SEOforAgent, so no key goes in the URL.',
    language: 'text',
    snippet: () => MCP_URL,
    steps: [
      'Open Settings, then Connectors, then Add custom connector. Name it SEOforAgent, paste the URL above and leave the OAuth fields empty.',
      'Click Connect, sign in to SEOforAgent with your key or an email link, and allow the connection.',
      'In a new chat, turn the connector on and paste the setup prompt below.',
    ],
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    intro: 'Add this URL as a connector. ChatGPT asks you to sign in to SEOforAgent, so no key goes in the URL.',
    language: 'text',
    snippet: () => MCP_URL,
    steps: [
      'Open Settings, then Apps and connectors, then Advanced settings, and turn on developer mode.',
      'Choose Create, name it SEOforAgent, paste the URL above, pick OAuth, then sign in to SEOforAgent and allow the connection.',
      'In a new chat, add SEOforAgent from the tools menu and paste the setup prompt below.',
    ],
  },
];

export const AGENTS: AgentSetup[] = CLI_PUBLISHED ? [CLI_AGENT, ...MANUAL_AGENTS] : MANUAL_AGENTS;

export const agentById = (id: AgentId): AgentSetup | undefined => [CLI_AGENT, ...MANUAL_AGENTS].find((agent) => agent.id === id);

export const setupPrompt = (key: string = KEY_PLACEHOLDER): string =>
  [
    'Set up SEOforAgent for me.',
    '',
    `1. Connect the MCP server ${MCP_URL} with my API key as a Bearer token:`,
    `   ${key}`,
    '2. Call whoami. If the key is not active, show me the activation link and wait.',
    '3. Ask me for my website and create the project.',
    '4. Suggest the three most useful next steps for my site and what each costs.',
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
    `- ChatGPT and the Claude app: add ${MCP_URL} as a connector and sign in with OAuth. Apps that cannot set headers or do OAuth: ${pathKeyUrl(KEY_PLACEHOLDER)}`,
    `- Claude Code: \`claude mcp add --transport http seoforagent ${MCP_URL} --header "Authorization: Bearer ${KEY_PLACEHOLDER}"\``,
    ...(CLI_PUBLISHED ? [`- Or run \`${CLI_COMMAND}\`: it creates a key, prints the activation link and connects Claude Code.`] : []),
    '',
    `Full docs: ${SITE_URL}/docs.md`,
    '',
  ].join('\n');

import { describe, expect, it } from 'vitest';
import { authChallenge, authorizationServerMetadata, protectedResourceMetadata, surfaceFromPath } from '../lib/oauth';
import { LISTED_EXCLUDED_TOOLS, listedAnnotations, sanitizeListedEnvelope, surfaceTools } from '../lib/surfaces';
import { TOOLS } from '../lib/tools';

const DIRECTIVE_WORDS = /\b(human|never|always|ask the|tell the|you must|should)\b/i;

describe('directory surfaces', () => {
  it('leaves out link buying, checkout and pricing tools', () => {
    const names = surfaceTools('chatgpt').map((tool) => tool.name);
    expect(names).toHaveLength(TOOLS.length - LISTED_EXCLUDED_TOOLS.length);
    for (const excluded of ['backlinks_allocate', 'backlinks_quote', 'backlinks_buying_set', 'account_link', 'pricing_get']) {
      expect(names).not.toContain(excluded);
    }
    expect(names).toContain('ai_visibility_diagnose');
    expect(surfaceTools('direct')).toHaveLength(TOOLS.length);
  });

  it('describes every listed tool without prices or instructions to the model', () => {
    for (const tool of surfaceTools('claude')) {
      expect(tool.description, tool.name).not.toMatch(/\$\d/);
      expect(tool.description, tool.name).not.toMatch(DIRECTIVE_WORDS);
      expect(tool.description.length, tool.name).toBeGreaterThan(60);
    }
  });

  it('gives every listed tool explicit annotation booleans', () => {
    for (const tool of surfaceTools('chatgpt')) {
      const annotations = listedAnnotations(tool);
      expect(annotations.title).toBeTruthy();
      for (const hint of ['readOnlyHint', 'destructiveHint', 'openWorldHint'] as const) {
        expect(typeof annotations[hint], `${tool.name} ${hint}`).toBe('boolean');
      }
    }
    const share = surfaceTools('chatgpt').find((tool) => tool.name === 'results_share')!;
    expect(listedAnnotations(share).destructiveHint).toBe(true);
  });

  it('strips Outrank offers, buy options and purchase links from responses', () => {
    const cleaned = sanitizeListedEnvelope({
      ok: true,
      data: {
        actions: [{ title: 'Publish', outrank: { price: '$99 a month' } }],
        buy: [{ product: 'backlink' }],
        build: [{ domain: 'a.com' }],
      },
      error: { details: { top_up_url: 'https://seoforagent.com/app/billing?intent=top_up' } },
      agent_guidance: 'Activate at https://seoforagent.com/activate first.',
      next_actions: [
        { kind: 'offer', url: 'https://seoforagent.com/app/billing' },
        { kind: 'tool', tool: 'backlinks_quote' },
        { kind: 'tool', tool: 'listicles_find' },
      ],
    }) as { data: { actions: unknown[]; buy?: unknown; build: unknown[] }; error: { details: { top_up_url: string } }; agent_guidance: string; next_actions: unknown[] };
    expect(cleaned.data.actions[0]).toEqual({ title: 'Publish' });
    expect(cleaned.data.buy).toBeUndefined();
    expect(cleaned.data.build).toHaveLength(1);
    expect(cleaned.error.details.top_up_url).toBe('https://seoforagent.com/pricing');
    expect(cleaned.agent_guidance).toBe('Activate at https://seoforagent.com/pricing first.');
    expect(cleaned.next_actions).toEqual([{ kind: 'tool', tool: 'listicles_find' }]);
  });
});

describe('OAuth metadata', () => {
  it('maps metadata paths to MCP surfaces', () => {
    expect(surfaceFromPath(undefined)).toBe('direct');
    expect(surfaceFromPath(['mcp'])).toBe('direct');
    expect(surfaceFromPath(['mcp', 'chatgpt'])).toBe('chatgpt');
    expect(surfaceFromPath(['mcp', 'claude'])).toBe('claude');
    expect(surfaceFromPath(['other'])).toBeNull();
  });

  it('points each resource at this site as the authorization server', () => {
    expect(protectedResourceMetadata('chatgpt')).toMatchObject({
      resource: 'https://seoforagent.com/mcp/chatgpt',
      authorization_servers: ['https://seoforagent.com'],
    });
    const server = authorizationServerMetadata();
    expect(server.code_challenge_methods_supported).toEqual(['S256']);
    expect(server.registration_endpoint).toBe('https://seoforagent.com/oauth/register');
    expect(authChallenge('claude')).toContain('resource_metadata="https://seoforagent.com/.well-known/oauth-protected-resource/mcp/claude"');
    expect(authChallenge('direct', 'invalid_token')).toContain('error="invalid_token"');
  });
});

import { callBackend, forwardRaw } from './backend';
import { SITE_NAME, SITE_URL } from './config';

export type McpSurface = 'direct' | 'chatgpt' | 'claude';

export const MCP_SURFACE_PATHS: Record<McpSurface, string> = {
  direct: '/mcp',
  chatgpt: '/mcp/chatgpt',
  claude: '/mcp/claude',
};

export const OAUTH_SCOPE = 'mcp';
export const OAUTH_AUTHORIZE_PATH = '/oauth/authorize';
export const OAUTH_TOKEN_PATH = '/oauth/token';
export const OAUTH_REGISTER_PATH = '/oauth/register';
export const OAUTH_REVOKE_PATH = '/oauth/revoke';
export const PROTECTED_RESOURCE_METADATA_PATH = '/.well-known/oauth-protected-resource';
export const METADATA_CACHE_SECONDS = 300;

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, Mcp-Session-Id, Retry-After',
};

export const resourceUrl = (surface: McpSurface): string => `${SITE_URL}${MCP_SURFACE_PATHS[surface]}`;

export const surfaceFromPath = (segments: string[] | undefined): McpSurface | null => {
  const path = `/${(segments ?? []).join('/')}`.replace(/\/+$/, '') || '/';
  if (path === '/') return 'direct';
  const match = (Object.entries(MCP_SURFACE_PATHS) as [McpSurface, string][]).find(([, value]) => value === path);
  return match ? match[0] : null;
};

export const protectedResourceMetadata = (surface: McpSurface) => ({
  resource: resourceUrl(surface),
  authorization_servers: [SITE_URL],
  scopes_supported: [OAUTH_SCOPE],
  bearer_methods_supported: ['header'],
  resource_name: SITE_NAME,
  resource_documentation: `${SITE_URL}/docs`,
});

export const authorizationServerMetadata = () => ({
  issuer: SITE_URL,
  authorization_endpoint: `${SITE_URL}${OAUTH_AUTHORIZE_PATH}`,
  token_endpoint: `${SITE_URL}${OAUTH_TOKEN_PATH}`,
  registration_endpoint: `${SITE_URL}${OAUTH_REGISTER_PATH}`,
  revocation_endpoint: `${SITE_URL}${OAUTH_REVOKE_PATH}`,
  scopes_supported: [OAUTH_SCOPE],
  response_types_supported: ['code'],
  response_modes_supported: ['query'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
  token_endpoint_auth_methods_supported: ['none', 'client_secret_basic', 'client_secret_post'],
  revocation_endpoint_auth_methods_supported: ['none', 'client_secret_basic', 'client_secret_post'],
  code_challenge_methods_supported: ['S256'],
  service_documentation: `${SITE_URL}/docs`,
});

export const metadataResponse = (body: unknown): Response =>
  Response.json(body, { headers: { ...CORS_HEADERS, 'Cache-Control': `public, max-age=${METADATA_CACHE_SECONDS}` } });

export const corsPreflight = (): Response => new Response(null, { status: 204, headers: CORS_HEADERS });

export const authChallenge = (surface: McpSurface, error?: 'invalid_token'): string =>
  [
    `Bearer resource_metadata="${SITE_URL}${PROTECTED_RESOURCE_METADATA_PATH}${MCP_SURFACE_PATHS[surface]}"`,
    `scope="${OAUTH_SCOPE}"`,
    ...(error ? [`error="${error}"`, 'error_description="The access token is missing, expired or revoked."'] : []),
  ].join(', ');

export const OAUTH_ACCESS_TOKEN_PREFIX = 'outr_oat_';

export const isOAuthToken = (key: string): boolean => key.startsWith(OAUTH_ACCESS_TOKEN_PREFIX);

export const tokenIsRejected = async (key: string, forwardedFor?: string): Promise<boolean> => {
  try {
    const response = await callBackend({ method: 'GET', path: '/sfa/whoami', key, forwardedFor });
    return response.status === 401;
  } catch {
    return false;
  }
};

export const forwardOAuth = async (request: Request, backendPath: string, forwardedFor?: string): Promise<Response> => {
  const headers: Record<string, string> = {};
  const contentType = request.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;
  const authorization = request.headers.get('authorization');
  if (authorization) headers.Authorization = authorization;
  try {
    const upstream = await forwardRaw({ method: 'POST', path: backendPath, headers, body: await request.arrayBuffer(), forwardedFor });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...CORS_HEADERS, 'Content-Type': upstream.contentType || 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json(
      { error: 'temporarily_unavailable', error_description: 'SEOforAgent could not be reached. Try again in a moment.' },
      { status: 503, headers: CORS_HEADERS },
    );
  }
};

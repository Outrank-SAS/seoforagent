import { authorizationServerMetadata, corsPreflight, metadataResponse } from '@/lib/oauth';

export const dynamic = 'force-static';

export const GET = (): Response => metadataResponse(authorizationServerMetadata());

export const OPTIONS = (): Response => corsPreflight();

export const generateStaticParams = () => [{ path: [] }];

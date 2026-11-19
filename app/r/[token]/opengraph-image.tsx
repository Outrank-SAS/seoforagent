import { OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og';
import { shareImage } from '@/lib/share-card';

export const alt = 'A result shared from SEOforAgent';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 300;

const Image = async ({ params }: { params: Promise<{ token: string }> }) => shareImage((await params).token);

export default Image;

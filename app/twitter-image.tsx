import { ImageResponse } from 'next/og';
import { HomeCard, OG_CONTENT_TYPE, OG_SIZE, loadOgFonts } from '@/lib/og';

export const alt = 'SEOforAgent by Outrank: the SEO tool for AI agents';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const Image = async () => new ImageResponse(<HomeCard />, { ...OG_SIZE, fonts: await loadOgFonts() });

export default Image;

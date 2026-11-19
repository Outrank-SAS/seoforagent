import type { CSSProperties, ReactNode } from 'react';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

export const OG_COLORS = {
  ink: '#0d0d12',
  panel: '#16161d',
  line: 'rgba(255,255,255,0.12)',
  white: '#ffffff',
  soft: 'rgba(255,255,255,0.62)',
  faint: 'rgba(255,255,255,0.4)',
  accent: '#ea580c',
  ok: '#4ade80',
};

type FontWeight = 400 | 500 | 600;

export interface OgFont {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight;
  style: 'normal';
}

const FONT_SPECS: { name: string; family: string; weight: FontWeight }[] = [
  { name: 'Inter', family: 'Inter', weight: 600 },
  { name: 'Inter', family: 'Inter', weight: 400 },
  { name: 'JetBrains Mono', family: 'JetBrains+Mono', weight: 500 },
];

const loadGoogleFont = async (family: string, weight: number): Promise<ArrayBuffer | null> => {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 86400 },
    });
    if (!css.ok) return null;
    const url = (await css.text()).match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const font = await fetch(url, { signal: AbortSignal.timeout(6000), cache: 'force-cache' });
    return font.ok ? await font.arrayBuffer() : null;
  } catch {
    return null;
  }
};

export const loadOgFonts = async (): Promise<OgFont[] | undefined> => {
  const loaded = await Promise.all(
    FONT_SPECS.map(async (spec) => {
      const data = await loadGoogleFont(spec.family, spec.weight);
      return data ? ({ name: spec.name, data, weight: spec.weight, style: 'normal' } as OgFont) : null;
    }),
  );
  const fonts = loaded.filter((font): font is OgFont => font !== null);
  return fonts.length > 0 ? fonts : undefined;
};

export const SANS = 'Inter, Geist, sans-serif';
export const MONO = '"JetBrains Mono", Inter, Geist, monospace';

export const OgMark = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <rect width="24" height="24" rx="6" fill="#ffffff" />
    <path d="M7 8.5l3.5 3.5L7 15.5" fill="none" stroke="#0d0d12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="12.5" y="14" width="5" height="2" rx="1" fill="#c2410c" />
  </svg>
);

export const OgChevron = ({ size = 22, color = OG_COLORS.accent }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M8 5l8 7-8 7" fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const OgDot = ({ color = OG_COLORS.ok, size = 12 }: { color?: string; size?: number }) => (
  <div style={{ display: 'flex', width: size, height: size, borderRadius: size, backgroundColor: color }} />
);

export const OgLockup = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <OgMark size={46} />
    <div style={{ display: 'flex', fontFamily: SANS, fontSize: 32, fontWeight: 600, color: OG_COLORS.white, letterSpacing: -0.6 }}>SEOforAgent</div>
    <div style={{ display: 'flex', fontFamily: SANS, fontSize: 24, fontWeight: 400, color: OG_COLORS.faint, marginTop: 4 }}>by Outrank</div>
  </div>
);

export const OgFrame = ({ children, footer = 'seoforagent.com' }: { children: ReactNode; footer?: string }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: OG_COLORS.ink,
      padding: '52px 64px',
      color: OG_COLORS.white,
      fontFamily: SANS,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <OgLockup />
      <div style={{ display: 'flex', fontFamily: MONO, fontSize: 22, fontWeight: 500, color: OG_COLORS.faint }}>{footer}</div>
    </div>
    {children}
  </div>
);

export const OgTerminal = ({ title, children, style }: { title: string; children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 20,
      border: `1px solid ${OG_COLORS.line}`,
      backgroundColor: OG_COLORS.panel,
      ...style,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '16px 24px', borderBottom: `1px solid ${OG_COLORS.line}` }}>
      <OgDot color="rgba(255,255,255,0.16)" size={13} />
      <OgDot color="rgba(255,255,255,0.16)" size={13} />
      <OgDot color="rgba(255,255,255,0.16)" size={13} />
      <div style={{ display: 'flex', marginLeft: 12, fontFamily: MONO, fontSize: 19, fontWeight: 500, color: OG_COLORS.faint }}>{title}</div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '30px 28px 34px', fontFamily: MONO, fontSize: 25, fontWeight: 500 }}>{children}</div>
  </div>
);

export const HomeCard = () => (
  <OgFrame>
    <div style={{ display: 'flex', fontSize: 88, fontWeight: 600, letterSpacing: -3.5, lineHeight: 1.05, marginTop: 48 }}>The SEO tool for AI agents</div>
    <OgTerminal title="claude · seoforagent" style={{ marginTop: 44 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: OG_COLORS.white }}>
        <OgChevron />
        <div style={{ display: 'flex' }}>get me recommended by ChatGPT</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', width: 22, justifyContent: 'center' }}>
            <OgDot />
          </div>
          <div style={{ display: 'flex', color: OG_COLORS.white }}>ai_visibility_check</div>
          <div style={{ display: 'flex', color: OG_COLORS.faint }}>1 prompt, 4 assistants</div>
        </div>
        <div style={{ display: 'flex', color: OG_COLORS.soft }}>$0.32</div>
      </div>
      <div style={{ display: 'flex', paddingLeft: 38, color: OG_COLORS.soft }}>Mentioned in 0 of 4 answers. Most cited: freebeat.ai, stork.ai</div>
    </OgTerminal>
  </OgFrame>
);

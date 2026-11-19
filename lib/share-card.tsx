import { ImageResponse } from 'next/og';
import { HomeCard, MONO, OG_COLORS, OG_SIZE, OgDot, OgFrame, loadOgFonts } from './og';
import { engineLabel, sharedSubject, type SharedResult } from './shared';
import { fetchShared } from './shared-fetch';

const clip = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

const Label = ({ children }: { children: string }) => (
  <div style={{ display: 'flex', fontFamily: MONO, fontSize: 24, fontWeight: 500, color: OG_COLORS.soft, marginTop: 50 }}>{children}</div>
);

const Chip = ({ title, value, on }: { title: string; value: string; on: boolean }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      gap: 10,
      padding: '20px 24px',
      borderRadius: 18,
      border: `1px solid ${OG_COLORS.line}`,
      backgroundColor: OG_COLORS.panel,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 24, fontWeight: 400, color: OG_COLORS.soft }}>
      <OgDot color={on ? OG_COLORS.ok : 'rgba(255,255,255,0.22)'} />
      {title}
    </div>
    <div style={{ display: 'flex', fontFamily: MONO, fontSize: 34, fontWeight: 500, color: OG_COLORS.white }}>{value}</div>
  </div>
);

const AiCard = ({ result }: { result: SharedResult }) => {
  const ai = result.ai!;
  return (
    <OgFrame>
      <Label>{clip(`ai visibility check · ${sharedSubject(result)}`, 62)}</Label>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14, fontSize: 86, fontWeight: 600, letterSpacing: -3.4, lineHeight: 1.04 }}>
        <div style={{ display: 'flex' }}>
          Mentioned in {ai.mentioned} of {ai.answers}
        </div>
        <div style={{ display: 'flex', color: OG_COLORS.soft }}>AI answers</div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 'auto' }}>
        {ai.byEngine.slice(0, 4).map((engine) => (
          <Chip key={engine.engine} title={engineLabel(engine.engine)} value={`${engine.mentioned} of ${engine.answers}`} on={engine.mentioned > 0} />
        ))}
      </div>
    </OgFrame>
  );
};

const ListiclesCard = ({ result }: { result: SharedResult }) => {
  const lists = result.listicles!;
  const cited = lists.pages.filter((page) => page.citedBy.length > 0).length;
  const listed = lists.pages.filter((page) => page.listsYou).length;
  return (
    <OgFrame>
      <Label>{clip(`listicle hunt · ${lists.queries[0] ?? result.domain}`, 62)}</Label>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14, fontSize: 86, fontWeight: 600, letterSpacing: -3.4, lineHeight: 1.04 }}>
        <div style={{ display: 'flex' }}>
          {lists.pagesFound} {lists.pagesFound === 1 ? 'list ranks or gets cited' : 'lists rank or get cited'}
        </div>
        <div style={{ display: 'flex', color: OG_COLORS.soft }}>{lists.worthPaying} worth being on</div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 'auto' }}>
        <Chip title="Queries" value={String(lists.queries.length)} on />
        <Chip title="Cited by AI, top 20" value={String(cited)} on={cited > 0} />
        <Chip title={`Lists ${clip(result.domain || 'you', 18)}, top 20`} value={String(listed)} on={listed > 0} />
      </div>
    </OgFrame>
  );
};

export const shareImage = async (token: string): Promise<ImageResponse> => {
  const [lookup, fonts] = await Promise.all([fetchShared(token), loadOgFonts()]);
  const result = lookup.status === 'ok' ? lookup.result : null;
  const card = result?.ai ? <AiCard result={result} /> : result?.listicles ? <ListiclesCard result={result} /> : <HomeCard />;
  return new ImageResponse(card, { ...OG_SIZE, fonts });
};

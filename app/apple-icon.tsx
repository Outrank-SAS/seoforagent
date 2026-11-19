import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const AppleIcon = () =>
  new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0d12' }}>
        <svg width="132" height="132" viewBox="0 0 24 24">
          <path d="M7 8.5l3.5 3.5L7 15.5" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="12.5" y="14" width="5" height="2" rx="1" fill="#c2410c" />
        </svg>
      </div>
    ),
    size,
  );

export default AppleIcon;

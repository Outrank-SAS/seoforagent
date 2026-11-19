import { writeFile } from 'node:fs/promises';
import { createElement as h } from 'react';
import { ImageResponse } from 'next/dist/compiled/@vercel/og/index.node.js';

const SIZES = [16, 32, 48];

const mark = (size) =>
  h(
    'div',
    { style: { display: 'flex', width: '100%', height: '100%' } },
    h(
      'svg',
      { width: size, height: size, viewBox: '0 0 24 24' },
      h('rect', { width: 24, height: 24, rx: 6, fill: '#0d0d12' }),
      h('path', { d: 'M7 8.5l3.5 3.5L7 15.5', fill: 'none', stroke: '#ffffff', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      h('rect', { x: 12.5, y: 14, width: 5, height: 2, rx: 1, fill: '#c2410c' }),
    ),
  );

const pngs = await Promise.all(
  SIZES.map(async (size) => Buffer.from(await new ImageResponse(mark(size), { width: size, height: size }).arrayBuffer())),
);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(SIZES.length, 4);

let offset = 6 + 16 * SIZES.length;
const entries = SIZES.map((size, index) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0);
  entry.writeUInt8(size, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngs[index].length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += pngs[index].length;
  return entry;
});

const target = new URL('../app/favicon.ico', import.meta.url);
await writeFile(target, Buffer.concat([header, ...entries, ...pngs]));
console.log(`Wrote ${target.pathname} (${SIZES.join(', ')} px)`);

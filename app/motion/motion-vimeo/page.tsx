'use client';

/**
 * ===== Page knobs (edit in code) ==========================================
 * Spacing is percentage of the content column width so it scales with video size.
 * Heading sizes use clamp() so they scale with viewport.
 */
const UI = {
    
  TITLE_TO_VIDEO_GAP_PCT: 0.8,   // % gap between title and its video
  BLOCK_GAP_PCT: 10.0,            // % gap between video blocks

  // H1 (page heading) scale
  H1_CLAMP: 'clamp(1.5rem, 2.5vw, 2.25rem)',

  // H2 (video title) scale — tweak to taste
  H2_CLAMP: 'clamp(1.0rem, 1vw, 1.5rem)',   // min 16px, grows to 24px
  H2_WEIGHT: 400,                            // 400|500|600|700 etc
};
/* ======================================================================== */

type Video = { title: string; id: string };

const vimeoVideos: Video[] = [
  { title: 'Sliced', id: '970763165' },
  { title: 'Ghosts', id: '780124665' },
  { title: 'Bowers & Wilkins Zeppelin\nProduct film (Agency: Leagas Delaney London)', id: '642754279' },
  { title: 'Bowers & Wilkins Zeppelin\nTechnical film (Agency: Leagas Delaney London)', id: '642754188' },
  { title: 'Black Orchid', id: '454034873' },
  { title: 'Blocks2', id: '442699759' },
  { title: 'Blocks', id: '441021977' },
  { title: 'Knurled', id: '441025323' },
  { title: 'Bloom', id: '441032558' },
  { title: 'Cartier - Haute Parfumerie (film 1)', id: '426962738' },
  { title: 'Cartier - Haute Parfumerie (film 2)', id: '426962775' },
  { title: 'Cartier - Haute Parfumerie (film 3)', id: '426962687' },
  { title: 'X-ray flowers (1)', id: '426958374' },
  { title: 'X-ray flowers (2)', id: '426958959' },
  { title: 'X-ray flowers (3)', id: '426990989' },
  { title: 'Leather & Lenses', id: '335145897' },
  { title: 'Watch', id: '341982840' },
  { title: 'Rolex A', id: '342232276' },
  { title: 'Glass Room', id: '342309648' },
];

export default function MotionVimeoPage() {
  const vars = {
    ['--title-gap-pct' as any]: String(UI.TITLE_TO_VIDEO_GAP_PCT),
    ['--block-gap-pct' as any]: String(UI.BLOCK_GAP_PCT),
    ['--h1-clamp' as any]: UI.H1_CLAMP,
    ['--h2-clamp' as any]: UI.H2_CLAMP,
    ['--h2-weight' as any]: String(UI.H2_WEIGHT),
  };

  return (
    <main className="w-full px-4 sm:px-6 lg:px-8" style={vars}>
      <h1 className="font-bold mt-6 mb-4" style={{ fontSize: 'var(--h1-clamp)' }}>
        Motion*
      </h1>

      {/* Vertical stack; no grid/flex so globals can’t interfere */}
      <div className="stack">
        {vimeoVideos.map((v) => (
          <section key={v.id} className="item">
            <h2 className="title">{v.title}</h2>
            <div className="vwrap">
              <iframe
                src={`https://player.vimeo.com/video/${v.id}?loop=1&title=0&byline=0&portrait=0&dnt=1`}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={v.title}
                loading="lazy"
              />
            </div>
          </section>
        ))}
      </div>

      <style jsx>{`
        .stack { display: block; }
        /* Inter-item gap scales with content width */
        .stack > .item {
          margin-bottom: clamp(12px, calc(var(--block-gap-pct, 3) * 1%), 64px);
        }

        /* Responsive H2 titles */
        .title {
          font-size: var(--h2-clamp);
          font-weight: var(--h2-weight);
          line-height: 1.25;
          white-space: pre-line;
          margin: 0 0 clamp(4px, calc(var(--title-gap-pct, 0.8) * 1%), 24px) 0;
          hyphens: auto;
          word-break: normal;
          overflow-wrap: anywhere;
        }

        /* Contained, responsive 16:9 player tied to column width */
        .vwrap { width: 100%; aspect-ratio: 16 / 9; }
        .vwrap iframe { width: 100%; height: 100%; border: 0; display: block; }

        /* Fallback for older browsers without aspect-ratio */
        @supports not (aspect-ratio: 16 / 9) {
          .vwrap { position: relative; height: 0; padding-top: 56.25%; overflow: hidden; }
          .vwrap iframe { position: absolute; inset: 0; }
        }
      `}</style>
    </main>
  );
}

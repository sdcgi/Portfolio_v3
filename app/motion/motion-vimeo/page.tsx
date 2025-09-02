'use client';

type Video = { title: string; id: string };

const vimeoVideos: Video[] = [
  { title: 'Ghosts', id: '780124665' },
  { title: 'Bowers & Wilkins Zeppelin - Product film (Agency: Leagas Delaney London)', id: '642754279' },
  { title: 'Bowers & Wilkins Zeppelin - Technical film (Agency: Leagas Delaney London)', id: '642754188' },
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
  return (
    <main className="w-screen px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mt-6 mb-6">Motion</h1>

      {vimeoVideos.map((v) => (
        <section key={v.id} className="mb-8">
          <h2 className="text-lg font-semibold mb-2">{v.title}</h2>
          <div className="vx">
            <iframe
              src={`https://player.vimeo.com/video/${v.id}?loop=1&title=0&byline=0&portrait=0&dnt=1`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={v.title}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </section>
      ))}

      <style jsx>{`
        /* Full-bleed container with side padding already handled by <main> */
        .vx {
          position: relative;
          width: 100vw;         /* fill the viewport width */
          left: 50%;
          right: 50%;
          margin-left: -50vw;   /* break out of any parent max-width */
          margin-right: -50vw;
          padding-left: var(--vx-pad, 0);  /* optional, unused here */
          padding-right: var(--vx-pad, 0);
        }
        /* Responsive 16:9 */
        .vx {
          padding-top: 56.25%;  /* 16:9 */
          height: 0;
          overflow: hidden;
        }
        .vx iframe {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          display: block;
        }
        @media (min-width: 640px) {
          :global(main) { padding-left: 1.5rem; padding-right: 1.5rem; }
        }
        @media (min-width: 1024px) {
          :global(main) { padding-left: 2rem; padding-right: 2rem; }
        }
      `}</style>
    </main>
  );
}

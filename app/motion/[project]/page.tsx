//app/motion/[project]/page.tsx

'use client';
import { useEffect, useState } from 'react';
import Grid, { type Tile } from '@/components/Grid';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function MotionProject({ params }: { params: { project: string } }){
  const [tiles, setTiles] = useState<Tile[] | null>(null);
  useEffect(()=>{
    const p = `/Motion/${encodeURIComponent(decodeURIComponent(params.project))}/manifest.json`;
    fetch(p, { cache: 'no-cache' }).then(r=> r.ok ? r.json() : null).then((m)=>{
      const t: Tile[] = (m?.items||[]).map((it: any)=> ({ kind: 'video', key: it.key, displayName: it.displayName, url: it.url, poster: it.poster || null }));
      setTiles(t);
    });
  }, [params.project]);
  return (
    <div>
      <Breadcrumbs baseLabel="Motion" />
      {tiles === null ? null : <Grid items={tiles} ratio="16/9" desktopCols={4} />}
    </div>
  );
}

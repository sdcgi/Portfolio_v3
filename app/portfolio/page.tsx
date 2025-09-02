/* path: app/portfolio/page.tsx */
// app/portfolio/page.tsx
'use client';
import Grid, { type Tile } from '@/components/Grid';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useEffect, useState } from 'react';

type Counts = { images?: number; folders?: number };
type Folder = { name: string; displayName: string; path: string; cover: string | null; counts?: Counts };

export default function PortfolioTop(){
  const [tiles, setTiles] = useState<Tile[] | null>(null);

  useEffect(()=>{
    fetch('/Portfolio/manifest.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((m)=>{
        const folders: Folder[] = (m?.folders) || [];
        const t: Tile[] = folders.map(f => ({
          kind: 'folder',
          path: `/portfolio${decodeURI(f.path).replace('/Portfolio','')}`,
          displayName: f.displayName || f.name,
          cover: f.cover,
          counts: f.counts
        }));
        setTiles(t);
      })
      .catch(()=> setTiles([]));
  },[]);

return (
  <>
    <div className="crumbs-row">
      <Breadcrumbs />
    </div>

    <div className="page-content">
      <section className="bleed-mobile">
        <Grid items={tiles ?? []} />
      </section>
    </div>
  </>
);
}

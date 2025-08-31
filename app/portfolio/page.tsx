'use client';
import Grid, { type Tile } from '@/components/Grid';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useEffect, useState } from 'react';

type Folder = { name: string; displayName: string; path: string; cover: string | null; counts?: { images?: number; folders?: number } };

export default function PortfolioTop(){
  const [tiles, setTiles] = useState<Tile[] | null>(null);

  useEffect(()=>{
    fetch('/Portfolio/manifest.json', { cache: 'force-cache' })
      .then(r => r.ok ? r.json() : null)
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
    <div>
      <Breadcrumbs baseLabel="Stills" />
      {tiles === null ? null : <Grid items={tiles} ratio="1/1" desktopCols={4} />}
    </div>
  );
}

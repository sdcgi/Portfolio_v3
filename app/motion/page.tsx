
'use client';
import Grid, { type Tile } from '@/components/Grid';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useEffect, useState } from 'react';

type Project = { name: string; displayName: string; path: string; coverPoster: string | null; count: { videos: number } };

export default function MotionTop(){
  const [tiles, setTiles] = useState<Tile[] | null>(null);
  useEffect(()=>{
    fetch('/Motion/manifest.json', { cache: 'force-cache' }).then(r=> r.ok ? r.json() : null).then((m)=>{
      const projects: Project[] = (m?.projects)||[];
      const leaves: any[] = (m?.leafVideos)||[];
  const t: Tile[] = [
    ...projects.map(p => ({ kind: 'folder' as const, path: `/motion${p.path.replace('/Motion','')}`, displayName: p.displayName || p.name, cover: p.coverPoster, counts: { videos: p.count?.videos || 0 } })),
    ...leaves.map(v => ({ kind: 'video' as const, key: v.key, displayName: v.displayName, url: v.url, poster: v.poster ?? null }))      ];
      setTiles(t);
    }).catch(()=> setTiles([]));
  },[]);

  return (
    <div>
      <Breadcrumbs baseLabel="Motion" />
      {tiles === null ? null : <Grid items={tiles} ratio="16/9" desktopCols={4} />}
    </div>
  );
}

'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import Grid, { type Tile } from '@/components/Grid';
import Breadcrumbs from '@/components/Breadcrumbs';
import LightboxVideo from '@/components/LightboxVideo';

type Project = { name:string; displayName:string; path:string; coverPoster:string|null; count?:{videos:number} };
type Leaf = { key:string; displayName:string; url:string; poster:string|null };

export default function MotionTop(){
  const [tiles, setTiles] = useState<Tile[] | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(()=>{
    fetch('/Motion/manifest.json', { cache: 'no-store' })
      .then(r=> r.ok ? r.json() : null)
      .then((m)=>{
        const projects: Project[] = (m?.projects)||[];
        const leaves: Leaf[] = (m?.leafVideos)||[];
        const t: Tile[] = [
          ...projects.map(p => ({ kind: 'folder' as const, path: `/motion${decodeURI(p.path).replace('/Motion','')}`, displayName: p.displayName || p.name, cover: p.coverPoster, counts: { videos: p.count?.videos || 0 } })),
          ...leaves.map(v => ({ kind: 'video' as const, key: v.key, displayName: v.displayName, url: v.url, poster: v.poster ?? null }))
        ];
        setTiles(t);
      })
      .catch(()=> setTiles([]));
  },[]);

  const videos = useMemo(() => (tiles||[]).filter(t => t.kind === 'video') as Extract<Tile,{kind:'video'}>[], [tiles]);

  const onItemClick = useCallback((item: Tile, idx: number) => {
    if (item.kind === 'video') {
      const i = videos.findIndex(v => v === item);
      setOpenIndex(i >= 0 ? i : idx);
    }
  }, [videos]);

  const close = () => setOpenIndex(null);
  const prev  = () => setOpenIndex(i => (i==null?null : (i + videos.length - 1) % videos.length));
  const next  = () => setOpenIndex(i => (i==null?null : (i + 1) % videos.length));

  return (
    <div>
      <Breadcrumbs baseLabel="Motion" />
      {tiles === null ? null : <Grid items={tiles} ratio="16/9" desktopCols={4} onItemClick={onItemClick} />}
      {openIndex != null && videos[openIndex] && (
        <LightboxVideo url={(videos[openIndex] as any).url} onClose={close} onPrev={videos.length>1?prev:undefined} onNext={videos.length>1?next:undefined} />
      )}
    </div>
  );
}

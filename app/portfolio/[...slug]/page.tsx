'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import Grid, { type Tile } from '@/components/Grid';
import Breadcrumbs from '@/components/Breadcrumbs';
import LightboxImage from '@/components/LightboxImage';

export default function GalleryPage({ params }: { params: { slug: string[] } }){
  const [tiles, setTiles] = useState<Tile[] | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const slugPath = '/' + (params.slug?.map(encodeURIComponent).join('/') || '');

  useEffect(()=>{
    const p = `/Portfolio${slugPath}/manifest.json`;
    fetch(p, { cache: 'force-cache' }).then(r=> r.ok ? r.json() : null).then((m)=>{
      if(!m) { setTiles([]); return; }
      if (Array.isArray(m.folders) && m.folders.length) {
        const t: Tile[] = m.folders.map((f: any) => ({ kind: 'folder', path: `/portfolio${f.path.replace('/Portfolio','')}`, displayName: f.displayName || f.name, cover: f.cover, counts: f.counts }));
        setTiles(t);
      } else {
        const t: Tile[] = (m.items||[]).map((it: any)=> ({ kind: 'image', src: it.src, alt: it.alt || '' }));
        setTiles(t);
      }
    });
  }, [slugPath]);

  const images = useMemo(() => (tiles||[]).filter(t => t.kind === 'image') as {kind:'image', src:string, alt?:string}[], [tiles]);

  const onItemClick = useCallback((item: Tile, index: number) => {
    if (item.kind === 'image') {
      // translate index among image-only array
      const imgIndex = images.findIndex((im) => im.src === item.src);
      if (imgIndex >= 0) setOpenIndex(imgIndex);
    }
  }, [images]);

  const close = () => setOpenIndex(null);
  const prev  = () => setOpenIndex((i) => (i == null ? null : (i + images.length - 1) % images.length));
  const next  = () => setOpenIndex((i) => (i == null ? null : (i + 1) % images.length));

  return (
    <div>
      <Breadcrumbs baseLabel="Stills" />
      {tiles === null ? null : <Grid items={tiles} ratio="1/1" desktopCols={4} onItemClick={onItemClick} />}

      {openIndex != null && images[openIndex] && (
        <LightboxImage
          src={images[openIndex].src}
          alt={images[openIndex].alt}
          onClose={close}
          onPrev={images.length > 1 ? prev : undefined}
          onNext={images.length > 1 ? next : undefined}
        />
      )}
    </div>
  );
}

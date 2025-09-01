// app/portfolio/[...slug]/page.tsx
'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Grid, { type Tile } from '@/components/Grid';
import Breadcrumbs from '@/components/Breadcrumbs';
import LightboxImage from '@/components/LightboxImage';

type Counts = { images?: number; folders?: number };
type Folder = { name: string; displayName: string; path: string; cover: string | null; counts?: Counts };
type LeafItem = { src: string; alt?: string };
type FolderManifest =
  | {
      kind: 'portfolio-folder';
      cover?: string | null;
      folders: Folder[];
      maxColumns?: number;
      aspectRatio?: string; // "0" | "x/y"
      titleDisplay?: 0 | 1;
    }
  | {
      kind: 'stills-gallery';
      cover?: string | null;
      items: LeafItem[];
      maxColumns?: number;
      aspectRatio?: string; // "0" | "x/y"
      titleDisplay?: 0 | 1;
    };

export default function GalleryPage({ params }: { params: { slug: string[] } }){
  const [tiles, setTiles] = useState<Tile[] | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // overrides from manifest
  const [maxColumns, setMaxColumns] = useState<number | null>(null);
  const [ratioOverride, setRatioOverride] = useState<string | null>(null);
  const [showTitles, setShowTitles] = useState<boolean | undefined>(undefined);

  const paramsHook = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const slugPath = '/' + ((params.slug ?? []).map(s => encodeURIComponent(decodeURIComponent(s))).join('/') || '');

  useEffect(()=>{
    const p = `/Portfolio${slugPath}/manifest.json`;
    fetch(p, { cache: 'no-store' })
      .then(r=> r.ok ? r.json() : null)
      .then((m: FolderManifest | null)=>{
        if(!m) { setTiles([]); return; }

        // map to tiles
        if ('folders' in m && Array.isArray(m.folders) && m.folders.length) {
          const t: Tile[] = m.folders.map((f) => ({
            kind: 'folder' as const,
            path: `/portfolio${decodeURI(f.path).replace('/Portfolio','')}`,
            displayName: f.displayName || f.name,
            cover: f.cover,
            counts: f.counts
          }));
          setTiles(t);
        } else {
          const t: Tile[] = ('items' in m ? m.items : []).map((it)=> ({
            kind: 'image' as const, src: it.src, alt: it.alt || ''
          }));
          setTiles(t);
        }

        // capture overrides (present on both folder+leaf manifests)
        const mc = typeof m.maxColumns === 'number' && m.maxColumns >= 1 && m.maxColumns <= 8 ? m.maxColumns : null;
        setMaxColumns(mc);
        const ar = m.aspectRatio === '0' ? null : (typeof m.aspectRatio === 'string' ? m.aspectRatio : null);
        setRatioOverride(ar);
        const td = m.titleDisplay === 0 ? false : (m.titleDisplay === 1 ? true : undefined);
        setShowTitles(td);
      });
  }, [slugPath]);

  const images = useMemo(
    () => (tiles||[]).filter(t => t.kind === 'image') as Extract<Tile,{kind:'image'}>[],
    [tiles]
  );
  const isLeaf = images.length > 0;

  // Sync URL ?i= to lightbox ONLY on leaf pages; clear it otherwise.
  useEffect(()=>{
    if (!isLeaf) {
      if (paramsHook.get('i') !== null) router.replace(pathname, { scroll: false });
      setOpenIndex(null);
      return;
    }
    const raw = paramsHook.get('i');
    if (raw === null) { setOpenIndex(null); return; }
    const i = Number(raw);
    if (Number.isFinite(i) && i >= 0 && i < images.length) setOpenIndex(i);
    else setOpenIndex(null);
  }, [isLeaf, images.length, paramsHook, pathname, router]);

  // Preload next image for smoother next/advance
  useEffect(()=>{
    if (openIndex == null || images.length < 2) return;
    const nxt = images[(openIndex + 1) % images.length]?.src;
    if (nxt) { const im = new Image(); im.src = nxt; }
  }, [openIndex, images]);

  const onItemClick = useCallback((item: Tile) => {
    if (item.kind !== 'image') return;
    const idx = images.findIndex((im) => im.src === item.src);
    if (idx >= 0) router.replace(`${pathname}?i=${idx}`, { scroll: false });
  }, [images, pathname, router]);

  const close = () => {
    setOpenIndex(null);
    router.replace(pathname, { scroll: false });
  };
  const prev  = () => setOpenIndex(i => (i==null?null : (i + images.length - 1) % images.length));
  const next  = () => setOpenIndex(i => (i==null?null : (i + 1) % images.length));

  // CSS vars so overrides work even if Grid ignores props
  const cssVars = useMemo(() => {
    const vars: Record<string, string | number> = {};
    if (maxColumns != null) vars['--grid-max-cols' as any] = String(maxColumns);
    if (ratioOverride)      vars['--grid-ratio'    as any] = ratioOverride; // e.g. "3/2"
    if (showTitles !== undefined) vars['--show-titles' as any] = showTitles ? 1 : 0;
    return vars;
  }, [maxColumns, ratioOverride, showTitles]);

  return (
    <div>
      <Breadcrumbs baseLabel="Stills" />
      {tiles === null ? null : (
        <div style={cssVars}>
          <Grid
            items={tiles}
            ratio={ratioOverride ?? (isLeaf ? '1 / 1' : 'var(--tile-aspect-sub)')}
            level={isLeaf ? 'leaf' : 'sub'}
            desktopCols={maxColumns ?? 4}
            onItemClick={onItemClick}
            {...(showTitles !== undefined ? { showTitles } : {})}
          />
        </div>
      )}

      {openIndex != null && isLeaf && images[openIndex] && (
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

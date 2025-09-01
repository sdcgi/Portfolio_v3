/* app/portfolio/[...slug]/page.tsx */
'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Grid, { type Tile } from '@/components/Grid';
import Breadcrumbs from '@/components/Breadcrumbs';
import LightboxImage from '@/components/LightboxImage';

type Counts = { images?: number; folders?: number; videos?: number };
type Folder = { name: string; displayName?: string; path: string; cover: string | null; counts?: Counts };
type LeafItem = { src: string; alt?: string };

// Be permissive with shapes/keys coming from different generators
type FolderManifestLoose = {
  kind?: string;
  cover?: string | null;

  // content
  folders?: Folder[];
  items?: LeafItem[];
  images?: LeafItem[]; // (.images style)

  // overrides (snake_case preferred; camel tolerated)
  max_columns?: number;
  maxColumns?: number;

  aspect_ratio?: string;
  aspectRatio?: string;

  title_display?: 0 | 1;
  titleDisplay?: 0 | 1;
} | null;

export default function GalleryPage({ params }: { params: { slug: string[] } }){
  const [tiles, setTiles] = useState<Tile[] | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Manifest-driven overrides (all optional)
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
      .then((m: FolderManifestLoose)=>{
        if(!m) { setTiles([]); setMaxColumns(null); setRatioOverride(null); setShowTitles(undefined); return; }

        // CONTENT
        if (Array.isArray(m.folders) && m.folders.length) {
          const t: Tile[] = m.folders.map((f) => ({
            kind: 'folder' as const,
            path: `/portfolio${decodeURI(f.path).replace('/Portfolio','')}`,
            displayName: f.displayName || f.name,
            cover: f.cover,
            counts: f.counts
          }));
          setTiles(t);
        } else {
          // accept items OR images (cheat-sheet style)
          const arr = (Array.isArray(m.items) ? m.items : (Array.isArray(m.images) ? m.images : []));
          const t: Tile[] = arr.map((it)=> ({ kind: 'image' as const, src: it.src, alt: it.alt || '' }));
          setTiles(t);
        }

        // OVERRIDES — prefer snake_case keys
        const mc = (typeof m.max_columns === 'number' ? m.max_columns
                 : typeof m.maxColumns  === 'number' ? m.maxColumns
                 : null);
        setMaxColumns((mc != null && mc >= 1 && mc <= 8) ? mc : null);

        const arRaw = (typeof m.aspect_ratio === 'string' && m.aspect_ratio.trim())
                   ? m.aspect_ratio
                   : (typeof m.aspectRatio === 'string' && m.aspectRatio.trim())
                   ? m.aspectRatio
                   : null;
        setRatioOverride(arRaw);

        const tdRaw = (m.title_display === 0 || m.title_display === 1) ? m.title_display
                   : (m.titleDisplay === 0 || m.titleDisplay === 1) ? m.titleDisplay
                   : undefined;
        setShowTitles(tdRaw === 0 ? false : (tdRaw === 1 ? true : undefined));
      });
  }, [slugPath]);

  const images = useMemo(
    () => (tiles||[]).filter(t => t.kind === 'image') as Extract<Tile,{kind:'image'}>[],
    [tiles]
  );
  const isLeaf = images.length > 0;

  // Sync ?i= with lightbox on leaves
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

  // Preload next image
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

  // Inline CSS vars container for per-folder overrides:
  // Only set --grid-ratio if an aspect override exists.
const wrapperStyle = ratioOverride
  ? ({
      '--grid-ratio': ratioOverride,      // enforce folder aspect
      '--leaf-native-aspect': 0           // disable native so it can't overwrite it
    } as React.CSSProperties)
  : undefined;

  return (
    <div>
      <Breadcrumbs baseLabel="Stills" />

      {tiles === null ? null : (
        <div style={wrapperStyle}>
          <Grid
            items={tiles}
            level={isLeaf ? 'leaf' : 'sub'}
            {...(maxColumns != null ? { desktopCols: maxColumns } : {})}
            {...(showTitles !== undefined ? { showTitles } : {})}
            onItemClick={onItemClick}
          />
        </div>
      )}

      {openIndex != null && isLeaf && images[openIndex] && (
        <LightboxImage
          src={images[openIndex].src}
          alt={images[openIndex].alt}
          onClose={() => { setOpenIndex(null); router.replace(pathname, { scroll: false }); }}
          onPrev={images.length > 1 ? () => setOpenIndex(i => (i==null?null : (i + images.length - 1) % images.length)) : undefined}
          onNext={images.length > 1 ? () => setOpenIndex(i => (i==null?null : (i + 1) % images.length)) : undefined}
        />
      )}
    </div>
  );
}

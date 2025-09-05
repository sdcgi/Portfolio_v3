/* /app/portfolio/[...slug]/page.tsx */
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Grid, { type Tile } from '@/components/Grid';
import Breadcrumbs from '@/components/Breadcrumbs';
import LightboxImage from '@/components/LightboxImage';

export default function GalleryPage({ params }: { params: { slug: string[] } }) {
  const [tiles, setTiles] = useState<Tile[] | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [cols, setCols] = useState<number | undefined>(undefined); // per-folder maxColumns

  const paramsHook = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const slugPath =
    '/' + ((params.slug ?? []).map((s) => encodeURIComponent(decodeURIComponent(s))).join('/') || '');

  // Fetch manifest for this folder (sub-gallery or leaf)
  useEffect(() => {
    const p = `/Portfolio${slugPath}/manifest.json`;
    fetch(p, { cache: 'force-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (!m) {
          setTiles([]);
          setCols(undefined);
          return;
        }

        if (Array.isArray(m.folders) && m.folders.length) {
          // sub-gallery listing
          const t: Tile[] = m.folders.map((f: any) => ({
            kind: 'folder' as const,
            path: `/portfolio${decodeURI(f.path).replace('/Portfolio', '')}`,
            displayName: f.displayName || f.name,
            cover: f.cover,
            counts: f.counts,
          }));
          setTiles(t);
        } else {
          // leaf images listing
          const t: Tile[] = (m.items || []).map((it: any) => ({
            kind: 'image' as const,
            src: it.src,
            alt: it.alt || '',
          }));
          setTiles(t);
        }

        // read max columns (supports camelCase or snake_case)
        const raw = Number(
          m?.maxColumns ??
          m?.overrides?.maxColumns ??
          m?.max_columns ??
          m?.overrides?.max_columns
        );
        const computed = Number.isFinite(raw) ? Math.max(1, Math.min(raw, 8)) : undefined;
        setCols(computed);
      })
      .catch(() => {
        setTiles([]);
        setCols(undefined);
      });
  }, [slugPath]);

const images: ImageTile[] = useMemo(
    () => ((tiles || []).filter((t) => t.kind === 'image') as ImageTile[]),
    [tiles]
  );
  
  const isLeaf = images.length > 0;

  // Sync URL ?i= to lightbox ONLY on leaf pages; clear it otherwise.
  useEffect(() => {
    if (!isLeaf) {
      if (paramsHook.get('i') !== null) router.replace(pathname, { scroll: false });
      setOpenIndex(null);
      return;
    }
    const raw = paramsHook.get('i');
    if (raw === null) {
      setOpenIndex(null);
      return;
    }
    const i = Number(raw);
    if (Number.isFinite(i) && i >= 0 && i < images.length) setOpenIndex(i);
    else setOpenIndex(null);
  }, [isLeaf, images.length, paramsHook, pathname, router]);

  // Preload next image for smoother next/advance
  useEffect(() => {
    if (openIndex == null || images.length < 2) return;
    const nxt = images[(openIndex + 1) % images.length]?.src;
    if (nxt) {
      const im = new Image();
      im.src = nxt;
    }
  }, [openIndex, images]);

  const onItemClick = useCallback(
    (item: Tile) => {
      if (item.kind !== 'image') return;
      const idx = images.findIndex((im) => im.src === item.src);
      if (idx >= 0) router.replace(`${pathname}?i=${idx}`, { scroll: false });
    },
    [images, pathname, router]
  );

  const close = () => {
    setOpenIndex(null);
    router.replace(pathname, { scroll: false }); // clear ?i
  };
  const prev = () =>
    setOpenIndex((i) => (i == null ? null : (i + images.length - 1) % images.length));
  const next = () =>
    setOpenIndex((i) => (i == null ? null : (i + 1) % images.length));

  return (
    <div className="content">
      <Breadcrumbs baseLabel="Stills" />
      <section className="bleed-mobile">
        {tiles === null ? null : (
          <Grid
            items={tiles}
            ratio={isLeaf ? '1 / 1' : 'var(--tile-aspect-sub)'}
            level={isLeaf ? 'leaf' : 'sub'}
            desktopCols={cols}   // per-folder maxColumns → CSS (--cols-active)
            onItemClick={onItemClick}
          />
        )}
      </section>

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

'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export type FolderTile = {
  kind: 'folder';
  path: string;
  displayName: string;
  cover: string | null;
  counts?: { images?: number; folders?: number; videos?: number };
};
export type ImageTile  = { kind: 'image'; src: string; alt?: string };
export type VideoTile  = { kind: 'video'; key: string; displayName: string; url: string; poster: string | null };
export type Tile = FolderTile | ImageTile | VideoTile;

type Level = 'top' | 'sub' | 'leaf' | 'motion-top';

export default function Grid({
  items,
  ratio = '1 / 1',
  desktopCols = 4,
  enableDensityToggle = true,
  onItemClick,
  level = 'sub',
}: {
  items: Tile[];
  ratio?: string;               // CSS aspect-ratio (e.g., '1 / 1' or 'var(--tile-aspect-top)')
  desktopCols?: number;         // 3..6
  enableDensityToggle?: boolean;
  onItemClick?: (item: Tile, index: number) => void;
  level?: Level;                // tells us which knobs to read
}) {
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const cols = Math.max(3, Math.min(6, desktopCols));

  const allImages = useMemo(() => items.every(it => (it as any).kind === 'image'), [items]);

  const computedCols = useMemo(() => {
    if (items.length === 1) return 1;
    if (items.length === 2) return 2;
    if (allImages && items.length === 3) return 3;
    return cols;
  }, [items.length, cols, allImages]);

  const isSingleImageGrid = useMemo(() => allImages && items.length === 1, [allImages, items]);
  const isThreeImageLeaf = useMemo(() => allImages && items.length === 3, [allImages, items]);

  // read CSS variables for show/hide controls (per level)
  const showFlags = useMemo(() => {
    if (typeof window === 'undefined') {
      return { titles: level === 'top' ? 0 : 0, counts: 1 };
    }
    const cs = getComputedStyle(document.documentElement);
    const pick = (name: string, def = '1') => Number((cs.getPropertyValue(name).trim() || def)) > 0;
    if (level === 'top') return { titles: pick('--show-top-titles','0'), counts: pick('--show-top-counts','1') };
    if (level === 'sub') return { titles: pick('--show-sub-titles','0'), counts: pick('--show-sub-counts','1') };
    return { titles: false, counts: false }; // leaf/images don't show labels below tiles
  }, [level]);

  return (
    <div className="page-inner">
      <div className="grid-toolbar">
        <div />
        {enableDensityToggle && (
          <div className="density" role="group" aria-label="Density">
            <button aria-pressed={density==='comfortable'} onClick={()=>setDensity('comfortable')}>Comfortable</button>
            <button aria-pressed={density==='compact'} onClick={()=>setDensity('compact')}>Compact</button>
          </div>
        )}
      </div>

      <div
        className={`grid ${isSingleImageGrid ? 'single-one' : ''} ${isThreeImageLeaf ? 'cols-3' : ''}`}
        style={{ ['--cols' as any]: computedCols, ['--gap' as any]: density==='compact' ? 'var(--gap-compact)' : 'var(--gap-comfy)' }}
      >
        {items.map((it, i) => (
          <TileView
            key={i}
            item={it}
            ratio={ratio}
            onClick={() => onItemClick?.(it, i)}
            single={isSingleImageGrid}
            showTitle={showFlags.titles}
            showCount={showFlags.counts}
          />
        ))}
      </div>
    </div>
  );
}

function TileView({
  item, ratio, onClick, single, showTitle, showCount
}: {
  item: Tile; ratio: string; onClick?: () => void; single?: boolean;
  showTitle?: boolean; showCount?: boolean;
}) {
  if (item.kind === 'folder') {
    const countText = getCount(item);
    return (
      <div className="tile">
        {/* Only the image is a link */}
        <Link href={item.path} prefetch className="block-link">
          <div className="media" style={{ ['--ratio' as any]: ratio }}>
            {item.cover && (
              <Image src={item.cover} alt={item.displayName} fill sizes="(max-width:739px) 100vw, (max-width:1099px) 50vw, 33vw" />
            )}
          </div>
        </Link>
        <div className="meta">
          {showTitle && <div className="label">{item.displayName}</div>}
          {showCount && countText && <div className="count">{countText}</div>}
        </div>
      </div>
    );
  }

  if (item.kind === 'image') {
    return (
      <div
        className={`tile clickable ${single ? 'single-leaf' : ''}`}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => ((e.key === 'Enter' || e.key === ' ') && onClick?.())}
      >
        <div className="media" style={{ ['--ratio' as any]: ratio }}>
          <Image src={item.src} alt={item.alt || ''} fill sizes="(max-width:739px) 100vw, (max-width:1099px) 50vw, 33vw" />
        </div>
      </div>
    );
  }

  // video tile (keep short label under poster for Motion if desired)
  return (
    <div
      className="tile clickable"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => ((e.key === 'Enter' || e.key === ' ') && onClick?.())}
    >
      <div className="media" style={{ ['--ratio' as any]: '16 / 9' }}>
        {item.poster && <Image src={item.poster} alt={item.displayName} fill sizes="(max-width:739px) 100vw, (max-width:1099px) 50vw, 33vw" />}
      </div>
      <div className="meta">
        <div className="label">{item.displayName}</div>
      </div>
    </div>
  );
}

function getCount(item: FolderTile){
  if (item.counts?.images) return `${item.counts.images} images`;
  if (item.counts?.videos) return `${item.counts.videos} videos`;
  if (item.counts?.folders) return `${item.counts.folders} folders`;
  return '';
}

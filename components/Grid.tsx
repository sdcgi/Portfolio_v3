// components/Grid.tsx
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export type FolderTile = { kind: 'folder'; path: string; displayName: string; cover: string | null; counts?: { images?: number; folders?: number; videos?: number } };
export type ImageTile  = { kind: 'image'; src: string; alt?: string };
export type VideoTile  = { kind: 'video'; key: string; displayName: string; url: string; poster: string | null };
export type Tile = FolderTile | ImageTile | VideoTile;

export default function Grid({
  items,
  ratio = '1/1',
  desktopCols = 4,
  enableDensityToggle = true,
  onItemClick,
}: {
  items: Tile[];
  ratio?: string;               // CSS aspect-ratio
  desktopCols?: number;         // 3..6
  enableDensityToggle?: boolean;
  onItemClick?: (item: Tile, index: number) => void;   // <-- NEW
}) {
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const cols = Math.max(3, Math.min(6, desktopCols));

  const computedCols = useMemo(() => {
    if (items.length === 1) return 1;
    if (items.length === 2) return 2;
    return cols;
  }, [items.length, cols]);

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

      <div className="grid" style={{ ['--cols' as any]: computedCols, ['--gap' as any]: density==='compact' ? '8px' : '12px' }}>
        {items.map((it, i) => (
          <TileView key={i} item={it} ratio={ratio} onClick={() => onItemClick?.(it, i)} />
        ))}
      </div>
    </div>
  );
}

function TileView({ item, ratio, onClick }: { item: Tile; ratio: string; onClick?: () => void }) {
  if (item.kind === 'folder') {
    return (
      <Link className="tile" href={item.path} prefetch>
        <div className="media" style={{ ['--ratio' as any]: ratio }}>
          {item.cover && (
            <Image src={item.cover} alt={item.displayName} fill sizes="(max-width:739px) 100vw, (max-width:1099px) 50vw, 33vw" />
          )}
        </div>
        <div className="meta">
          <div className="label">{item.displayName}</div>
          {Number(getCount(item)) > 0 && <div className="count" style={{ display: getShowCounts() ? 'block' : 'none' }}>{getCount(item)}</div>}
        </div>
      </Link>
    );
  }
  if (item.kind === 'image') {
    return (
      <div
        className="tile clickable"
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
  // video tile
  return (
    <div
      className="tile clickable"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => ((e.key === 'Enter' || e.key === ' ') && onClick?.())}
    >
      <div className="media" style={{ ['--ratio' as any]: '16/9' }}>
        {item.poster && (<Image src={item.poster} alt={item.displayName} fill sizes="(max-width:739px) 100vw, (max-width:1099px) 50vw, 33vw" />)}
      </div>
      <div className="meta"><div className="label">{item.displayName}</div></div>
    </div>
  );
}

function getShowCounts(){
  if (typeof window === 'undefined') return true;
  const s = getComputedStyle(document.documentElement).getPropertyValue('--show-counts').trim();
  return s !== '0';
}
function getCount(item: FolderTile){
  if (item.counts?.images) return `${item.counts.images} images`;
  if (item.counts?.videos) return `${item.counts.videos} videos`;
  if (item.counts?.folders) return `${item.counts.folders} folders`;
  return '';
}

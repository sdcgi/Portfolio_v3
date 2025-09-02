// components/Grid.tsx
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  items = [],               // harden: never undefined
  ratio,                    // no default — CSS governs unless explicitly passed
  desktopCols,
  enableDensityToggle = true,
  onItemClick,
  level = 'sub',
}: {
  items?: Tile[];           // harden: optional in the type, defaulted above
  ratio?: string;
  desktopCols?: number;
  enableDensityToggle?: boolean;
  onItemClick?: (item: Tile, index: number) => void;
  level?: Level;
}) {
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  const normalizeCols = (v?: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(1, Math.min(v, 8)) : undefined;
  const colsOverride = normalizeCols(desktopCols);

  const allImages = useMemo(() => Array.isArray(items) && items.length > 0
    ? items.every(it => (it as any).kind === 'image')
    : false
  , [items]);

  const specialCols: number | null = useMemo(() => {
    if (items.length === 1) return 1;
    if (items.length === 2) return 2;
    if (allImages && items.length === 3) return 3;
    return null;
  }, [items.length, allImages]);

  const isSingleImageGrid = useMemo(() => allImages && items.length === 1, [allImages, items]);
  const isThreeImageLeaf  = useMemo(() => allImages && items.length === 3, [allImages, items]);

  // Read title/count flags from the grid element (so wrapper CSS vars work)
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [showFlags, setShowFlags] = useState<{ titles: boolean; counts: boolean }>({ titles: false, counts: false });

  useEffect(() => {
    if (!gridRef.current) return;
    const cs = getComputedStyle(gridRef.current);
    const pick = (name: string, def = '1') => Number((cs.getPropertyValue(name).trim() || def)) > 0;

    if (level === 'top') {
      setShowFlags({ titles: pick('--show-top-titles','0'), counts: pick('--show-top-counts','1') });
    } else if (level === 'sub') {
      setShowFlags({ titles: pick('--show-sub-titles','0'), counts: pick('--show-sub-counts','1') });
    } else if (level === 'leaf') {
      setShowFlags({ titles: pick('--show-leaf-titles','0'), counts: pick('--show-leaf-counts','0') });
    } else {
      setShowFlags({ titles: false, counts: false });
    }
  }, [items.length, level, density]);

  // Native aspect toggle — read from :root
  const [leafNativeOnRoot, setLeafNativeOnRoot] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const v = cs.getPropertyValue('--leaf-native-aspect').trim();
    setLeafNativeOnRoot(Number(v || '0') > 0);
  }, [items.length]);

  // If this grid has an explicit --grid-ratio, disable native here
  const [hasGridRatio, setHasGridRatio] = useState(false);
  useEffect(() => {
    if (!gridRef.current) return;
    const cs = getComputedStyle(gridRef.current);
    const v = cs.getPropertyValue('--grid-ratio').trim();
    setHasGridRatio(Boolean(v));
  }, [items.length, level]);

  const enableLeafNativeHere =
    level === 'leaf' &&
    allImages &&
    leafNativeOnRoot &&
    !hasGridRatio; // override present → native OFF

  // Global default columns from CSS
  const globalDefaultCols = useMemo(() => {
    if (typeof window === 'undefined') return 4;
    const cs = getComputedStyle(document.documentElement);
    const raw = cs.getPropertyValue('--grid-max-default').trim();
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1 && n <= 8) return n;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 8 ? parsed : 4;
  }, []);

  // Columns: override wins → special cases → global default
  const styleVars: Record<string, string | number> = {
    ['--gap' as any]: density === 'compact' ? 'var(--gap-compact)' : 'var(--gap-comfy)',
    ['--cols' as any]: (colsOverride ?? specialCols ?? globalDefaultCols),
  };

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
        ref={gridRef}
        className={`grid ${isSingleImageGrid ? 'single-one' : ''} ${isThreeImageLeaf ? 'cols-3' : ''} level-${level} ${enableLeafNativeHere ? 'leaf-native' : ''}`}
        data-level={level}
        style={styleVars}
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
            nativeAspect={enableLeafNativeHere}
          />
        ))}
      </div>
    </div>
  );
}

function TileView({
  item, ratio, onClick, single, showTitle, showCount, nativeAspect
}: {
  item: Tile; ratio?: string; onClick?: () => void; single?: boolean;
  showTitle?: boolean; showCount?: boolean; nativeAspect?: boolean;
}) {
  if (item.kind === 'folder') {
    const countText = getCount(item);
    return (
      <div className="tile">
        <Link href={item.path} prefetch className="block-link">
          <div className="media" style={ratio ? { ['--ratio' as any]: ratio } : {}}>
            {item.cover && (
              <Image
                src={item.cover}
                alt={item.displayName}
                fill
                sizes="(max-width:739px) 100vw, (max-width:1099px) 50vw, 33vw"
              />
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
        <div className="media" style={ratio ? { ['--ratio' as any]: ratio } : {}}>
          <Image
            src={item.src}
            alt={item.alt || ''}
            fill
            sizes="(max-width:739px) 100vw, (max-width:1099px) 50vw, 33vw"
            onLoadingComplete={nativeAspect ? (img) => {
              const w = img.naturalWidth || 1, h = img.naturalHeight || 1;
              const media = img.closest('.media');
              if (media) (media as HTMLElement).style.setProperty('--ratio', `${w}/${h}`);
            } : undefined}
          />
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
      <div className="media" style={{ ['--ratio' as any]: '16 / 9' }}>
        {item.poster && (
          <Image
            src={item.poster}
            alt={item.displayName}
            fill
            sizes="(max-width:739px) 100vw, (max-width:1099px) 50vw, 33vw"
          />
        )}
      </div>
      <div className="meta"><div className="label">{item.displayName}</div></div>
    </div>
  );
}

function getCount(item: FolderTile){
  if (item.counts?.images) return `${item.counts.images} images`;
  if (item.counts?.videos) return `${item.counts.videos} videos`;
  if (item.counts?.folders) return `${item.counts.folders} folders`;
  return '';
}

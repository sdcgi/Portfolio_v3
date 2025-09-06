/* ---------- app/components/Grid.tsx ---------- */
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
  items = [],
  ratio,                 // from manifest (.order), e.g. "3 / 2" or "0"
  desktopCols,
  enableDensityToggle = true,
  onItemClick,
  level = 'sub',
}: {
  items?: Tile[];
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

  const allImages = useMemo(
    () => (Array.isArray(items) && items.length > 0 ? items.every(it => (it as any).kind === 'image') : false),
    [items]
  );

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
  const [showFlags, setShowFlags] =
    useState<{ titles: boolean; counts: boolean }>({ titles: false, counts: false });

  useEffect(() => {
    if (!gridRef.current) return;
    const cs = getComputedStyle(gridRef.current);
    const pick = (name: string, def = '1') => Number((cs.getPropertyValue(name).trim() || def)) > 0;

    if (level === 'top') {
      setShowFlags({ titles: pick('--show-top-titles','0'), counts: pick('--show-top-counts','1') });
    } else if (level === 'sub') {
      setShowFlags({ titles: pick('--show-sub-titles','0'), counts: pick('--show-sub-counts','1') });
    } else if (level === 'leaf') {
      setShowFlags({ titles: pick('--show-leaf-titles','0'), counts: false });
    } else {
      setShowFlags({ titles: false, counts: false });
    }
  }, [items.length, level, density]);

  // Global leaf-native toggle from :root
  const [leafNativeOnRoot, setLeafNativeOnRoot] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const v = (cs.getPropertyValue('--leaf-native-aspect') || '').trim();
    setLeafNativeOnRoot(Number(v || '0') > 0);
  }, [items.length]);

  // ----- Aspect resolution (authoritative precedence) -----
  // Normalize manifest ratio string once
  const ratioTrim = (ratio ?? '').trim();
  const hasManifestRatio = ratioTrim.length > 0;
  const manifestWantsNative = hasManifestRatio && ratioTrim === '0';
  const manifestFixedRatio = hasManifestRatio && ratioTrim !== '0' ? ratioTrim : undefined;

  // Decide grid-level ratio:
  //  - If manifestFixedRatio → use it (strongest)
  //  - Else if leaf:
  //      - If manifestWantsNative → no grid ratio (native)
  //      - Else if global native ON → no grid ratio (native)
  //      - Else global native OFF → fixed grid ratio (--tile-aspect-leaf)
  //  - Else (top/sub/motion-top): use their level defaults
  let resolvedGridRatio: string | undefined;

  if (manifestFixedRatio) {
    resolvedGridRatio = manifestFixedRatio; // e.g. "3 / 2"
  } else if (level === 'leaf') {
    if (manifestWantsNative || leafNativeOnRoot) {
      resolvedGridRatio = undefined; // native mode → per-image ratio
    } else {
      resolvedGridRatio = 'var(--tile-aspect-leaf)'; // global native OFF → fixed
    }
  } else if (level === 'sub') {
    resolvedGridRatio = 'var(--tile-aspect-sub)';
  } else if (level === 'top') {
    resolvedGridRatio = 'var(--tile-aspect-top)';
  } // motion-top falls back to CSS default (16/9) via stylesheet

  // Enable per-image native mode exactly when there is no grid ratio AND we’re a leaf of images
  const enableLeafNativeHere = level === 'leaf' && allImages && !resolvedGridRatio;

  // Columns: override wins → special 1/2/3 → otherwise let CSS default
  const activeCols = (colsOverride ?? specialCols);

  const styleVars: Record<string, string | number> = {
    ['--gap' as any]: density === 'compact' ? 'var(--gap-compact)' : 'var(--gap-comfy)',
    ...(typeof activeCols === 'number'
      ? { ['--cols-active' as any]: activeCols, ['--cols' as any]: activeCols }
      : {}),
    ...(resolvedGridRatio ? { ['--grid-ratio' as any]: resolvedGridRatio } : {}),
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
  item, onClick, single, showTitle, showCount, nativeAspect
}: {
  item: Tile; onClick?: () => void; single?: boolean;
  showTitle?: boolean; showCount?: boolean; nativeAspect?: boolean;
}) {
  if (item.kind === 'folder') {
    const countText = getCount(item);
    return (
      <div className="tile">
        <Link href={item.path} prefetch className="block-link">
          <div className="media">
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
    const file = item.src.split('/').pop() || '';
    const fallback = file.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
    const label = fallback;

    return (
      <div
        className={`tile clickable ${single ? 'single-leaf' : ''}`}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => ((e.key === 'Enter' || e.key === ' ') && onClick?.())}
      >
        <div className="media">
          <Image
            src={item.src}
            alt=""
            fill
            sizes="(max-width:739px) 100vw, (max-width:1099px) 50vw, 33vw"
            onLoadingComplete={
              nativeAspect
                ? (img) => {
                    const w = img.naturalWidth || 1, h = img.naturalHeight || 1;
                    const media = img.closest('.media');
                    if (media) (media as HTMLElement).style.setProperty('--ratio', `${w}/${h}`);
                  }
                : undefined
            }
          />
        </div>
        {showTitle && (
          <div className="meta">
            <div className="label">{label}</div>
          </div>
        )}
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

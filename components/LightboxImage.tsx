'use client';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function LightboxImage({
  src,
  alt,
  onClose,
  onPrev,
  onNext,
}: {
  src: string;
  alt?: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const [uiVisible, setUiVisible] = useState(true);
  const hideTimer = useRef<number | null>(null);

  // Read ms from CSS var --lb-ui-hide-ms (fallback 2000)
  const getHideMs = () => {
    if (typeof window === 'undefined') return 2000;
    const cs = getComputedStyle(document.documentElement);
    const raw = cs.getPropertyValue('--lb-ui-hide-ms').trim();
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 2000;
  };

  // keyboard handler
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && onPrev) onPrev();
      else if (e.key === 'ArrowRight' && onNext) onNext();
      else if ((e.key === ' ' || e.key === 'Enter') && (onNext || onClose)) (onNext ?? onClose)();
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onKey]);

  // fade arrows after N ms (no auto re-show)
  useEffect(() => {
    const ms = getHideMs();
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setUiVisible(false), ms);
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div
      className="lb-overlay"
      onClick={() => (onNext ? onNext() : onClose())}
      role="dialog"
      aria-modal
    >
      <div className="lb-content" onClick={(e) => e.stopPropagation()}>
        <Image src={src} alt={alt || ''} fill sizes="100vw" />
      </div>

      {/* Always-on hotzones. Visible arrows are children that fade away. */}
      {onPrev && (
        <button
          className="lb-hotzone lb-left"
          aria-label="Previous"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          type="button"
        >
          {uiVisible && <span className="lb-arrow">‹</span>}
        </button>
      )}
      {onNext && (
        <button
          className="lb-hotzone lb-right"
          aria-label="Next"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          type="button"
        >
          {uiVisible && <span className="lb-arrow">›</span>}
        </button>
      )}

      {/* Permanent close (top-right) */}
      <button
        className="lb-btn lb-close-permanent"
        onClick={onClose}
        aria-label="Close"
        title="Close (Esc)"
        type="button"
      >
        ✕
      </button>
    </div>
  );
}

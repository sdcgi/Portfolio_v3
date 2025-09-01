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

  // keyboard handler
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && onPrev) onPrev();
      else if (e.key === 'ArrowRight' && onNext) onNext();
      else if ((e.key === ' ' || e.key === 'Enter') && (onNext || onClose))
        (onNext ?? onClose)();
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onKey]);

  // fade arrows after 2s
  useEffect(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setUiVisible(false), 2000);
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

      {/* always-on hotzones */}
      {onPrev && (
        <button
          className="lb-hotzone lb-left"
          aria-label="Previous"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
        >
          {uiVisible && <span className="lb-arrow">‹</span>}
        </button>
      )}
      {onNext && (
        <button
          className="lb-hotzone lb-right"
          aria-label="Next"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
        >
          {uiVisible && <span className="lb-arrow">›</span>}
        </button>
      )}

      {/* permanent close */}
      <button
        className="lb-btn lb-close-permanent"
        onClick={onClose}
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}

// components/LightboxVideo.tsx
'use client';
import { useCallback, useEffect, useRef } from 'react';

export default function LightboxVideo({
  url,
  onClose,
  onPrev,
  onNext,
}: {
  url: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext) onNext();
    },
    [onClose, onPrev, onNext]
  );
  useEffect(() => {
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onKey]);

  return (
    <div className="lb-overlay" onClick={() => (onNext ? onNext() : onClose())} role="dialog" aria-modal>
      <div className="lb-content" onClick={(e) => e.stopPropagation()}>
        <video ref={ref} src={url} controls playsInline preload="metadata" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>
      <button className="lb-btn lb-close" onClick={onClose}>Close</button>
    </div>
  );
}

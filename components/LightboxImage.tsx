// components/LightboxImage.tsx
'use client';
import Image from 'next/image';
import { useCallback, useEffect } from 'react';

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
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext) onNext();
      if ((e.key === ' ' || e.key === 'Enter') && (onNext || onClose)) (onNext ?? onClose)();
    },
    [onClose, onPrev, onNext]
  );
  useEffect(() => {
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onKey]);

  // click backdrop -> advance (or close if no next)
  return (
    <div className="lb-overlay" onClick={() => (onNext ? onNext() : onClose())} role="dialog" aria-modal>
      <div className="lb-content" onClick={(e) => e.stopPropagation()}>
        <Image src={src} alt={alt || ''} fill sizes="100vw" />
      </div>
      <button className="lb-btn lb-close" onClick={onClose}>Close</button>
    </div>
  );
}

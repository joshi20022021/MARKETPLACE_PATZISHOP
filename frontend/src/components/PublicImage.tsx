import * as ui from './ui';
import { useState } from 'react';
export function PublicImage({
  src,
  alt,
  className = '',
  eager = false,
  shape = 'square',
  fit = 'cover',
}: {
  src: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
  shape?: 'square' | 'banner';
  fit?: 'cover' | 'contain';
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`${ui.publicImage} ${shape === 'banner' ? 'aspect-[3.6]' : 'aspect-square'} ${className}`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          className={fit === 'contain' ? 'object-contain' : 'object-cover'}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className={ui.imagePlaceholder} role="img" aria-label={`${alt}: imagen no disponible`}>
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <path
              d="M16 24h32l3 30H13zM24 24v-6a8 8 0 0 1 16 0v6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M28 37h8M32 33v8" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span>Hecho cerca de ti</span>
        </div>
      )}
    </div>
  );
}

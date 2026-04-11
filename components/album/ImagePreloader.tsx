'use client';

import { useEffect } from 'react';
import type { Album } from '@/lib/types';

export default function ImagePreloader({ album }: { album: Album }) {
  useEffect(() => {
    if (!album?.photos?.length) return;

    const urls = [
      album.cover_image,
      ...album.photos.map((p) => p.url),
    ].filter(Boolean);

    // Preload bằng Image() — browser cache, không render
    const imgs = urls.map((url) => {
      const img = new window.Image();
      img.src = url;
      return img;
    });

    // Thêm link preload cho 3 ảnh đầu (ưu tiên cao)
    const links: HTMLLinkElement[] = urls.slice(0, 3).map((url) => {
      const l = document.createElement('link');
      l.rel = 'preload';
      l.as = 'image';
      l.href = url;
      document.head.appendChild(l);
      return l;
    });

    return () => {
      links.forEach((l) => l.remove());
      imgs.length = 0;
    };
  }, [album]);

  return null;
}

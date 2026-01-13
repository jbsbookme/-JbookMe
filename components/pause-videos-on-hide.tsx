'use client';

import { useEffect } from 'react';

export function PauseVideosOnHide() {
  useEffect(() => {
    const pauseAllVideos = () => {
      const videos = Array.from(document.querySelectorAll('video'));
      for (const video of videos) {
        try {
          if (!video.paused) video.pause();
        } catch {
          // ignore
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) pauseAllVideos();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', pauseAllVideos);
    window.addEventListener('blur', pauseAllVideos);

    // Some browsers emit these lifecycle events.
    window.addEventListener('freeze', pauseAllVideos);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', pauseAllVideos);
      window.removeEventListener('blur', pauseAllVideos);
      window.removeEventListener('freeze', pauseAllVideos);
    };
  }, []);

  return null;
}

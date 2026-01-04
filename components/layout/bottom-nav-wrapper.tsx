'use client';

import dynamic from 'next/dynamic';

const BottomNav = dynamic(() => import('./bottom-nav'), {
  ssr: false,
});

export default BottomNav;

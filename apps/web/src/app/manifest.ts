import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Telegle — Meet Strangers. Make Connections',
    short_name: 'Telegle',
    description:
      'Safe 1-on-1 random video chat, live stranger calls, and Meet Strangers. Make Connections for adults 18+.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c0e12',
    theme_color: '#0c0e12',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}

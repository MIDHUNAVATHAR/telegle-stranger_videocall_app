import type { Metadata, Viewport } from 'next';
import '../shared/styles/tokens.css';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://donkeyplay.com';

export const viewport: Viewport = {
  themeColor: '#0c0e12',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Donkey Play — Live Random Video Chat & Stranger Video Call | Omegle Alternative',
    template: '%s | Donkey Play — Random Video Chat',
  },
  description:
    'Donkey Play is the top safe Omegle alternative for live random video chat, stranger video calls, 1-on-1 video roulette, and spontaneous social discovery. Connect instantly with verified adults worldwide with strictly no nudity and full privacy.',
  keywords: [
    'random chat',
    'stranger chat',
    'random video call',
    'stranger video call',
    'omegle',
    'omegle alternative',
    'live video call',
    'talk to strangers',
    'video roulette',
    'free random video chat',
    'stranger call online',
    '1 on 1 video call',
    'live cam chat with strangers',
    'best omegle alternative 2026',
    'donkey play',
    'donkeyplay',
    'adult random chat 18+',
    'safe video chat',
  ],
  authors: [{ name: 'Donkey Play', url: siteUrl }],
  creator: 'Donkey Play',
  publisher: 'Donkey Play',
  applicationName: 'Donkey Play',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Donkey Play — Random Video Chat & Stranger Video Call',
    title: 'Donkey Play — Live Random Video Chat & Stranger Calls (Omegle Alternative)',
    description:
      'Connect instantly with strangers worldwide. Free 1-on-1 random video calls, live stranger chat, and social discovery. Safe and moderated 18+ community.',
    images: [
      {
        url: '/logo.png',
        width: 1024,
        height: 1024,
        alt: 'Donkey Play Neon Mascot Logo - Random Video Chat',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Donkey Play — Random Video Call & Stranger Chat',
    description:
      'The modern Omegle alternative. Instant live 1-on-1 random video calls and stranger chat with zero tolerance for nudity.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'Social Networking',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${siteUrl}/#webapp`,
        name: 'Donkey Play',
        url: siteUrl,
        applicationCategory: 'SocialNetworkingApplication',
        operatingSystem: 'All',
        description:
          'Mobile-first live random video chat and stranger discovery platform. High-performance WebRTC 1-on-1 video roulette and safe social connection.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'INR',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          ratingCount: '1850',
          bestRating: '5',
          worstRating: '1',
        },
        featureList: [
          '1-on-1 Random Video Call',
          'Free Instant Matchmaking',
          'Optional Gender Filter Matching',
          'Safe and Moderated 18+ Environment',
          'Realtime WebRTC Video Roulette',
          'Strict No Nudity Community Protection',
        ],
      },
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'Donkey Play',
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
        sameAs: [
          'https://twitter.com/donkeyplay',
          'https://instagram.com/donkeyplay',
        ],
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

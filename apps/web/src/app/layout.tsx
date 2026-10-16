import type { Metadata, Viewport } from 'next';
import '../shared/styles/tokens.css';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://telegle.com';

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
    default: 'Telegle — Meet Strangers. Make Connections | Live Random Video Chat',
    template: '%s | Telegle — Random Video Chat',
  },
  description:
    'Telegle is the top safe Omegle alternative for live random video chat, stranger video calls, 1-on-1 video roulette. Meet Strangers. Make Connections. Connect instantly with verified adults worldwide with strictly no nudity and full privacy.',
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
    'telegle',
    'adult random chat 18+',
    'safe video chat',
  ],
  authors: [{ name: 'Telegle', url: siteUrl }],
  creator: 'Telegle',
  publisher: 'Telegle',
  applicationName: 'Telegle',
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
    siteName: 'Telegle — Meet Strangers. Make Connections',
    title: 'Telegle — Live Random Video Chat & Stranger Calls (Omegle Alternative)',
    description:
      'Connect instantly with strangers worldwide. Free 1-on-1 random video calls, live stranger chat, and Meet Strangers. Make Connections. Safe and moderated 18+ community.',
    images: [
      {
        url: '/logo.png',
        width: 1024,
        height: 1024,
        alt: 'Telegle Neon Mascot Logo - Random Video Chat',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Telegle — Random Video Call & Stranger Chat',
    description:
      'The modern Omegle alternative. Meet Strangers. Make Connections. Instant live 1-on-1 random video calls and stranger chat with zero tolerance for nudity.',
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
        name: 'Telegle',
        url: siteUrl,
        applicationCategory: 'SocialNetworkingApplication',
        operatingSystem: 'All',
        description:
          'Mobile-first live random video chat and stranger discovery platform. Meet Strangers. Make Connections. High-performance WebRTC 1-on-1 video roulette and safe social connection.',
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
        name: 'Telegle',
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
        sameAs: [
          'https://twitter.com/telegle',
          'https://instagram.com/telegle',
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

import type { Metadata } from 'next';
import '../shared/styles/tokens.css';

export const metadata: Metadata = {
  title: 'Donkey Play',
  description: 'Mobile-first social discovery and random video chat application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

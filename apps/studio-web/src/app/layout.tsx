import type { Metadata } from 'next';
import { Schibsted_Grotesk } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/src/components/layout/app-shell';

const schibsted = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Stackby Studio',
  description: 'Build apps from your Stackby data',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={schibsted.variable}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

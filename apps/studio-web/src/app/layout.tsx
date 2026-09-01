import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/src/components/layout/app-shell';

export const metadata: Metadata = {
  title: 'Stackby Studio',
  description: 'Build apps from your Stackby data',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

import type { ReactNode } from 'react';

export default function PublishedLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#fafafa' }}>{children}</body>
    </html>
  );
}

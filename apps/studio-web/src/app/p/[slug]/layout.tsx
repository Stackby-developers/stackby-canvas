import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Stackby Studio',
};

export default function PublishedLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          *,*::before,*::after{box-sizing:border-box}
          html,body{margin:0;padding:0;height:100%}
          body{background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%}
          /* Gate cards: constrain width but fill on small screens */
          .gate-card{width:400px;max-width:calc(100vw - 32px);padding:40px}
          @media(max-width:480px){.gate-card{padding:28px 24px}}
          @media(max-width:360px){.gate-card{padding:24px 18px;border-radius:12px}}
          /* Touch-friendly tap targets */
          @media(hover:none){button,a{min-height:44px}}
          @keyframes spin{to{transform:rotate(360deg)}}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}

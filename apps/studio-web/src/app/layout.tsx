export const metadata = {
  title: 'Stackby Studio',
  description: 'Build apps from your Stackby data',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

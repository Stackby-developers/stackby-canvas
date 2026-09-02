'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/src/hooks/use-auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isConnected && pathname !== '/connect') {
      router.replace('/connect');
    }
  }, [loading, isConnected, pathname, router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#1C1C1C', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #363636', borderTopColor: '#fff', animation: 'spin 0.75s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!isConnected && pathname !== '/connect') return null;
  return <>{children}</>;
}

import { useEffect } from 'react';
import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';
import { useAuthStore } from '@/stores/useAuthStore';
import { Loader2 } from 'lucide-react';

function App() {
  const { bootstrap, loading, logout } = useAuthStore();

  useEffect(() => {
    // Verify token on app load
    bootstrap().catch(() => {
      // Silently fail - user will be on login page
    });
  }, [bootstrap]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  // Show loader while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;

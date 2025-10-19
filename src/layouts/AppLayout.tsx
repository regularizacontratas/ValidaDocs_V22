import { ReactNode } from 'react';
import { Navigation } from '../components/Navigation';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Main Content Area */}
      <div className="lg:pl-64">
        <main className="py-6 px-4 sm:px-6 lg:px-8 pt-16 lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
import type {Metadata} from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { Navigation } from '@/components/Navigation';
import { RouteGuard } from '@/components/RouteGuard';

export const metadata: Metadata = {
  title: 'JIT | Burnout Prevention for Professionals',
  description: 'A minimal burnout prevention app for teachers and professionals.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased selection:bg-primary/20 pb-20 md:pb-0" suppressHydrationWarning>
        <FirebaseClientProvider>
          <RouteGuard>
            {children}
            <Navigation />
          </RouteGuard>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}

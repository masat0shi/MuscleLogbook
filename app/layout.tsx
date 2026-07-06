import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import Navbar from '@/components/Navbar';
import NavigationLoader from '@/components/NavigationLoader';
import RestTimer from '@/components/RestTimer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MuscleLogbook - 筋トレ記録アプリ',
  description: '日々のトレーニングを記録して成長を可視化しよう',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <Navbar />
        <Suspense>
          <NavigationLoader />
        </Suspense>
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16 md:pb-0">
          {children}
        </main>
        <RestTimer />
      </body>
    </html>
  );
}

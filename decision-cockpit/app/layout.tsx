import type { Metadata } from 'next';
import './globals.css';
import { THEME_INIT_SCRIPT } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'Decision Cockpit',
  description: 'Интерактивный дашборд решений по товарным запасам',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ru" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">{children}</body>
    </html>
  );
}

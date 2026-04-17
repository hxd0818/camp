import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CAMP - Commercial Asset Management Platform',
  description: 'Commercial Asset Management Platform for shopping mall operations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 antialiased">
        {children}
      </body>
    </html>
  );
}

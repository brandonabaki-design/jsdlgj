import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agent OS Notebook',
  description: 'Local Claude-powered NotebookLM + agent dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-base text-ink">{children}</body>
    </html>
  );
}

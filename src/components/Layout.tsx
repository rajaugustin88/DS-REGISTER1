import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}

export function Layout({ children, headerRight, title }: LayoutProps & { title?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-text font-sans">
      <header className="sticky top-0 z-50 w-full teal-gradient shadow-soft rounded-b-2xl">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {title || <h1 className="text-2xl font-black tracking-tighter text-white">DS-REGISTER</h1>}
          </div>
          {headerRight && <div className="flex items-center">{headerRight}</div>}
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

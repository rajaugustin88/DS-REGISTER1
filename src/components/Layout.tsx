import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Link } from 'react-router-dom';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}

export function Layout({ children, headerRight, title }: LayoutProps & { title?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-text font-sans flex flex-col">
      <header className="sticky top-0 z-50 w-full teal-gradient shadow-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {title || <h1 className="text-xl font-bold tracking-tighter text-white">DS-REGISTER</h1>}
          </div>
          {headerRight && <div className="flex items-center">{headerRight}</div>}
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 flex-grow">
        {children}
      </main>
      <footer className="border-t border-border bg-card py-8 mt-auto">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-sm font-bold text-text/40 uppercase tracking-widest">
              © {new Date().getFullYear()} DS-REGISTER. All rights reserved.
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link to="/privacy" className="text-[0.65rem] font-black text-text/40 hover:text-primary uppercase tracking-widest transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-[0.65rem] font-black text-text/40 hover:text-primary uppercase tracking-widest transition-colors">Terms & Conditions</Link>
              <Link to="/refund" className="text-[0.65rem] font-black text-text/40 hover:text-primary uppercase tracking-widest transition-colors">Refund Policy</Link>
              <Link to="/deletion" className="text-[0.65rem] font-black text-text/40 hover:text-primary uppercase tracking-widest transition-colors">Account Deletion</Link>
              <Link to="/contact" className="text-[0.65rem] font-black text-text/40 hover:text-primary uppercase tracking-widest transition-colors">Contact Us</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

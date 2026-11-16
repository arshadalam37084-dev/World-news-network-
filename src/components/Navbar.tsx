import React, { useState } from 'react';
import { Menu, ShieldCheck, X } from 'lucide-react';
import type { PublicSection } from '../types';
import { WnnLogoMark } from './BrandMark';

interface NavbarProps {
  activeSection: PublicSection;
  onNavigate: (section: PublicSection) => void;
  onOpenAdmin: () => void;
  isAdminAuthenticated: boolean;
}

const NAV_ITEMS: Array<{ id: PublicSection; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'latest-news', label: 'Latest News' },
  { id: 'e-paper', label: 'E-Paper' },
  { id: 'videos', label: 'Videos' },
  { id: 'about', label: 'About Us' },
  { id: 'contact', label: 'Contact Us' },
];

export function Navbar({ activeSection, onNavigate, onOpenAdmin, isAdminAuthenticated }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (id: PublicSection) => {
    setMobileOpen(false);
    onNavigate(id);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleSelect('home')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F3A] rounded"
        >
          <WnnLogoMark className="w-8 h-8 shrink-0" />
          <span className="font-serif text-base sm:text-lg font-extrabold tracking-tight text-[#0B1F3A]">
            WORLD NEWS NETWORK
          </span>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav aria-label="Primary Navigation" className="hidden lg:flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`relative py-1 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] ${
                  active ? 'text-[#C8102E]' : 'text-slate-700 hover:text-[#0B1F3A]'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-[#C8102E]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action (Admin Portal) + Mobile Menu Trigger */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#132E53] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F3A]"
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>{isAdminAuthenticated ? 'Admin Dashboard' : 'Admin Login'}</span>
          </button>

          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#C8102E]/10 text-[#C8102E]'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-[#0B1F3A]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}

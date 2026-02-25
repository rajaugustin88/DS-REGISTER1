import { Globe } from 'lucide-react';
import { LANGUAGES } from '../constants';
import { Language } from '../types';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export function LanguageSelector({ currentLanguage, onLanguageChange }: LanguageSelectorProps) {
  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-4 h-11 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/20 text-white">
        <Globe className="w-4 h-4" />
        <span className="text-sm font-bold uppercase tracking-wider">
          {LANGUAGES.find(l => l.code === currentLanguage)?.name}
        </span>
      </button>
      <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-2xl shadow-soft opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onLanguageChange(lang.code as Language)}
            className="w-full text-left px-5 py-3 text-sm font-bold text-text hover:bg-primary/10 hover:text-primary transition-colors border-b border-border last:border-none"
          >
            {lang.name}
          </button>
        ))}
      </div>
    </div>
  );
}

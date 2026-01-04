'use client';

import { useI18n } from '@/lib/i18n/i18n-context';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageSelector() {
  const { language, setLanguage } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 hover:bg-transparent transition-colors"
        >
          <Globe className="w-5 h-5 text-[#ffd700] drop-shadow-[0_0_12px_rgba(255,215,0,0.9)]" />
          <span className="hidden sm:inline text-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]">
            English
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-gray-800">
        <DropdownMenuItem
          onClick={() => setLanguage('en')}
          className={
            language === 'en'
              ? 'bg-[#00f0ff]/10 text-[#00f0ff] cursor-pointer'
              : 'text-gray-400 hover:text-[#00f0ff] hover:bg-[#00f0ff]/5 cursor-pointer'
          }
        >
          <span className="mr-2">🇺🇸</span> English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

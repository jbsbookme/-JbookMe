'use client';

import { useI18n } from '@/lib/i18n/i18n-context';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();

  const label = language === 'es' ? t('common.spanish') : t('common.english');

  const handleChangeLanguage = (lang: 'en' | 'es') => {
    if (lang === language) return;
    setLanguage(lang);

    if (lang === 'es') {
      toast.success(t('common.languageSavedSpanishBilingual'), { duration: 4500 });
    } else {
      toast.success(t('common.languageSavedEnglishBilingual'), { duration: 4500 });
    }
  };

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
            {label}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-gray-800">
        <DropdownMenuItem
          onClick={() => handleChangeLanguage('en')}
          className={
            language === 'en'
              ? 'bg-[#00f0ff]/10 text-[#00f0ff] cursor-pointer'
              : 'text-gray-400 hover:text-[#00f0ff] hover:bg-[#00f0ff]/5 cursor-pointer'
          }
        >
          <span className="mr-2">🇺🇸</span> {t('common.english')}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleChangeLanguage('es')}
          className={
            language === 'es'
              ? 'bg-[#00f0ff]/10 text-[#00f0ff] cursor-pointer'
              : 'text-gray-400 hover:text-[#00f0ff] hover:bg-[#00f0ff]/5 cursor-pointer'
          }
        >
          <span className="mr-2">🇪🇸</span> {t('common.spanish')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

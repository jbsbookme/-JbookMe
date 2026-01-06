'use client';

import { ArrowLeft, FileText } from 'lucide-react';
import { HistoryBackButton } from '@/components/layout/history-back-button';
import { useI18n } from '@/lib/i18n/i18n-context';
import { Card, CardContent } from '@/components/ui/card';

export default function TerminosPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <HistoryBackButton
          fallbackHref="/menu"
          variant="ghost"
          size="icon"
          aria-label={t('common.back')}
          className="mb-6 text-gray-400 hover:text-white hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </HistoryBackButton>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <FileText className="w-16 h-16 text-[#00f0ff]" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('legal.termsConditions')}</h1>
          <p className="text-gray-400">Last updated: January 3, 2026</p>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6 space-y-4 text-gray-300 leading-relaxed">
            <p>
              By using JBookMe, you agree to these Terms &amp; Conditions. If you do not agree, please do not use the
              app.
            </p>
            <p>
              Appointments, cancellations, and user accounts may be subject to additional rules shown within the booking
              and profile screens.
            </p>
            <p>
              We may update these terms from time to time. Continued use of the app after changes means you accept the
              updated terms.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

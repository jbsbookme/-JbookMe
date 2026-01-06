'use client';

import { ArrowLeft, FileText } from 'lucide-react';
import { HistoryBackButton } from '@/components/layout/history-back-button';
import { useI18n } from '@/lib/i18n/i18n-context';
import { Card, CardContent } from '@/components/ui/card';

export default function TerminosPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <HistoryBackButton
          fallbackHref="/menu"
          variant="ghost"
          size="icon"
          aria-label={t('common.back')}
          className="mb-5 text-gray-400 hover:text-[#00f0ff] hover:bg-transparent"
        >
          <ArrowLeft className="h-4 w-4" />
        </HistoryBackButton>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-[#00f0ff]/15 border border-[#00f0ff]/25 flex items-center justify-center">
              <FileText className="w-7 h-7 text-[#00f0ff]" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-[#00f0ff] via-[#00d4ff] to-[#0099cc] bg-clip-text text-transparent">
              {t('legal.termsConditions')}
            </span>
          </h1>
          <p className="text-gray-400">Last updated: January 3, 2026</p>
        </div>

        <Card className="bg-gray-900 border-gray-800 rounded-2xl">
          <CardContent className="p-6 space-y-4 text-gray-300 leading-relaxed">
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

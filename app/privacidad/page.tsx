'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, Lock, Eye, Database, Mail, UserCheck } from 'lucide-react';
import { useI18n } from '@/lib/i18n/i18n-context';
import { HistoryBackButton } from '@/components/layout/history-back-button';

export default function PrivacidadPage() {
  const { t } = useI18n();
  
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <HistoryBackButton
          fallbackHref="/menu"
          variant="ghost"
          size="icon"
          aria-label="Back"
          className="mb-6 text-gray-400 hover:text-white hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </HistoryBackButton>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield className="w-16 h-16 text-[#00f0ff]" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            {t('privacy.title')}
          </h1>
          <p className="text-gray-400">{t('privacy.lastUpdated')}</p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Introduction */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <p className="text-gray-300 leading-relaxed">
                {t('privacy.introduction')}
              </p>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Database className="mr-2 h-5 w-5 text-[#00f0ff]" />
                {t('privacy.infoWeCollect')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-300">
              <div>
                <h3 className="font-semibold text-white mb-2">{t('privacy.personalInfo')}</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>{t('privacy.personalInfoItems.fullName')}</li>
                  <li>{t('privacy.personalInfoItems.email')}</li>
                  <li>{t('privacy.personalInfoItems.accountInfo')}</li>
                  <li>{t('privacy.personalInfoItems.appointmentHistory')}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">{t('privacy.usageInfo')}</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>{t('privacy.usageInfoItems.preferences')}</li>
                  <li>{t('privacy.usageInfoItems.reviews')}</li>
                  <li>{t('privacy.usageInfoItems.interactions')}</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Your Information */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Eye className="mr-2 h-5 w-5 text-[#ffd700]" />
                {t('privacy.howWeUse')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-gray-300">
              <p>{t('privacy.howWeUseIntro')}</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>{t('privacy.howWeUseItems.processBookings')}</li>
                <li>{t('privacy.howWeUseItems.sendReminders')}</li>
                <li>{t('privacy.howWeUseItems.improveServices')}</li>
                <li>{t('privacy.howWeUseItems.communicate')}</li>
                <li>{t('privacy.howWeUseItems.legalCompliance')}</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Protection */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Lock className="mr-2 h-5 w-5 text-[#00f0ff]" />
                {t('privacy.dataProtection')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-gray-300">
              <p>{t('privacy.dataProtectionIntro')}</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>{t('privacy.dataProtectionItems.encryption')}</li>
                <li>{t('privacy.dataProtectionItems.secureServers')}</li>
                <li>{t('privacy.dataProtectionItems.accessControl')}</li>
                <li>{t('privacy.dataProtectionItems.regularAudits')}</li>
              </ul>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <UserCheck className="mr-2 h-5 w-5 text-[#ffd700]" />
                {t('privacy.yourRights')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-gray-300">
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>{t('privacy.yourRightsItems.access')}</li>
                <li>{t('privacy.yourRightsItems.correction')}</li>
                <li>{t('privacy.yourRightsItems.deletion')}</li>
                <li>{t('privacy.yourRightsItems.optOut')}</li>
              </ul>
            </CardContent>
          </Card>

          {/* Information Sharing */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Mail className="mr-2 h-5 w-5 text-[#00f0ff]" />
                {t('privacy.dataSharing')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-gray-300">
              <p>{t('privacy.dataSharingText')}</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>{t('privacy.dataSharingItems.consent')}</li>
                <li>{t('privacy.dataSharingItems.serviceProviders')}</li>
                <li>{t('privacy.dataSharingItems.legal')}</li>
              </ul>
            </CardContent>
          </Card>

          {/* Cookies */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">{t('privacy.cookies')}</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300">
              <p>{t('privacy.cookiesText')}</p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">{t('privacy.contact')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-gray-300">
              <p>{t('privacy.contactText')}</p>
              <p className="text-[#00f0ff]">{t('privacy.email')}</p>
              <p className="text-[#00f0ff]">{t('privacy.phone')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

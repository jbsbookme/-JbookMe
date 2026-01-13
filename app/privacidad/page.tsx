'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, Lock, Eye, Database, Mail, UserCheck, MessageSquare, RefreshCcw, AlertTriangle, Users } from 'lucide-react';
import { useI18n } from '@/lib/i18n/i18n-context';
import { HistoryBackButton } from '@/components/layout/history-back-button';

export default function PrivacidadPage() {
  const { t } = useI18n();

  const personalInfoItemKeys = ['fullName', 'phone', 'email', 'appointmentDetails', 'role'] as const;
  const technicalInfoItemKeys = ['deviceType', 'browserType', 'ipAddress', 'notificationPermission'] as const;
  const noCollectItemKeys = ['govIds', 'financial', 'health', 'unrelatedMessages'] as const;

  const howWeUseItemKeys = ['scheduling', 'smsNotifications', 'inAppNotifications', 'operationalCommunication', 'securityAuditFraud', 'legalCompliance'] as const;

  const smsMaxReminderItemKeys = ['confirmation', 'reminder24h', 'reminder2h'] as const;
  const smsRulesItemKeys = ['appointmentOnly', 'maxReminders', 'replyYesNo', 'replyStop'] as const;

  const dataSharingItemKeys = ['twilio', 'vercel', 'databaseProviders'] as const;
  const dataRetentionItemKeys = ['appointmentRecords', 'smsLogs', 'inactiveData'] as const;
  const securityMeasureItemKeys = ['https', 'rbac', 'serverProcessing', 'secretManagement'] as const;
  const userRightsItemKeys = ['access', 'correct', 'delete', 'optOutSms', 'restrictComms'] as const;
  const multiBusinessItemKeys = ['dataIsolation', 'noGlobalMessages', 'platformIsolation'] as const;
  
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <HistoryBackButton
          fallbackHref="/menu"
          variant="ghost"
          size="icon"
          aria-label={t('common.back')}
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
          <>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="pt-6 space-y-4 text-gray-300 leading-relaxed">
                <p>{t('privacy.page.intro.p1')}</p>
                <p>{t('privacy.page.intro.p2')}</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Database className="mr-2 h-5 w-5 text-[#00f0ff]" />
                  {t('privacy.page.sections.infoCollect.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-300">
                <p>{t('privacy.page.sections.infoCollect.description')}</p>

                <div>
                  <h3 className="font-semibold text-white mb-2">{t('privacy.page.sections.infoCollect.personal.title')}</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    {personalInfoItemKeys.map((key) => (
                      <li key={key}>{t(`privacy.page.sections.infoCollect.personal.items.${key}`)}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-2">{t('privacy.page.sections.infoCollect.technical.title')}</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    {technicalInfoItemKeys.map((key) => (
                      <li key={key}>{t(`privacy.page.sections.infoCollect.technical.items.${key}`)}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-black/20 p-4">
                  <p className="font-semibold text-white mb-2">{t('privacy.page.sections.infoCollect.noCollect.title')}</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    {noCollectItemKeys.map((key) => (
                      <li key={key}>{t(`privacy.page.sections.infoCollect.noCollect.items.${key}`)}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Eye className="mr-2 h-5 w-5 text-[#ffd700]" />
                  {t('privacy.page.sections.howWeUse.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-300">
                <p>{t('privacy.page.sections.howWeUse.description')}</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  {howWeUseItemKeys.map((key) => (
                    <li key={key}>{t(`privacy.page.sections.howWeUse.items.${key}`)}</li>
                  ))}
                </ul>
                <p className="font-semibold text-white">{t('privacy.page.sections.howWeUse.noSpam')}</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5 text-[#00f0ff]" />
                  {t('privacy.page.sections.smsPolicy.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-300">
                <p>{t('privacy.page.sections.smsPolicy.description')}</p>

                <div>
                  <h3 className="font-semibold text-white mb-2">{t('privacy.page.sections.smsPolicy.rulesTitle')}</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    {smsRulesItemKeys.map((key) => {
                      if (key !== 'maxReminders') {
                        return <li key={key}>{t(`privacy.page.sections.smsPolicy.rules.${key}`)}</li>;
                      }

                      return (
                        <li key={key}>
                          {t('privacy.page.sections.smsPolicy.rules.maxReminders')}
                          <ul className="list-disc list-inside space-y-1 ml-6 mt-1">
                            {smsMaxReminderItemKeys.map((subKey) => (
                              <li key={subKey}>{t(`privacy.page.sections.smsPolicy.rules.maxReminderItems.${subKey}`)}</li>
                            ))}
                          </ul>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <p className="font-semibold text-white">{t('privacy.page.sections.smsPolicy.noSellPhones')}</p>
                <p>{t('privacy.page.sections.smsPolicy.twilioCompliance')}</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Users className="mr-2 h-5 w-5 text-[#ffd700]" />
                  {t('privacy.page.sections.dataSharing.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-300">
                <p>{t('privacy.page.sections.dataSharing.description')}</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  {dataSharingItemKeys.map((key) => (
                    <li key={key}>{t(`privacy.page.sections.dataSharing.items.${key}`)}</li>
                  ))}
                </ul>
                <p className="font-semibold text-white">{t('privacy.page.sections.dataSharing.noAds')}</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <RefreshCcw className="mr-2 h-5 w-5 text-[#00f0ff]" />
                  {t('privacy.page.sections.dataRetention.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-300">
                <ul className="list-disc list-inside space-y-1 ml-4">
                  {dataRetentionItemKeys.map((key) => (
                    <li key={key}>{t(`privacy.page.sections.dataRetention.items.${key}`)}</li>
                  ))}
                </ul>
                <p>{t('privacy.page.sections.dataRetention.requestDeletion')}</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Lock className="mr-2 h-5 w-5 text-[#00f0ff]" />
                  {t('privacy.page.sections.security.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-300">
                <p>{t('privacy.page.sections.security.description')}</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  {securityMeasureItemKeys.map((key) => (
                    <li key={key}>{t(`privacy.page.sections.security.items.${key}`)}</li>
                  ))}
                </ul>
                <p>{t('privacy.page.sections.security.adminOnly')}</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <UserCheck className="mr-2 h-5 w-5 text-[#ffd700]" />
                  {t('privacy.page.sections.userRights.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-300">
                <p>{t('privacy.page.sections.userRights.description')}</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  {userRightsItemKeys.map((key) => (
                    <li key={key}>{t(`privacy.page.sections.userRights.items.${key}`)}</li>
                  ))}
                </ul>
                <p>{t('privacy.page.sections.userRights.howToRequest')}</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5 text-[#ffd700]" />
                  {t('privacy.page.sections.childrenPrivacy.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-gray-300">
                <p>{t('privacy.page.sections.childrenPrivacy.p1')}</p>
                <p>{t('privacy.page.sections.childrenPrivacy.p2')}</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Users className="mr-2 h-5 w-5 text-[#00f0ff]" />
                  {t('privacy.page.sections.multiBusiness.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-300">
                <p>{t('privacy.page.sections.multiBusiness.description')}</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  {multiBusinessItemKeys.map((key) => (
                    <li key={key}>{t(`privacy.page.sections.multiBusiness.items.${key}`)}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <RefreshCcw className="mr-2 h-5 w-5 text-[#ffd700]" />
                  {t('privacy.page.sections.changes.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-gray-300">
                <p>{t('privacy.page.sections.changes.p1')}</p>
                <p>{t('privacy.page.sections.changes.p2')}</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Mail className="mr-2 h-5 w-5 text-[#00f0ff]" />
                  {t('privacy.page.sections.contact.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-300">
                <p>{t('privacy.page.sections.contact.description')}</p>
                <div className="space-y-1">
                  <a className="text-[#00f0ff] hover:underline" href="mailto:support@jbsbookme.com">
                    support@jbsbookme.com
                  </a>
                  <div>
                    <a
                      className="text-[#00f0ff] hover:underline"
                      href="https://www.jbsbookme.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      https://www.jbsbookme.com
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        </div>
      </div>
    </div>
  );
}

'use client';

import { ArrowLeft, FileText } from 'lucide-react';
import { HistoryBackButton } from '@/components/layout/history-back-button';
import { useI18n } from '@/lib/i18n/i18n-context';
import { Card, CardContent } from '@/components/ui/card';

export default function TerminosPage() {
  const { t } = useI18n();

  const serviceItems = ['booking', 'sms', 'inAppNotifications', 'management', 'reporting'] as const;

  const clientRoleItems = ['bookManage', 'onTime'] as const;
  const barberRoleItems = ['availability', 'serviceResponsibility'] as const;
  const adminRoleItems = ['manage', 'oversee'] as const;

  const appointmentConfirmSubItems = ['replyYes', 'manualConfirm'] as const;
  const appointmentItems = ['mayRequireSms', 'notFullyConfirmedUntil', 'cancel', 'notResponsible'] as const;

  const smsTypes = ['confirmations', 'reminders', 'changes'] as const;
  const smsNotResponsibleItems = ['carrierDelays', 'blocked', 'incorrectNumbers'] as const;

  const noGuaranteeItems = ['availability', 'attendance', 'revenue', 'retention'] as const;

  const paymentsItems = ['noPaymentsByDefault', 'thirdPartyTerms', 'businessResponsibility'] as const;

  const multiBusinessItems = ['ownData', 'techProvider', 'notPartnerEmployer'] as const;

  const userMustNotItems = ['illegal', 'spam', 'accessOtherData', 'copyResell', 'security'] as const;

  const suspensionItems = ['violations', 'abuseFraud', 'legalObligation'] as const;

  const limitationItems = ['lostIncome', 'missedAppointments', 'conflicts', 'thirdPartyFailures', 'dataLoss'] as const;

  const indemnificationItems = ['yourUse', 'servicesProvided', 'lawViolation', 'disputes'] as const;

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
          <p className="text-gray-400">{t('legal.terms.lastUpdated')}</p>
        </div>

        <Card className="bg-gray-900 border-gray-800 rounded-2xl">
          <CardContent className="p-6 space-y-4 text-gray-300 leading-relaxed">
            <>
              <p>{t('legal.terms.intro')}</p>

              <h2 className="text-white font-semibold text-lg pt-2">{t('legal.terms.sections.service.title')}</h2>
              <p>{t('legal.terms.sections.service.p1')}</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {serviceItems.map((key) => (
                  <li key={key}>{t(`legal.terms.sections.service.items.${key}`)}</li>
                ))}
              </ul>
              <p>{t('legal.terms.sections.service.p2')}</p>

              <h2 className="text-white font-semibold text-lg pt-2">{t('legal.terms.sections.roles.title')}</h2>
              <p>{t('legal.terms.sections.roles.p1')}</p>
              <h3 className="text-white font-semibold">{t('legal.terms.sections.roles.clients.title')}</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {clientRoleItems.map((key) => (
                  <li key={key}>{t(`legal.terms.sections.roles.clients.items.${key}`)}</li>
                ))}
              </ul>
              <h3 className="text-white font-semibold">{t('legal.terms.sections.roles.barbers.title')}</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {barberRoleItems.map((key) => (
                  <li key={key}>{t(`legal.terms.sections.roles.barbers.items.${key}`)}</li>
                ))}
              </ul>
              <h3 className="text-white font-semibold">{t('legal.terms.sections.roles.admins.title')}</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {adminRoleItems.map((key) => (
                  <li key={key}>{t(`legal.terms.sections.roles.admins.items.${key}`)}</li>
                ))}
              </ul>
              <p>{t('legal.terms.sections.roles.p2')}</p>

              <h2 className="text-white font-semibold text-lg pt-2">{t('legal.terms.sections.appointments.title')}</h2>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {appointmentItems.map((key) => {
                  if (key !== 'notFullyConfirmedUntil') {
                    return <li key={key}>{t(`legal.terms.sections.appointments.items.${key}`)}</li>;
                  }

                  return (
                    <li key={key}>
                      {t('legal.terms.sections.appointments.items.notFullyConfirmedUntil')}
                      <ul className="list-disc list-inside space-y-1 ml-6 mt-1">
                        {appointmentConfirmSubItems.map((subKey) => (
                          <li key={subKey}>{t(`legal.terms.sections.appointments.confirmSubItems.${subKey}`)}</li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>

              <h2 className="text-white font-semibold text-lg pt-2">{t('legal.terms.sections.sms.title')}</h2>
              <p>{t('legal.terms.sections.sms.p1')}</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {smsTypes.map((key) => (
                  <li key={key}>{t(`legal.terms.sections.sms.types.${key}`)}</li>
                ))}
              </ul>
              <p>{t('legal.terms.sections.sms.optOut')}</p>
              <p>{t('legal.terms.sections.sms.notResponsible')}</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {smsNotResponsibleItems.map((key) => (
                  <li key={key}>{t(`legal.terms.sections.sms.notResponsibleItems.${key}`)}</li>
                ))}
              </ul>

              <h2 className="text-white font-semibold text-lg pt-2">{t('legal.terms.sections.noGuarantees.title')}</h2>
              <p>{t('legal.terms.sections.noGuarantees.p1')}</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {noGuaranteeItems.map((key) => (
                  <li key={key}>{t(`legal.terms.sections.noGuarantees.items.${key}`)}</li>
                ))}
              </ul>
              <p>{t('legal.terms.sections.noGuarantees.p2')}</p>

              <h2 className="text-white font-semibold text-lg pt-2">{t('legal.terms.sections.payments.title')}</h2>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {paymentsItems.map((key) => (
                  <li key={key}>{t(`legal.terms.sections.payments.items.${key}`)}</li>
                ))}
              </ul>

              <h2 className="text-white font-semibold text-lg pt-2">{t('legal.terms.sections.multiBusiness.title')}</h2>
              <p>{t('legal.terms.sections.multiBusiness.p1')}</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {multiBusinessItems.map((key) => (
                  <li key={key}>{t(`legal.terms.sections.multiBusiness.items.${key}`)}</li>
                ))}
              </ul>

              <h2 className="text-white font-semibold text-lg pt-2">{t('legal.terms.sections.userResponsibilities.title')}</h2>
              <p>{t('legal.terms.sections.userResponsibilities.p1')}</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {userMustNotItems.map((key) => (
                  <li key={key}>{t(`legal.terms.sections.userResponsibilities.items.${key}`)}</li>
                ))}
              </ul>
              <p>{t('legal.terms.sections.userResponsibilities.p2')}</p>

              <h2 className="text-white font-semibold text-lg pt-2">{t('legal.terms.sections.suspension.title')}</h2>
              <p>{t('legal.terms.sections.suspension.p1')}</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {suspensionItems.map((key) => (
                  <li key={key}>{t(`legal.terms.sections.suspension.items.${key}`)}</li>
                ))}
              </ul>
              <p>{t('legal.terms.sections.suspension.p2')}</p>

              <h2 className="text-white font-semibold text-lg pt-2">{t('legal.terms.sections.limitation.title')}</h2>
              <p>{t('legal.terms.sections.limitation.p1')}</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {limitationItems.map((key) => (
                  <li key={key}>{t(`legal.terms.sections.limitation.items.${key}`)}</li>
                ))}
              </ul>
              <p>{t('legal.terms.sections.limitation.p2')}</p>

              <h2 className="text-white font-semibold text-lg pt-2">{t('legal.terms.sections.indemnification.title')}</h2>
              <p>{t('legal.terms.sections.indemnification.p1')}</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                {indemnificationItems.map((key) => (
                  <li key={key}>{t(`legal.terms.sections.indemnification.items.${key}`)}</li>
                ))}
              </ul>

              <h2 className="text-white font-semibold text-lg pt-2">{t('legal.terms.sections.ip.title')}</h2>
              <p>{t('legal.terms.sections.ip.p1')}</p>
              <p>{t('legal.terms.sections.ip.p2')}</p>

              <h2 className="text-white font-semibold text-lg pt-2">{t('legal.terms.sections.governingLaw.title')}</h2>
              <p>{t('legal.terms.sections.governingLaw.p1')}</p>

              <h2 className="text-white font-semibold text-lg pt-2">{t('legal.terms.sections.changes.title')}</h2>
              <p>{t('legal.terms.sections.changes.p1')}</p>
              <p>{t('legal.terms.sections.changes.p2')}</p>

              <h2 className="text-white font-semibold text-lg pt-2">{t('legal.terms.sections.contact.title')}</h2>
              <p>{t('legal.terms.sections.contact.p1')}</p>
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
            </>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

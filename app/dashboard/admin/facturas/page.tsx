'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, ArrowLeft, DollarSign, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/i18n-context';

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'BARBER_PAYMENT' | 'CLIENT_SERVICE';
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  recipientName: string;
  recipientEmail: string;
  amount: number;
  description: string;
  issueDate: string;
  dueDate: string | null;
  isPaid: boolean;
  paidAt: string | null;
}

export default function FacturasPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { t, language } = useI18n();
  const dateLocale = language === 'es' ? es : enUS;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BARBER_PAYMENT' | 'CLIENT_SERVICE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'CANCELLED'>('ALL');

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/invoices');
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      } else {
        toast.error(t('admin.invoicesList.toastErrorLoadingInvoices'));
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error(t('admin.invoicesList.toastErrorLoadingInvoices'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session || session.user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }

    fetchInvoices();
  }, [session, status, router, fetchInvoices]);

  const filteredInvoices = invoices
    .filter(inv => typeFilter === 'ALL' || inv.type === typeFilter)
    .filter(inv => statusFilter === 'ALL' || inv.status === statusFilter);

  const getTypeBadge = (type: string) => {
    return type === 'BARBER_PAYMENT' ? (
      <Badge className="bg-purple-600">{t('admin.invoicesList.typeBarberPayment')}</Badge>
    ) : (
      <Badge className="bg-blue-600">{t('admin.invoicesList.typeClientService')}</Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <Badge className="bg-green-600 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t('admin.invoicesList.statusPaid')}
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-red-600 text-white">
            <XCircle className="w-3 h-3 mr-1" />
            {t('admin.invoicesList.statusCancelled')}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-600 text-white">
            <Clock className="w-3 h-3 mr-1" />
            {t('admin.invoicesList.statusPending')}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-8">
          <p className="text-white text-center">{t('admin.invoicesList.loadingInvoices')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/admin')}
              className="text-gray-400 hover:text-[#00f0ff] active:text-[#00f0ff]"
              aria-label={t('common.back')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-4xl font-bold text-white">{t('admin.invoicesList.title')}</h1>
          </div>
          <Link href="/dashboard/admin/facturas/nueva">
            <Button className="bg-[#00f0ff] text-black hover:bg-[#00d0df]">
              <FileText className="w-4 h-4 mr-2" />
              {t('admin.invoicesList.newInvoice')}
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Type Filters */}
              <div>
                <p className="text-sm text-gray-400 mb-2 font-semibold">{t('admin.invoicesList.filterByType')}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setTypeFilter('ALL')}
                    variant={typeFilter === 'ALL' ? 'default' : 'outline'}
                    className={`${typeFilter === 'ALL' ? 'bg-[#00f0ff] text-black' : 'text-white border-gray-700'} text-sm h-9`}
                  >
                    {t('admin.invoicesList.allTypes')}
                  </Button>
                  <Button
                    onClick={() => setTypeFilter('BARBER_PAYMENT')}
                    variant={typeFilter === 'BARBER_PAYMENT' ? 'default' : 'outline'}
                    className={`${typeFilter === 'BARBER_PAYMENT' ? 'bg-purple-600 text-white' : 'text-white border-gray-700'} text-sm h-9`}
                  >
                    {t('admin.invoicesList.barberPayments')}
                  </Button>
                  <Button
                    onClick={() => setTypeFilter('CLIENT_SERVICE')}
                    variant={typeFilter === 'CLIENT_SERVICE' ? 'default' : 'outline'}
                    className={`${typeFilter === 'CLIENT_SERVICE' ? 'bg-blue-600 text-white' : 'text-white border-gray-700'} text-sm h-9`}
                  >
                    {t('admin.invoicesList.clientServices')}
                  </Button>
                </div>
              </div>
              
              {/* Status Filters */}
              <div>
                <p className="text-sm text-gray-400 mb-2 font-semibold">{t('admin.invoicesList.filterByStatus')}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setStatusFilter('ALL')}
                    variant={statusFilter === 'ALL' ? 'default' : 'outline'}
                    className={`${statusFilter === 'ALL' ? 'bg-[#00f0ff] text-black' : 'text-white border-gray-700'} text-sm h-9`}
                  >
                    {t('admin.invoicesList.allStatus')}
                  </Button>
                  <Button
                    onClick={() => setStatusFilter('PENDING')}
                    variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
                    className={`${statusFilter === 'PENDING' ? 'bg-yellow-600 text-white' : 'text-white border-gray-700'} text-sm h-9`}
                  >
                    <Clock className="w-3 h-3 mr-1.5" />
                    {t('admin.invoicesList.statusPending')}
                  </Button>
                  <Button
                    onClick={() => setStatusFilter('PAID')}
                    variant={statusFilter === 'PAID' ? 'default' : 'outline'}
                    className={`${statusFilter === 'PAID' ? 'bg-green-600 text-white' : 'text-white border-gray-700'} text-sm h-9`}
                  >
                    <CheckCircle className="w-3 h-3 mr-1.5" />
                    {t('admin.invoicesList.statusPaid')}
                  </Button>
                  <Button
                    onClick={() => setStatusFilter('CANCELLED')}
                    variant={statusFilter === 'CANCELLED' ? 'default' : 'outline'}
                    className={`${statusFilter === 'CANCELLED' ? 'bg-red-600 text-white' : 'text-white border-gray-700'} text-sm h-9`}
                  >
                    <XCircle className="w-3 h-3 mr-1.5" />
                    {t('admin.invoicesList.statusCancelled')}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice list */}
        {filteredInvoices.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">{t('admin.invoicesList.noInvoices')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredInvoices.map((invoice) => (
              <Card key={invoice.id} className="bg-gray-900 border-gray-800 hover:border-[#00f0ff] transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Main info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-[#00f0ff]" />
                        <span className="text-xl font-bold text-white">{invoice.invoiceNumber}</span>
                        {getTypeBadge(invoice.type)}
                        {getStatusBadge(invoice.status)}
                      </div>
                      <p className="text-gray-400 mb-1">
                        <strong className="text-white">{t('admin.invoicesList.recipientLabel')}:</strong> {invoice.recipientName}
                      </p>
                      <p className="text-gray-400 mb-1">
                        <strong className="text-white">{t('admin.invoicesList.emailLabel')}:</strong> {invoice.recipientEmail}
                      </p>
                      <p className="text-gray-400 text-sm line-clamp-1">{invoice.description}</p>
                    </div>

                    {/* Amount and date */}
                    <div className="flex flex-col items-start md:items-end gap-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-[#ffd700]" />
                        <span className="text-2xl font-bold text-[#ffd700]">${invoice.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(invoice.issueDate), 'PPP', { locale: dateLocale })}</span>
                      </div>
                      {invoice.isPaid && invoice.paidAt && (
                        <p className="text-green-500 text-sm">
                          {t('admin.invoicesList.paidPrefix')} {format(new Date(invoice.paidAt), 'P', { locale: dateLocale })}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link href={`/dashboard/admin/facturas/${invoice.id}`} target="_blank">
                        <Button
                          size="sm"
                          className="bg-[#00f0ff] text-black hover:bg-[#00d0df]"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {t('common.view')}
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700 text-white hover:bg-gray-800"
                        onClick={() => window.open(`/dashboard/admin/facturas/${invoice.id}`, '_blank')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {t('admin.invoicesList.pdf')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

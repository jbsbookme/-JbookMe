'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, ArrowLeft, Mail, CheckCircle, XCircle, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import Image from 'next/image';

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'BARBER_PAYMENT' | 'CLIENT_SERVICE';
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  issuerName: string;
  issuerAddress: string;
  issuerPhone: string;
  issuerEmail: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  amount: number;
  description: string;
  items: unknown;
  issueDate: string;
  dueDate: string | null;
  weekStart: string | null;
  weekEnd: string | null;
  isPaid: boolean;
  paidAt: string | null;
  barberPayment?: unknown;
  appointment?: unknown;
}

type InvoiceLineItem = {
  description?: string;
  details?: string;
  quantity?: number;
  price?: number;
  unitPrice?: number;
};

export default function InvoiceViewPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (params.id) {
      fetchInvoice(params.id as string);
    }
  }, [params.id]);

  const fetchInvoice = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/invoices/${id}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
      } else {
        toast.error('Error al cargar factura');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Error al cargar factura');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    if (!invoice) return;
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send-email`, {
        method: 'POST',
      });
      
      if (res.ok) {
        toast.success(`Invoice sent to ${invoice.recipientEmail}!`);
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    }
  };

  const handleStatusUpdate = async (newStatus: 'PENDING' | 'PAID' | 'CANCELLED') => {
    if (!invoice) return;
    
    // If marking as PAID, show payment date dialog
    if (newStatus === 'PAID') {
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      setShowPaymentDialog(true);
      return;
    }

    // For other statuses, update directly
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setInvoice(data.invoice);
        const statusText = newStatus === 'CANCELLED' ? 'Cancelled' : 'Pending';
        toast.success(`Invoice marked as ${statusText}`);
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoice) return;
    
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'PAID',
          paidAt: paymentDate 
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setInvoice(data.invoice);
        toast.success('Invoice marked as Paid');
        setShowPaymentDialog(false);
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = () => {
    switch (invoice?.status) {
      case 'PAID':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300 print:border print:border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 print:border print:border-red-300">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 print:border print:border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading invoice...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Invoice not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Botones de acción - ocultos al imprimir */}
      <div className="print:hidden sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-3">
          <div className="flex flex-wrap gap-2 justify-between items-center">
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => router.push('/dashboard/admin/facturas')} 
                variant="outline" 
                size="icon"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              {getStatusBadge()}
            </div>
            <div className="flex flex-wrap gap-2">
              {invoice.status !== 'PAID' && (
                <Button 
                  onClick={() => handleStatusUpdate('PAID')} 
                  size="sm"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg"
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Mark as Paid
                </Button>
              )}
              {invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && (
                <Button 
                  onClick={() => handleStatusUpdate('CANCELLED')} 
                  size="sm"
                  variant="destructive"
                  className="shadow-lg"
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Cancel
                </Button>
              )}
              {invoice.status === 'CANCELLED' && (
                <Button 
                  onClick={() => handleStatusUpdate('PENDING')} 
                  size="sm"
                  variant="outline"
                  className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                >
                  <Clock className="w-4 h-4 mr-1.5" />
                  Restore to Pending
                </Button>
              )}
              <Button 
                onClick={handleSendEmail} 
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 shadow-lg"
              >
                <Mail className="w-4 h-4 mr-1.5" />
                Send
              </Button>
              <Button 
                onClick={handlePrint} 
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 shadow-lg"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Factura imprimible - Formato profesional */}
      <div className="max-w-4xl mx-auto p-12 bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header - Logo y título */}
        <div className="flex justify-between items-start mb-12">
          {/* Logo y datos del negocio */}
          <div className="flex-1">
            <div className="mb-4">
              <Image
                src="/logo.png"
                alt="Logo"
                width={56}
                height={56}
                className="w-14 h-14 rounded-full shadow-md ring-2 ring-cyan-100"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{invoice.issuerName}</h1>
            <div className="text-sm text-gray-600 space-y-1">
              <p>{invoice.issuerAddress}</p>
              <p>📞 {invoice.issuerPhone}</p>
              <p>✉️ {invoice.issuerEmail}</p>
            </div>
          </div>
          
          {/* Invoice number and status */}
          <div className="text-right">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent mb-2">
              Invoice #{invoice.invoiceNumber}
            </h2>
            <div className="mb-4">
              {getStatusBadge()}
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              {invoice.weekStart && invoice.weekEnd && (
                <>
                  <p className="font-semibold">Week Period:</p>
                  <p>{format(new Date(invoice.weekStart), 'MMM dd, yyyy')}</p>
                  <p>to {format(new Date(invoice.weekEnd), 'MMM dd, yyyy')}</p>
                </>
              )}
              <p className="font-semibold mt-3">Issue Date:</p>
              <p>{format(new Date(invoice.issueDate), 'MMM dd, yyyy')}</p>
              {invoice.paidAt && (
                <>
                  <p className="font-semibold mt-3">Paid Date:</p>
                  <p>{format(new Date(invoice.paidAt), 'MMM dd, yyyy')}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Recipient info */}
        <div className="mb-8 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border-l-4 border-cyan-500">
          <p className="text-xs uppercase font-semibold text-gray-600 mb-2">Bill To:</p>
          <p className="font-bold text-gray-900 text-lg">{invoice.recipientName}</p>
          <p className="text-sm text-gray-600">✉️ {invoice.recipientEmail}</p>
          {invoice.recipientPhone && (
            <p className="text-sm text-gray-600">📞 {invoice.recipientPhone}</p>
          )}
        </div>
      </div>

      {/* Factura imprimible - Formato profesional */}
      <div className="max-w-4xl mx-auto p-12 bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header - Logo y título */}
        <div className="flex justify-between items-start mb-12">
          {/* Logo y datos del negocio */}
          <div className="flex-1">
            <div className="mb-4">
              <Image
                src="/logo.png"
                alt="JB Barbershop"
                width={80}
                height={80}
                className="w-20 h-20 object-contain"
              />
            </div>
            <div className="text-sm">
              <h1 className="text-xl font-bold mb-2">Jb&apos;s Barbershop</h1>
              <p className="text-gray-700">98 Union Street</p>
              <p className="text-gray-700">Lynn, Massachusetts 01902 3602</p>
              <p className="text-gray-700">Estados Unidos</p>
              <p className="text-gray-700 mt-2">jb@jbbarbershop.com</p>
              <p className="text-gray-700">781 355 2007</p>
            </div>
          </div>

          {/* Número de recibo */}
          <div className="text-right">
            <h2 className="text-5xl font-bold text-gray-800 mb-2">Receipt {invoice.invoiceNumber.replace('INV-', '')}</h2>
            <div className="text-sm text-gray-600 mt-4">
              <p className="mb-1"><strong>Issue Date:</strong> {format(new Date(invoice.issueDate), "MMM d, yyyy", { locale: es })}</p>
              <p><strong>Invoice #</strong> {invoice.invoiceNumber}</p>
            </div>
          </div>
        </div>

        {/* Línea separadora */}
        <div className="border-t-2 border-gray-300 mb-8"></div>

        {/* Detalles del cliente */}
        <div className="mb-10">
          <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase">Client Details</h3>
          <div className="bg-gray-50 p-4 rounded text-sm">
            <p className="font-semibold text-gray-900">{invoice.recipientName}</p>
            {invoice.recipientEmail && (
              <p className="text-gray-700">{invoice.recipientEmail}</p>
            )}
            {invoice.recipientPhone && (
              <p className="text-gray-700">{invoice.recipientPhone}</p>
            )}
          </div>
        </div>

        {/* Tabla de items - Formato profesional */}
        <div className="mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="text-left py-3 px-4 font-semibold">Item</th>
                <th className="text-center py-3 px-4 font-semibold w-24">Qty</th>
                <th className="text-right py-3 px-4 font-semibold w-32">Price</th>
                <th className="text-right py-3 px-4 font-semibold w-24">Tax</th>
                <th className="text-right py-3 px-4 font-semibold w-32">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0 ? (
                (invoice.items as InvoiceLineItem[]).map((item, index: number) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{item.description || 'Chair'}</div>
                      {item.details && <div className="text-xs text-gray-500 mt-1">{item.details}</div>}
                    </td>
                    <td className="text-center py-4 px-4 text-gray-700">{item.quantity || 1}</td>
                    <td className="text-right py-4 px-4 text-gray-700">{((item.price || item.unitPrice || 0)).toFixed(2)} US$</td>
                    <td className="text-right py-4 px-4 text-gray-700">0.00 US$</td>
                    <td className="text-right py-4 px-4 font-semibold text-gray-900">{((item.price || item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)} US$</td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-4">
                    <div className="font-medium text-gray-900">Chair</div>
                    <div className="text-xs text-gray-500 mt-1">{invoice.description}</div>
                  </td>
                  <td className="text-center py-4 px-4 text-gray-700">1</td>
                  <td className="text-right py-4 px-4 text-gray-700">{invoice.amount.toFixed(2)} US$</td>
                  <td className="text-right py-4 px-4 text-gray-700">0.00 US$</td>
                  <td className="text-right py-4 px-4 font-semibold text-gray-900">{invoice.amount.toFixed(2)} US$</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totales - Formato alineado a la derecha */}
        <div className="flex justify-end mb-12">
          <div className="w-80">
            <div className="text-sm space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-700">Subtotal</span>
                <span className="font-semibold text-gray-900">{invoice.amount.toFixed(2)} US$</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-700">Tax</span>
                <span className="font-semibold text-gray-900">0.00 US$</span>
              </div>
              <div className="flex justify-between py-3 bg-gray-800 text-white px-4 mt-2">
                <span className="font-bold text-base">Total</span>
                <span className="font-bold text-lg">{invoice.amount.toFixed(2)} US$</span>
              </div>
              <div className="flex justify-between py-3 bg-gray-100 px-4 mt-2 rounded">
                <span className="font-semibold text-gray-700">Amount Paid</span>
                <span className="font-bold text-gray-900">{invoice.isPaid ? invoice.amount.toFixed(2) : '0.00'} US$</span>
              </div>
            </div>
          </div>
        </div>

        {/* Estado de pago y fecha de vencimiento */}
        {!invoice.isPaid && invoice.dueDate && (
          <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-yellow-800 font-semibold text-sm">⚠ Payment Pending</p>
            <p className="text-yellow-700 text-xs mt-1">
              Due Date: {format(new Date(invoice.dueDate), "MMMM d, yyyy", { locale: es })}
            </p>
          </div>
        )}

        {invoice.isPaid && invoice.paidAt && (
          <div className="mb-8 bg-green-50 border-l-4 border-green-500 p-4">
            <p className="text-green-800 font-semibold text-sm">✓ PAID</p>
            <p className="text-green-700 text-xs mt-1">
              Payment Date: {format(new Date(invoice.paidAt), "MMMM d, yyyy", { locale: es })}
            </p>
          </div>
        )}

        {/* Notas adicionales */}
        {invoice.description && (
          <div className="mb-8 text-sm">
            <h4 className="font-semibold text-gray-800 mb-2">Notes:</h4>
            <p className="text-gray-600">{invoice.description}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-gray-300 pt-6 mt-12">
          <p className="text-center text-gray-500 text-xs">
            Thank you for your business!
          </p>
          <p className="text-center text-gray-400 text-xs mt-2">
            This is an electronically generated receipt from Jb&apos;s Barbershop
          </p>
        </div>
      </div>

      {/* Payment Date Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Mark Invoice as Paid
            </DialogTitle>
            <DialogDescription>
              Select the date when payment was received from the barber.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment-date" className="text-sm font-medium">
                Payment Date
              </Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500">
                This date will be recorded as the official payment date.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkAsPaid}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

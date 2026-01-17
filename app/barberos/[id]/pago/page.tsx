import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CopyToClipboardButton } from '@/components/copy-to-clipboard-button';
import { ArrowLeft, DollarSign, Mail, Phone } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Params = {
  params: Promise<{ id: string }>;
};

function normalizePhoneForTel(phone: string) {
  const normalized = phone.replace(/[^0-9+]/g, '');
  return normalized;
}

export default async function BarberPaymentPage({ params }: Params) {
  const { id } = await params;

  const barber = await prisma.barber.findUnique({
    where: { id },
    select: {
      id: true,
      zelleEmail: true,
      zellePhone: true,
      cashappTag: true,
      user: { select: { name: true } },
    },
  });

  if (!barber) notFound();

  const zelleEmail = barber.zelleEmail?.trim() || null;
  const zellePhoneRaw = barber.zellePhone?.trim() || null;
  const zellePhoneTel = zellePhoneRaw ? normalizePhoneForTel(zellePhoneRaw) : null;
  const cashTag = barber.cashappTag?.trim() || null;

  const cashAppUrl = cashTag ? `https://cash.app/$${cashTag.replace(/^\$/g, '')}` : null;

  const hasPayments = Boolean(zelleEmail || zellePhoneRaw || cashTag);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/barberos/${barber.id}`} className="text-sm text-gray-300 hover:text-white inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <Button asChild variant="secondary" className="bg-white/10 border border-white/10 text-white hover:bg-white/15">
            <Link href="/reservar">Book appointment</Link>
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">Pay {barber.user?.name || 'your barber'}</h1>
          <p className="text-sm text-gray-400 mt-1">Scan the QR → this page opens → tap Copy and pay in your app.</p>
        </div>

        {!hasPayments ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <p className="text-gray-300">No payment methods configured yet.</p>
              <p className="text-sm text-gray-500 mt-2">Ask the barber to add Zelle or CashApp in their dashboard.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {(zelleEmail || zellePhoneRaw) ? (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-purple-300">
                    <DollarSign className="h-5 w-5" />
                    Zelle
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-gray-500">
                    Open your bank’s Zelle, then paste the email or phone.
                  </div>

                  {zelleEmail ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="text-sm text-gray-200 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-purple-300" />
                        <span className="font-mono break-all">{zelleEmail}</span>
                      </div>
                      <div className="flex gap-2">
                        <CopyToClipboardButton text={zelleEmail} label="Copy" className="border-white/15 text-gray-200 hover:bg-white/10" />
                      </div>
                    </div>
                  ) : null}

                  {zellePhoneRaw ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="text-sm text-gray-200 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-purple-300" />
                        <span className="font-mono break-all">{zellePhoneRaw}</span>
                      </div>
                      <div className="flex gap-2">
                        <CopyToClipboardButton text={zellePhoneTel || zellePhoneRaw} label="Copy" className="border-white/15 text-gray-200 hover:bg-white/10" />
                      </div>
                    </div>
                  ) : null}

                  <div className="text-xs text-gray-500">This avoids opening Gmail/Outlook when scanning a QR.</div>
                </CardContent>
              </Card>
            ) : null}

            {cashTag ? (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-green-300">
                    <DollarSign className="h-5 w-5" />
                    CashApp
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-gray-500">Tap Open to go directly to CashApp, or Copy the tag.</div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="text-sm text-gray-200">
                      <span className="font-mono break-all">${cashTag.replace(/^\$/g, '')}</span>
                    </div>
                    <div className="flex gap-2">
                      <CopyToClipboardButton text={`$${cashTag.replace(/^\$/g, '')}`} label="Copy" className="border-white/15 text-gray-200 hover:bg-white/10" />
                      {cashAppUrl ? (
                        <Button asChild size="sm" className="bg-green-500/90 hover:bg-green-500 text-white">
                          <a href={cashAppUrl} target="_blank" rel="noreferrer noopener">Open</a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">If the link doesn’t open, search the tag inside CashApp.</div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}

        <div className="mt-8 text-xs text-gray-600">
          Tip: If you’re a client, never send money unless you recognize the barber name.
        </div>
      </div>
    </div>
  );
}

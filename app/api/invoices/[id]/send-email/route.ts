import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can send invoices
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const invoiceId = params.id;

    // Fetch the invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        recipient: true,
        barberPayment: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (!invoice.recipientEmail) {
      return NextResponse.json(
        { error: 'Invoice has no recipient email' },
        { status: 400 }
      );
    }

    // Parse items
    type InvoiceLineItem = {
      description?: string;
      quantity?: number | string;
      price?: number | string;
    };

    const toItems = (raw: unknown): InvoiceLineItem[] => {
      if (!Array.isArray(raw)) return [];
      const arr = raw as unknown[];
      const mapped = arr.map((item): InvoiceLineItem | null => {
          if (typeof item !== 'object' || item === null) return null;
          const obj = item as Record<string, unknown>;
          return {
            description: typeof obj.description === 'string' ? obj.description : undefined,
            quantity:
              typeof obj.quantity === 'number' || typeof obj.quantity === 'string'
                ? (obj.quantity as number | string)
                : undefined,
            price:
              typeof obj.price === 'number' || typeof obj.price === 'string'
                ? (obj.price as number | string)
                : undefined,
          };
        });
      return mapped.filter((x): x is InvoiceLineItem => x !== null);
    };

    let items: InvoiceLineItem[] = [];
    try {
      const rawItems: unknown =
        typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
      items = toItems(rawItems);
    } catch (e) {
      console.error('Error parsing items:', e);
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      return sum + (qty * price);
    }, 0);

    // Format items HTML
    const itemsHTML = items.map((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const lineTotal = qty * price;
      
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description || ''}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${qty}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${price.toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // Format dates
    const formatDate = (date: Date | null) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const weekStart = invoice.barberPayment?.weekStart ?? null;
    const weekEnd = invoice.barberPayment?.weekEnd ?? null;

    // Build email HTML
    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  
  <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #06b6d4 0%, #2563eb 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="display: inline-block; margin-bottom: 16px;">
        💈
      </div>
      <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        JB's Barbershop
      </h1>
      <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">
        98 Union Street, Lynn MA 01901
      </p>
      <p style="color: rgba(255, 255, 255, 0.9); margin: 4px 0 0 0; font-size: 14px;">
        📞 (781) 367-7244 | ✉️ jbarbershop@gmail.com
      </p>
    </div>

    <!-- Main Content -->
    <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      
      <!-- Invoice Header -->
      <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 24px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 24px; background: linear-gradient(135deg, #06b6d4 0%, #2563eb 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
          Invoice #${invoice.invoiceNumber}
        </h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px;">
          <div>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Bill To:</p>
            <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 600;">${invoice.recipientName || 'N/A'}</p>
            ${invoice.recipientEmail ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #4b5563;">✉️ ${invoice.recipientEmail}</p>` : ''}
            ${invoice.recipientPhone ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #4b5563;">📞 ${invoice.recipientPhone}</p>` : ''}
          </div>
          
          <div style="text-align: right;">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Week Period:</p>
            <p style="margin: 0; font-size: 14px; color: #111827;">
              ${formatDate(weekStart)} - ${formatDate(weekEnd)}
            </p>
            <p style="margin: 12px 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Issue Date:</p>
            <p style="margin: 0; font-size: 14px; color: #111827;">${formatDate(invoice.issueDate)}</p>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: linear-gradient(135deg, #0891b2 0%, #1d4ed8 100%); color: white;">
            <th style="padding: 14px 12px; text-align: left; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Description</th>
            <th style="padding: 14px 12px; text-align: center; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
            <th style="padding: 14px 12px; text-align: right; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Price</th>
            <th style="padding: 14px 12px; text-align: right; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="border-top: 2px solid #e5e7eb; padding-top: 24px; text-align: right;">
        <div style="display: inline-block; min-width: 300px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span style="color: #6b7280; font-size: 14px;">Subtotal:</span>
            <span style="color: #111827; font-size: 16px; font-weight: 600;">$${subtotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid #e5e7eb;">
            <span style="color: #111827; font-size: 18px; font-weight: 700;">Invoice Total:</span>
            <span style="background: linear-gradient(135deg, #06b6d4 0%, #2563eb 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 24px; font-weight: 700;">$${invoice.amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      ${invoice.description ? `
      <!-- Notes -->
      <div style="margin-top: 32px; padding: 16px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #06b6d4; border-radius: 8px;">
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #0891b2; text-transform: uppercase; font-weight: 600;">Notes:</p>
        <p style="margin: 0; font-size: 14px; color: #0c4a6e; line-height: 1.6;">${invoice.description}</p>
      </div>
      ` : ''}

      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 24px; border-top: 2px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 600;">💈 Thank you for your business! 💈</p>
        <p style="margin: 12px 0 0 0; font-size: 14px; color: #6b7280;">
          Questions? Contact us at jbarbershop@gmail.com or (781) 367-7244
        </p>
      </div>

    </div>

    <!-- Email Footer -->
    <div style="text-align: center; margin-top: 24px; padding: 20px;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        This is an automated email from JB's Barbershop. Please do not reply to this email.
      </p>
    </div>

  </div>

</body>
</html>
    `;

    // Send email
    const ok = await sendEmail({
      to: invoice.recipientEmail,
      subject: `Invoice ${invoice.invoiceNumber} from JB's Barbershop`,
      html: emailHTML,
      text: `Invoice ${invoice.invoiceNumber}\n\nAmount: $${invoice.amount.toFixed(2)}\nWeek: ${formatDate(weekStart)} - ${formatDate(weekEnd)}\n\nView your invoice at: ${process.env.NEXTAUTH_URL}/dashboard/admin/facturas/${invoice.id}`,
    });

    if (!ok) {
      return NextResponse.json(
        { error: 'Failed to send invoice email (email service not configured or send failed)' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invoice sent successfully to ${invoice.recipientEmail}`,
    });

  } catch (error) {
    console.error('Error sending invoice email:', error);
    return NextResponse.json(
      { error: 'Failed to send invoice email' },
      { status: 500 }
    );
  }
}

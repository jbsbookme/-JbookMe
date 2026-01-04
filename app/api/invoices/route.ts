import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { InvoiceType, type Prisma } from '@prisma/client';

// GET /api/invoices - Fetch invoices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const userId = searchParams.get('userId') || session.user.id;

    // Only admins can view invoices for other users
    if (userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const whereClause: Prisma.InvoiceWhereInput = {};

    // If admin: show all invoices (with or without recipientId)
    // If not admin: only show their own invoices
    if (session.user.role !== 'ADMIN') {
      whereClause.recipientId = userId;
    }

    if (type) {
      if (!Object.values(InvoiceType).includes(type as InvoiceType)) {
        return NextResponse.json(
          { error: 'Invalid type. Must be BARBER_PAYMENT or CLIENT_SERVICE' },
          { status: 400 }
        );
      }

      whereClause.type = type as InvoiceType;
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        barberPayment: {
          include: {
            barber: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        appointment: {
          include: {
            service: true,
            barber: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        issueDate: 'desc',
      },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

// POST /api/invoices - Create an invoice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can create invoices' },
        { status: 403 }
      );
    }

    type InvoiceItemCandidate = {
      description?: unknown;
      quantity?: unknown;
      price?: unknown;
    };

    type CreateInvoiceBody = {
      type?: string;
      barberPaymentId?: string | null;
      appointmentId?: string | null;
      recipientId?: string | null;
      recipientName?: string;
      recipientEmail?: string;
      recipientPhone?: string;
      amount?: number;
      description?: string;
      items?: unknown;
      dueDate?: string | null;
      issuerName?: string;
      issuerAddress?: string;
      issuerPhone?: string;
      issuerEmail?: string;
    };

    const body = (await request.json()) as CreateInvoiceBody;
    const {
      type,
      barberPaymentId,
      appointmentId,
      recipientId,
      recipientName,
      recipientEmail,
      amount,
      description,
      items,
      dueDate,
    } = body;

    // Validate required fields
    if (!type || typeof amount !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!Object.values(InvoiceType).includes(type as InvoiceType)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be BARBER_PAYMENT or CLIENT_SERVICE' },
        { status: 400 }
      );
    }

    const invoiceType = type as InvoiceType;

    // Validate recipient information
    if (!recipientId && (!recipientName || !recipientEmail)) {
      return NextResponse.json(
        { error: 'recipientId or recipientName/recipientEmail is required' },
        { status: 400 }
      );
    }

    // Fetch recipient information
    let actualRecipientId = recipientId;
    let actualRecipientName = recipientName;
    let actualRecipientEmail = recipientEmail;
    let actualRecipientPhone = '';

    if (recipientId) {
      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
      });

      if (!recipient) {
        return NextResponse.json(
          { error: 'Recipient not found' },
          { status: 404 }
        );
      }

      actualRecipientName = recipient.name || 'Unnamed';
      actualRecipientEmail = recipient.email;
      actualRecipientPhone = recipient.phone || '';
    } else {
      // For invoices without recipientId, we'll use null but store name/email
      actualRecipientId = null;
    }

    if (!actualRecipientEmail) {
      return NextResponse.json(
        { error: 'recipientEmail is required' },
        { status: 400 }
      );
    }

    // Use business information from request or defaults
    const issuerName = body.issuerName || "Jb's Barbershop";
    const issuerAddress = body.issuerAddress || '98 Union Street, Lynn, Massachusetts 01902 3602, United States';
    const issuerPhone = body.issuerPhone || '781 355 2007';
    const issuerEmail = body.issuerEmail || 'jb@jbbarbershop.com';
    const recipientPhone = body.recipientPhone || '';

    // Generate unique invoice number
    const currentYear = new Date().getFullYear();
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: `INV-${currentYear}-`,
        },
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    const invoiceNumber = `INV-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

    // Validate and process items
    let processedItems: Prisma.InputJsonValue | undefined = undefined;
    if (Array.isArray(items) && items.length > 0) {
      const candidates = items as InvoiceItemCandidate[];
      const validItems = candidates
        .map((item) => {
          const description = typeof item.description === 'string' ? item.description : '';
          const quantity = typeof item.quantity === 'number' ? item.quantity : NaN;
          const price = typeof item.price === 'number' ? item.price : NaN;
          if (!description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) {
            return null;
          }
          return { description, quantity, price };
        })
        .filter((item): item is { description: string; quantity: number; price: number } => item !== null);
      
      if (validItems.length === 0) {
        return NextResponse.json(
          { error: 'Items must have a valid description, quantity, and price' },
          { status: 400 }
        );
      }
      
      processedItems = validItems;
    }

    // Create invoice
    const invoiceData: Prisma.InvoiceUncheckedCreateInput = {
      invoiceNumber,
      type: invoiceType,
      barberPaymentId: barberPaymentId || null,
      appointmentId: appointmentId || null,
      issuerName,
      issuerAddress,
      issuerPhone,
      issuerEmail,
      recipientName: actualRecipientName || 'Unnamed',
      recipientEmail: actualRecipientEmail,
      recipientPhone: recipientPhone || actualRecipientPhone,
      amount,
      description: description || 'Invoice without description',
      items: processedItems,
      issueDate: new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      isPaid: false,
    };

    // Only add recipientId if it exists
    if (actualRecipientId) {
      invoiceData.recipientId = actualRecipientId;
    }

    const includeConfig: Prisma.InvoiceInclude | undefined = actualRecipientId
      ? {
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        }
      : undefined;

    const invoice = await prisma.invoice.create({
      data: invoiceData,
      ...(includeConfig ? { include: includeConfig } : {}),
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}

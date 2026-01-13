import { NextResponse } from 'next/server';

import { sendEmail } from '@/lib/email';

function isValidEmail(email: string): boolean {
  const value = email.trim();
  if (value.length < 5 || value.length > 254) return false;
  // Simple, safe email check (not fully RFC-complete, but good for forms)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitize(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLen);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const fullName = sanitize(body?.fullName, 120);
    const email = sanitize(body?.email, 254);
    const phone = sanitize(body?.phone, 64);
    const role = sanitize(body?.role, 32);
    const yearsExperience = sanitize(body?.yearsExperience, 16);
    const instagram = sanitize(body?.instagram, 120);
    const portfolioUrl = sanitize(body?.portfolioUrl, 512);
    const message = sanitize(body?.message, 2000);

    // honeypot
    const company = sanitize(body?.company, 120);
    if (company) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (fullName.length < 2) {
      return NextResponse.json({ error: 'Invalid name.' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email.' }, { status: 400 });
    }

    if (phone.length < 7) {
      return NextResponse.json({ error: 'Invalid phone number.' }, { status: 400 });
    }

    if (role !== 'barbero' && role !== 'estilista') {
      return NextResponse.json({ error: 'Please select a valid role.' }, { status: 400 });
    }

    const to =
      process.env.JOB_APPLICATION_TO ||
      process.env.CONTACT_EMAIL ||
      process.env.ADMIN_EMAIL ||
      process.env.EMAIL_FROM ||
      process.env.FROM_EMAIL;

    if (!to) {
      return NextResponse.json(
        {
          error:
            'Destination email is not configured. Set JOB_APPLICATION_TO (recommended).',
        },
        { status: 500 }
      );
    }

    const subject = `Nueva aplicación (${role}) - ${fullName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; padding: 16px;">
        <h2>Nueva aplicación para JB Barbershop</h2>
        <p><strong>Nombre:</strong> ${escapeHtml(fullName)}</p>
        <p><strong>Rol:</strong> ${escapeHtml(role)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(phone)}</p>
        ${yearsExperience ? `<p><strong>Experiencia:</strong> ${escapeHtml(yearsExperience)} años</p>` : ''}
        ${instagram ? `<p><strong>Instagram:</strong> ${escapeHtml(instagram)}</p>` : ''}
        ${portfolioUrl ? `<p><strong>Portafolio:</strong> ${escapeHtml(portfolioUrl)}</p>` : ''}
        ${message ? `<p><strong>Mensaje:</strong><br/>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>` : ''}
        <hr />
        <p style="color:#666; font-size: 12px;">
          Enviado desde el formulario /aplicar.
        </p>
      </div>
    `.trim();

    const sent = await sendEmail({
      to,
      subject,
      html,
    });

    return NextResponse.json({ ok: true, sent }, { status: 200 });
  } catch (error) {
    console.error('[job-application] error', error);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

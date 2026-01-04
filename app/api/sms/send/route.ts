import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { sendSMS, isTwilioConfigured } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    if (!isTwilioConfigured()) {
      return NextResponse.json(
        { 
          error: 'Twilio no está configurado',
          requiresConfiguration: true,
          instructions: 'Configura TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_PHONE_NUMBER en el archivo .env'
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { to, message } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Número de teléfono y mensaje son requeridos' },
        { status: 400 }
      );
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(to.replace(/[\s-()]/g, ''))) {
      return NextResponse.json(
        { error: 'Formato de número de teléfono inválido. Use formato internacional (ej: +1234567890)' },
        { status: 400 }
      );
    }

    const result = await sendSMS(to, message);

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: 'SMS enviado exitosamente',
          sid: result.sid
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('SMS API error:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud de SMS' },
      { status: 500 }
    );
  }
}

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const smsEnabledEnv = (process.env.TWILIO_SMS_ENABLED || '').toLowerCase();
const smsEnabled = smsEnabledEnv === 'true' || smsEnabledEnv === '1';

let twilioClient: ReturnType<typeof twilio> | null = null;

if (accountSid && authToken && accountSid !== 'placeholder-twilio-account-sid') {
  try {
    twilioClient = twilio(accountSid, authToken);
  } catch (error) {
    console.error('Error initializing Twilio client:', error);
  }
}

export async function sendSMS(to: string, message: string) {
  if (!smsEnabled) {
    console.warn('SMS disabled via TWILIO_SMS_ENABLED');
    return {
      success: false,
      error: 'SMS desactivado',
      requiresConfiguration: true,
    };
  }

  if (!twilioClient) {
    console.warn('Twilio not configured, skipping SMS');
    return {
      success: false,
      error: 'Twilio no está configurado',
      requiresConfiguration: true
    };
  }

  if (!twilioPhoneNumber) {
    console.error('TWILIO_PHONE_NUMBER not configured');
    return {
      success: false,
      error: 'Número de Twilio no configurado'
    };
  }

  try {
    const normalizedTo = normalizePhoneNumber(to);
    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: normalizedTo
    });

    console.log('SMS sent successfully:', result.sid);
    return {
      success: true,
      sid: result.sid,
      status: result.status
    };
  } catch (error: unknown) {
    console.error('Error sending SMS:', error);
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: message || 'Error al enviar SMS'
    };
  }
}

export function normalizePhoneNumber(phone: string): string {
  const trimmed = String(phone || '').trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('+')) return trimmed;

  // Strip non-digits
  const digits = trimmed.replace(/\D/g, '');
  // Common US formats: 10 digits or 11 digits starting with 1
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;

  // Fallback: return original; Twilio may still accept it depending on formatting.
  return trimmed;
}

export function isTwilioConfigured(): boolean {
  return !!twilioClient;
}

export function isTwilioSmsEnabled(): boolean {
  return smsEnabled;
}

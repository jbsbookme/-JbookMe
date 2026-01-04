import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: ReturnType<typeof twilio> | null = null;

if (accountSid && authToken && accountSid !== 'placeholder-twilio-account-sid') {
  try {
    twilioClient = twilio(accountSid, authToken);
  } catch (error) {
    console.error('Error initializing Twilio client:', error);
  }
}

export async function sendSMS(to: string, message: string) {
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
    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: to
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

export function isTwilioConfigured(): boolean {
  return !!twilioClient;
}

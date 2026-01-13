import QRCode from 'qrcode';

export async function generateQRCode(url: string, useStandardColors = false): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(url, {
      // High-res QR renders much better on phone screens (avoids blur from upscaling).
      width: 900,
      margin: 4,
      errorCorrectionLevel: 'H',
      color: useStandardColors
        ? {
            dark: '#000000',
            light: '#ffffff',
          }
        : {
            dark: '#00f0ff',
            light: '#0a0a0a',
          },
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

export function isReviewsAutoResponseEnabled(): boolean {
  // Enabled by default. Set to 'false' to disable.
  return process.env.REVIEWS_AUTO_RESPONSE_ENABLED !== 'false';
}

export function getReviewsAutoResponseTemplate(rating?: number): string {
  const fromEnv = process.env.REVIEWS_AUTO_RESPONSE_TEMPLATE;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();

  // Default Spanish templates (professional tone)
  if (typeof rating === 'number' && rating <= 3) {
    return (
      'Gracias por tu reseña. Lamentamos que tu experiencia no haya sido la esperada. ' +
      'Tu opinión es muy importante para nosotros y nos ayuda a mejorar. ' +
      'Si deseas, contáctanos para poder atender tu caso y darte una mejor solución. '
    ).trim();
  }

  return (
    '¡Gracias por tu reseña! Nos alegra saber que disfrutaste tu visita en JB BarberShop. ' +
    'Tu apoyo significa mucho para la familia JB y nos motiva a seguir mejorando cada día. ' +
    '¡Te esperamos pronto!'
  ).trim();
}

export function getAutoAdminResponseForReview(rating?: number): {
  adminResponse: string | null;
  adminRespondedAt: Date | null;
} {
  if (!isReviewsAutoResponseEnabled()) {
    return { adminResponse: null, adminRespondedAt: null };
  }

  const adminResponse = getReviewsAutoResponseTemplate(rating);
  return {
    adminResponse,
    adminRespondedAt: adminResponse ? new Date() : null,
  };
}

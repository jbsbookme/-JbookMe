type FacebookPublishResult = {
  ok: boolean;
  id?: string;
  error?: unknown;
};

function getFacebookConfig() {
  const enabled = process.env.FACEBOOK_ENABLED;
  const pageId =
    process.env.FACEBOOK_PAGE_ID ||
    process.env.FACEBOOK_PAGEID ||
    process.env.FB_PAGE_ID ||
    process.env.FB_PAGEID;

  const accessToken =
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
    process.env.FACEBOOK_PAGE_TOKEN ||
    process.env.FACEBOOK_ACCESS_TOKEN ||
    process.env.FACEBOOK_TOKEN ||
    process.env.FB_PAGE_ACCESS_TOKEN ||
    process.env.FB_ACCESS_TOKEN;

  // Default behavior: if the credentials are present, enable publishing.
  // You can explicitly disable with FACEBOOK_ENABLED=0/false/no.
  const explicitlyDisabled =
    enabled === '0' || enabled === 'false' || enabled === 'no';
  const hasCredentials = !!pageId && !!accessToken;
  const isEnabled = !explicitlyDisabled && hasCredentials;

  return {
    isEnabled,
    pageId,
    accessToken,
  };
}

export async function publishLinkToFacebookPage(options: {
  message: string;
  link: string;
}): Promise<FacebookPublishResult> {
  const { isEnabled, pageId, accessToken } = getFacebookConfig();

  // Diagnostic (safe): do not log token value.
  console.log('[facebook] publishLinkToFacebookPage config:', {
    isEnabled,
    hasPageId: !!pageId,
    hasAccessToken: !!accessToken,
  });

  if (!isEnabled) {
    return { ok: false, error: 'FACEBOOK_DISABLED_OR_MISSING_CONFIG' };
  }

  // (Should be implied by isEnabled, but keep it defensive.)
  if (!pageId || !accessToken) return { ok: false, error: 'FACEBOOK_MISSING_CONFIG' };

  const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/feed`;

  const body = new URLSearchParams();
  body.set('message', options.message);
  body.set('link', options.link);
  body.set('access_token', accessToken);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = (await res.json()) as { id?: string; error?: unknown };

    if (!res.ok) {
      return { ok: false, error: data?.error || data };
    }

    return { ok: true, id: data?.id };
  } catch (error) {
    return { ok: false, error };
  }
}

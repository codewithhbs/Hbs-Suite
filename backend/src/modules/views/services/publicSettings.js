/** Settings safe to send to any browser (never secrets / razorpay keys). */
const PUBLIC_KEYS = [
  "platform_name", "site_tagline", "logo_url", "favicon_url", "brand_color", "support_email", "support_phone",
  "contact_address", "social_links", "seo_title", "seo_description", "seo_keywords", "footer_text",
  "allow_signup", "app_disable_right_click", "currency", "tax_percent", "default_plan_slug",
];

export function publicSettings(s = {}) {
  const out = {};
  for (const k of PUBLIC_KEYS) out[k] = s[k] ?? null;
  return out;
}

/** Admin settings form: everything, secrets masked. */
export function maskedSettings(s = {}) {
  return {
    ...s,
    razorpay_key_secret: s.razorpay_key_secret ? "********" : "",
    razorpay_webhook_secret: s.razorpay_webhook_secret ? "********" : "",
  };
}

const { escapeHtml } = require("./send");

/**
 * Renders campaign content (TipTap HTML) into a branded, email-safe message.
 * - inlines styles (email clients ignore stylesheets)
 * - replaces merge fields ({{firstName}}, {{lastName}})
 * - tags links to our own sites with UTM parameters and a signed recipient token (ec) so site
 *   visits from the email can be attributed to the campaign
 */

const OUR_HOSTS = new Set(["themodel.cloud", "www.themodel.cloud", "app.themodel.cloud"]);

const TAG_STYLES = {
  h1: "font-size:26px;line-height:1.3;margin:0 0 16px;color:#111111;",
  h2: "font-size:22px;line-height:1.3;margin:0 0 14px;color:#111111;",
  h3: "font-size:18px;line-height:1.3;margin:0 0 12px;color:#111111;",
  p: "margin:0 0 16px;",
  ul: "margin:0 0 16px;padding-left:24px;",
  ol: "margin:0 0 16px;padding-left:24px;",
  blockquote: "margin:0 0 16px;padding-left:16px;border-left:3px solid #dddddd;color:#555555;",
  a: "color:#0b6bcb;",
  img: "max-width:100%;height:auto;border-radius:4px;",
};

const styleEmailHtml = (html) =>
  html.replace(/<(h1|h2|h3|p|ul|ol|blockquote|a|img)(\s[^>]*)?>/gi, (match, tag, attrs = "") => {
    const style = TAG_STYLES[tag.toLowerCase()];
    // TipTap output has no inline styles; if there is one, leave the tag alone
    return /\sstyle=/i.test(attrs) ? match : `<${tag}${attrs} style="${style}">`;
  });

/** Replace {{firstName}} / {{lastName}}. Values are HTML-escaped unless `plain` is set. */
const applyMerge = (text, { firstName, lastName }, { plain = false } = {}) => {
  const clean = (v, fallback) => {
    const value = (v || "").trim() || fallback;
    return plain ? value : escapeHtml(value);
  };
  return String(text || "")
    .replace(/\{\{\s*firstName\s*\}\}/gi, clean(firstName, "there"))
    .replace(/\{\{\s*lastName\s*\}\}/gi, clean(lastName, ""));
};

/** Add UTM + recipient token to links pointing at our own sites. */
const addTracking = (html, { campaignId, token }) =>
  html.replace(/href="(https?:\/\/[^"]+)"/gi, (match, rawUrl) => {
    try {
      const url = new URL(rawUrl.replace(/&amp;/g, "&"));
      if (!OUR_HOSTS.has(url.hostname)) return match;
      url.searchParams.set("utm_source", "model-cloud-email");
      url.searchParams.set("utm_medium", "email");
      url.searchParams.set("utm_campaign", campaignId);
      url.searchParams.set("ec", token);
      return `href="${url.toString().replace(/&/g, "&amp;")}"`;
    } catch {
      return match;
    }
  });

const htmlToText = (html) =>
  html
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (m, href, label) => `${label.replace(/<[^>]+>/g, "")} (${href.replace(/&amp;/g, "&")})`)
    .replace(/<\/(p|h1|h2|h3|li|blockquote)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const buildWrapper = (preheader) => (inner) => `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f4f5f7;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader || "")}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#111111;">The Model Cloud</td></tr>
        <tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;">${inner}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

/**
 * @returns {{inner: string, wrap: (inner: string) => string, text: string}}
 *   inner - styled, merged (and optionally tracked) content; sendToUser appends the footer to it
 *   wrap  - puts inner + footer in the branded template
 */
const renderCampaignEmail = ({ html, preheader, firstName, lastName, campaignId, token }) => {
  let inner = styleEmailHtml(applyMerge(html, { firstName, lastName }));
  if (campaignId && token) inner = addTracking(inner, { campaignId, token });
  return {
    inner,
    wrap: buildWrapper(applyMerge(preheader, { firstName, lastName }, { plain: true })),
    text: htmlToText(inner),
  };
};

module.exports = { renderCampaignEmail, applyMerge, htmlToText, styleEmailHtml, addTracking };

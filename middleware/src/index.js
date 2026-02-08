/**
 * Contact Form Worker - Production Ready
 * 
 * Required wrangler.toml bindings:
 * 
 * [[kv_namespaces]]
 * binding = "RATE_LIMITER"
 * id = "your_kv_namespace_id"
 * 
 * [vars]
 * AWS_REGION = "eu-north-1"
 * 
 * [[env.production.secrets]]
 * TURNSTILE_SECRET_KEY
 * AWS_ACCESS_KEY_ID
 * AWS_SECRET_ACCESS_KEY
 */

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

/**
 * Allowed browser origins for CORS.
 */
const ALLOWED_ORIGINS = new Set([
  "https://raduhhr.xyz",
  "https://www.raduhhr.xyz",
  "https://cf-form-page.pages.dev",
]);

/**
 * Allowed hostnames returned by Turnstile siteverify.
 */
const ALLOWED_TURNSTILE_HOSTNAMES = new Set([
  "raduhhr.xyz",
  "www.raduhhr.xyz",
  "cf-form-page.pages.dev",
]);

const MAX_BODY_BYTES = 10_000;
const RATE_LIMIT_MAX = 5; // Max submissions per hour per IP
const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // Enforce origin allowlist for browser requests
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json({ error: "Forbidden origin" }, 403);
    }

    const corsHeaders = buildCorsHeaders(origin);
    const securityHeaders = buildSecurityHeaders();

    // Preflight
    if (request.method === "OPTIONS") {
      if (origin && !ALLOWED_ORIGINS.has(origin)) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { 
        status: 204, 
        headers: { ...corsHeaders, ...securityHeaders }
      });
    }

    if (request.method !== "POST") {
      return json(
        { error: "Method Not Allowed" }, 
        405, 
        { ...corsHeaders, ...securityHeaders }
      );
    }

    try {
      // Environment sanity checks
      if (!env.TURNSTILE_SECRET_KEY) throw new Error("Missing TURNSTILE_SECRET_KEY");
      if (!env.AWS_ACCESS_KEY_ID) throw new Error("Missing AWS_ACCESS_KEY_ID");
      if (!env.AWS_SECRET_ACCESS_KEY) throw new Error("Missing AWS_SECRET_ACCESS_KEY");
      if (!env.RATE_LIMITER) throw new Error("Missing RATE_LIMITER KV namespace");

      const ip = request.headers.get("CF-Connecting-IP") || "unknown";

      // Rate limiting
      const rateLimitKey = `ratelimit:${ip}`;
      const submissionCount = await env.RATE_LIMITER.get(rateLimitKey);
      
      if (submissionCount && parseInt(submissionCount) >= RATE_LIMIT_MAX) {
        return json(
          { error: "Rate limit exceeded. Please try again in an hour." }, 
          429, 
          { ...corsHeaders, ...securityHeaders }
        );
      }

      // Body size guard + JSON parse
      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) {
        return json(
          { error: "Payload too large" }, 
          413, 
          { ...corsHeaders, ...securityHeaders }
        );
      }

      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return json(
          { error: "Invalid JSON" }, 
          400, 
          { ...corsHeaders, ...securityHeaders }
        );
      }

      // Extract and trim fields
      const name = (payload.name || "").trim();
      const email = (payload.email || "").trim();
      const message = (payload.message || "").trim();
      const turnstileToken = (payload.turnstileToken || "").trim();

      // Required fields check
      if (!name || !email || !message || !turnstileToken) {
        return json(
          { error: "All fields are required" }, 
          400, 
          { ...corsHeaders, ...securityHeaders }
        );
      }

      // Field validation
      if (name.length < 2 || name.length > 100) {
        return json(
          { error: "Name must be between 2 and 100 characters" }, 
          400, 
          { ...corsHeaders, ...securityHeaders }
        );
      }

      if (!isValidEmail(email)) {
        return json(
          { error: "Invalid email address" }, 
          400, 
          { ...corsHeaders, ...securityHeaders }
        );
      }

      if (message.length < 10 || message.length > 2000) {
        return json(
          { error: "Message must be between 10 and 2000 characters" }, 
          400, 
          { ...corsHeaders, ...securityHeaders }
        );
      }

      // Turnstile verification
      const turnstile = await validateTurnstileToken(
        turnstileToken,
        env.TURNSTILE_SECRET_KEY,
        ip
      );

      if (!turnstile?.success) {
        return json(
          { error: "Security verification failed" }, 
          400, 
          { ...corsHeaders, ...securityHeaders }
        );
      }

      const verifiedHostname = turnstile.hostname || "";
      if (!ALLOWED_TURNSTILE_HOSTNAMES.has(verifiedHostname)) {
        return json(
          { error: "Invalid verification context" }, 
          400, 
          { ...corsHeaders, ...securityHeaders }
        );
      }

      // Send email via SES
      const sesClient = new SESClient({
        region: env.AWS_REGION || "eu-north-1",
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const now = new Date().toISOString();
      const ua = request.headers.get("User-Agent") || "Unknown";

      const params = {
        Source: "raduhrr@gmail.com",
        Destination: {
          ToAddresses: ["vladdulgher@yahoo.com"],
        },
        Message: {
          Subject: { Data: "New Contact Form Submission" },
          Body: {
            Text: {
              Data:
                `New submission from: ${name}\n` +
                `Email: ${email}\n` +
                `Message: ${message}\n\n` +
                `---\n` +
                `Timestamp: ${now}\n` +
                `IP: ${ip}\n` +
                `User Agent: ${ua}\n`,
            },
            Html: {
              Data:
                `<h3>New Contact Submission</h3>` +
                `<p><strong>Name:</strong> ${escapeHtml(name)}</p>` +
                `<p><strong>Email:</strong> ${escapeHtml(email)}</p>` +
                `<p><strong>Message:</strong></p>` +
                `<pre style="white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;padding:12px;background:#f6f8fa;border:1px solid #d0d7de;border-radius:6px;">${escapeHtml(
                  message
                )}</pre>` +
                `<hr style="margin:20px 0;border:none;border-top:1px solid #d0d7de;"/>` +
                `<p style="font-size:12px;color:#57606a;">` +
                `<strong>Timestamp:</strong> ${escapeHtml(now)}<br/>` +
                `<strong>IP:</strong> ${escapeHtml(ip)}<br/>` +
                `<strong>User Agent:</strong> ${escapeHtml(ua)}` +
                `</p>`,
            },
          },
        },
        ReplyToAddresses: ["raduhhr@yahoo.com"],
      };

      await sesClient.send(new SendEmailCommand(params));

      // Increment rate limit counter after successful send
      const newCount = (parseInt(submissionCount) || 0) + 1;
      await env.RATE_LIMITER.put(
        rateLimitKey, 
        String(newCount), 
        { expirationTtl: RATE_LIMIT_WINDOW }
      );

      return json(
        { success: "Email sent successfully!" }, 
        200, 
        { ...corsHeaders, ...securityHeaders }
      );

    } catch (error) {
      // Generic error response - don't leak internals
      return json(
        { error: "Failed to send email. Please try again later." }, 
        500, 
        { ...corsHeaders, ...securityHeaders }
      );
    }
  },
};

// --- Helpers ---

function buildCorsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function buildSecurityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none';",
  };
}

function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function isValidEmail(email) {
  // Conservative email validation
  if (email.length > 254 || email.length < 3) return false;
  if (/[\r\n\t]/.test(email)) return false;
  
  // RFC 5322 simplified pattern
  const pattern = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return pattern.test(email);
}

async function validateTurnstileToken(token, secretKey, remoteip) {
  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);
  if (remoteip && remoteip !== "unknown") {
    formData.append("remoteip", remoteip);
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { 
        method: "POST", 
        body: formData,
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) return { success: false };
    return await response.json();
  } catch {
    return { success: false };
  }
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

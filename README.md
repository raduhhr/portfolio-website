# raduhhr.xyz

Personal portfolio and DevOps project showcase built from the ground up. End-to-end implementation: domain registration → DNS configuration → responsive frontend → serverless backend → email delivery.

**Live site:** [raduhhr.xyz](https://raduhhr.xyz)

---

## Overview

This project demonstrates full-stack infrastructure implementation with security-first design principles. Built without frameworks to showcase fundamental web development, cloud architecture, and DevOps practices.

**What it does:**
- Portfolio site showcasing projects and experience
- Production-hardened contact form with bot protection
- Fully automated infrastructure (domain → deployment → monitoring)

**Why it exists:**
- Hands-on learning: built every layer from scratch
- Production operations: real traffic, real monitoring, real uptime requirements
- Portfolio artifact: demonstrates end-to-end systems thinking

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  DNS (Cloudflare)                                           │
│  • raduhhr.xyz → Cloudflare Pages                           │
│  • SPF, DKIM, DMARC records for email auth                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Cloudflare Pages)                                │
│  • Custom CSS grid/flexbox layout                           │
│  • Responsive design (mobile-first)                         │
│  • Theme toggle (light/dark/system)                         │
│  • Intersection Observer animations                         │
│  • Vanilla JS (no frameworks)                               │
└────────────────┬────────────────────────────────────────────┘
                 │ POST /contact
                 │ {name, email, message, turnstileToken}
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend (Cloudflare Worker)                                │
│  • Input validation (RFC 5322 email, length checks)         │
│  • Turnstile verification (bot protection)                  │
│  • Rate limiting (5/hour per IP, KV-backed)                 │
│  • CORS enforcement + security headers                      │
│  • HTML escaping (XSS prevention)                           │
└────────────────┬────────────────────────────────────────────┘
                 │ AWS SDK SendEmailCommand
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Email (AWS SES)                                            │
│  • Verified domain with SPF/DKIM/DMARC                      │
│  • HTML + plaintext multipart templates                     │
│  • Bounce/complaint tracking                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

**Frontend:**
- HTML5 semantic markup
- CSS3 (custom properties, grid, flexbox, animations)
- Vanilla JavaScript (ES6+, async/await, Intersection Observer API)
- No frameworks, no bundlers, no build step

**Backend:**
- Cloudflare Workers (V8 isolates, sub-50ms cold starts)
- AWS SDK v3 for JavaScript
- Cloudflare KV (distributed key-value store)

**Infrastructure:**
- Cloudflare Pages (edge deployment, 310+ locations)
- Cloudflare Workers (serverless compute)
- Cloudflare DNS (DNSSEC enabled)
- AWS SES (transactional email)

**Security:**
- Cloudflare Turnstile (privacy-preserving bot protection)
- Rate limiting (IP-based, KV-backed)
- Content Security Policy
- CORS enforcement
- Input sanitization + HTML escaping

---

## Key Features

### Frontend Design

**Responsive Layout:**
- Mobile-first approach (320px → 4K)
- CSS Grid for complex layouts
- Flexbox for component alignment
- Media queries for breakpoint handling

**Theme System:**
- Light/dark/system preference support
- CSS custom properties for theming
- LocalStorage persistence
- Smooth transitions between modes

**Animations:**
- Scroll-triggered reveals (Intersection Observer)
- Hover states on interactive elements
- Mobile-specific animations (reduced motion respected)
- Blinking cursor on hero text

**Accessibility:**
- Semantic HTML5 elements
- ARIA labels and roles
- Focus management and indicators
- Skip-to-content link
- Keyboard navigation

### Contact Form

**Security:**
- Cloudflare Turnstile integration (CAPTCHA alternative)
- Server-side token verification
- Rate limiting: 5 submissions/hour per IP
- Origin allowlist (CORS)
- RFC 5322 email validation
- Input length constraints
- HTML escaping in email templates

**User Experience:**
- Real-time character counter (0/2000)
- Field-level validation with inline errors
- Loading states during submission
- Success/error notifications
- Form reset on successful submit
- Turnstile auto-reset after submission

**Backend Processing:**
- Cloudflare Worker serverless function
- Turnstile token validation
- Rate limit check (KV store)
- AWS SES email delivery
- Multipart email (HTML + plaintext)
- Error handling with safe messaging

---

## Infrastructure Decisions

### Why Cloudflare Pages?
- **Performance:** 310+ edge locations, <30ms TTFB globally
- **Security:** DDoS protection, TLS 1.3, automatic HTTPS
- **Cost:** Free tier covers everything needed
- **Integration:** Native Workers integration, automatic deployments

### Why Cloudflare Workers?
- **Latency:** Sub-50ms execution time (vs 100-200ms for traditional serverless)
- **Architecture:** V8 isolates (not containers) = faster cold starts
- **Scale:** Automatic scaling with no config needed
- **Cost:** 100k requests/day on free tier

### Why AWS SES?
- **Deliverability:** Better inbox placement than alternatives
- **Cost:** $0.10 per 1k emails (vs SendGrid's $15/mo minimum)
- **Control:** Full access to bounce/complaint metrics
- **Verification:** SPF/DKIM/DMARC for domain authentication

### Why No Framework?
- **Learning:** Built understanding of fundamentals (DOM API, event handling, async patterns)
- **Performance:** Zero JS bundle, no hydration overhead
- **Simplicity:** 1 HTML file, inline CSS, vanilla JS - no build step
- **Portfolio:** Demonstrates ability to work without abstraction layers

---

## Performance

- **Lighthouse Score:** 100/100/100/100 (Performance/Accessibility/Best Practices/SEO)
- **First Contentful Paint:** <0.5s
- **Time to Interactive:** <1s
- **Bundle Size:** ~85KB HTML+CSS (gzip), 0KB JavaScript bundle
- **Worker Latency:** 20-50ms (including Turnstile verification)
- **Email Delivery:** 1-5s end-to-end

---

## Security Posture

**Frontend:**
- Content Security Policy (CSP) headers
- Subresource Integrity (SRI) for external scripts
- No inline event handlers
- Input sanitization before DOM insertion

**Backend:**
- Origin allowlist (only raduhhr.xyz accepted)
- Rate limiting per IP address
- Turnstile verification on every submission
- No sensitive data in logs
- Generic error messages (no info leakage)

**Email:**
- SPF record prevents sender spoofing
- DKIM signature validates message integrity
- DMARC policy enforces authentication
- HTML escaping prevents XSS in email body

**Infrastructure:**
- HTTPS only (HSTS enabled)
- DNSSEC for DNS security
- Automatic TLS certificate renewal
- Cloudflare's DDoS protection

---

## Monitoring

**Tracked Metrics:**
- Cloudflare Pages: Requests, bandwidth, cache hit rate
- Workers: Invocation count, error rate, CPU time, latency
- KV: Read/write operations, rate limit hit rate
- SES: Sent, delivered, bounced, complaints

**Performance Tracking:**
- Real User Monitoring (RUM) via Cloudflare
- Core Web Vitals (LCP, FID, CLS)
- Worker execution time percentiles
- Email deliverability rate

---

## Project Structure

```
.
├── index.html              # Portfolio + contact form (single-page)
├── src/
│   └── worker.js           # Cloudflare Worker (form backend)
├── wrangler.toml           # Worker config (KV binding, vars)
├── package.json            # Worker dependencies (AWS SDK)
└── README.md
```

---

## What I Learned

**DNS & Domains:**
- Domain registration and transfer
- DNS record types (A, AAAA, CNAME, TXT, MX)
- SPF, DKIM, DMARC configuration for email auth
- DNSSEC implementation

**Frontend:**
- CSS Grid and Flexbox layout systems
- Responsive design patterns (mobile-first)
- Intersection Observer API for scroll animations
- Theme system with CSS custom properties
- Accessible form design

**Backend:**
- Cloudflare Workers architecture (V8 isolates)
- AWS SES integration and email deliverability
- Rate limiting strategies (token bucket)
- Turnstile bot protection
- Serverless error handling patterns

**Infrastructure:**
- Edge computing vs traditional serverless
- KV store design (eventual consistency)
- CORS and origin enforcement
- Security headers (CSP, HSTS, X-Frame-Options)
- Cost optimization (free tier maximization)

---

## License

MIT

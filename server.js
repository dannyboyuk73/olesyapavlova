const express = require('express');
const { Resend } = require('resend');
const path = require('path');
const config = require('./site-config');

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json());
// Accept plain HTML form posts too — the booking form's no-JS fallback
// (method="post" action="/api/contact") submits urlencoded, not JSON.
app.use(express.urlencoded({ extended: false }));

// Never leak the enquiry page's URL (or anything else) to third parties in full.
app.use((req, res, next) => {
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Sandpit/staging only: keep the preview site out of search engines.
// Enabled by setting STAGING=true on the staging Railway service; the live
// service leaves it unset, so this never affects olesyapavlova.co.uk.
const IS_STAGING = process.env.STAGING === 'true';
if (IS_STAGING) {
  app.use((req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow');
    next();
  });
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send('User-agent: *\nDisallow: /\n');
  });
}

// Do not send real enquiry emails while testing / in dev. Real emails are only
// sent when a Resend key is present AND test mode is not explicitly enabled.
const CONTACT_TEST_MODE = process.env.CONTACT_TEST_MODE === 'true' || !process.env.RESEND_API_KEY;

// Keep the factual treatment-information page out of search engines
// (defence in depth alongside its meta robots tag). It is intentionally
// reachable only via the consultation page, never linked from the homepage.
app.use((req, res, next) => {
  if (req.path.startsWith('/treatment-information')) {
    res.set('X-Robots-Tag', 'noindex, nofollow');
  }
  next();
});

// Clean URLs for pages
const page = (file) => (req, res) => res.sendFile(path.join(__dirname, file));
app.get('/about', page('about.html'));
app.get('/prices', page('prices.html'));
app.get('/consultation', page('consultation.html'));
app.get('/consultation/book', page('consultation-book.html'));
app.get('/treatment-information', page('treatment-information.html'));
app.get('/privacy', page('privacy.html'));
app.get('/dermal-fillers-woking', page('dermal-fillers-woking.html'));
app.get('/lip-filler-surrey', page('lip-filler-surrey.html'));
// Duplicate of /consultation (WP5.5) — permanent redirect, kept out of sitemap.
app.get('/facial-aesthetics-consultation', (req, res) => res.redirect(301, '/consultation'));

app.use(express.static(path.join(__dirname)));

// Escape user input before putting it in the enquiry email HTML.
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// The JS path sends JSON and expects JSON back; the no-JS fallback is a plain
// urlencoded form post that needs a human-readable HTML answer. Detect by
// content type: a browser form post is never application/json.
const wantsHtml = (req) => !req.is('json');
const htmlReply = (res, status, title, body) => res.status(status).type('html').send(
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
  `<meta name="robots" content="noindex"><title>${title} — Olesya Pavlova</title><link rel="stylesheet" href="/styles.css"></head>` +
  `<body style="display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f7f4ef">` +
  `<main style="max-width:34rem;padding:2rem;text-align:center"><h1 style="margin-bottom:1rem">${title}</h1>` +
  `<p style="margin-bottom:1.5rem">${body}</p><p><a href="/">Return to the homepage</a></p></main></body></html>`
);

app.post('/api/contact', async (req, res) => {
  const {
    name, email, phone, reason, message,
    contactMethod, concern, preferredDate, hearAbout,
  } = req.body || {};

  if (!name || !email) {
    if (wantsHtml(req)) return htmlReply(res, 400, 'Something was missing', 'A name and email address are required. Please go back and try again.');
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const category = reason || 'General enquiry';
  const rows = [
    ['Name', name],
    ['Email', email],
    ['Phone', phone],
    ['Reason', category],
    ['Preferred contact', contactMethod],
    ['Area of concern', concern],
    ['Preferred date', preferredDate],
    ['How they heard', hearAbout],
  ].filter(([, v]) => v);

  const html = `
    ${rows.map(([k, v]) => `<p><strong>${esc(k)}:</strong> ${esc(v)}</p>`).join('')}
    ${message ? `<p><strong>Message:</strong><br/>${esc(message).replace(/\n/g, '<br/>')}</p>` : ''}
  `;

  // Non-delivering test mode: log instead of sending, so implementation and
  // staging never message Olesya for real.
  const thanks = 'Thank you. Your enquiry has been received. Olesya will contact you to discuss your consultation and available appointment times. Submitting an enquiry does not confirm an appointment.';

  if (CONTACT_TEST_MODE) {
    console.log(`[contact][TEST MODE — not sent] ${category} from ${name} <${email}>`);
    if (wantsHtml(req)) return htmlReply(res, 200, 'Enquiry received', thanks);
    return res.json({ ok: true, test: true });
  }

  try {
    await resend.emails.send({
      from: `Website <${config.contact.email}>`,
      to: config.enquiryTo,
      replyTo: email,
      subject: `[${category}] Website enquiry from ${name}`,
      html,
    });
    if (wantsHtml(req)) return htmlReply(res, 200, 'Enquiry received', thanks);
    res.json({ ok: true });
  } catch (err) {
    console.error('Resend error:', err);
    if (wantsHtml(req)) return htmlReply(res, 500, 'Something went wrong', 'Your message could not be sent. Please try again, or contact Olesya directly.');
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Olesya Pavlova site running on port ${PORT}`));

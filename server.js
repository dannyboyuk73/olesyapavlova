const express = require('express');
const { Resend } = require('resend');
const path = require('path');
const config = require('./site-config');

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json());

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
app.get('/consultation', page('consultation.html'));
app.get('/consultation/book', page('consultation-book.html'));
app.get('/treatment-information', page('treatment-information.html'));
app.get('/privacy', page('privacy.html'));
app.get('/dermal-fillers-woking', page('dermal-fillers-woking.html'));
app.get('/lip-filler-surrey', page('lip-filler-surrey.html'));
app.get('/facial-aesthetics-consultation', page('facial-aesthetics-consultation.html'));

app.use(express.static(path.join(__dirname)));

// Escape user input before putting it in the enquiry email HTML.
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

app.post('/api/contact', async (req, res) => {
  const {
    name, email, phone, reason, message,
    contactMethod, concern, preferredDate, hearAbout,
  } = req.body || {};

  if (!name || !email) {
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
  if (CONTACT_TEST_MODE) {
    console.log(`[contact][TEST MODE — not sent] ${category} from ${name} <${email}>`);
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
    res.json({ ok: true });
  } catch (err) {
    console.error('Resend error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Olesya Pavlova site running on port ${PORT}`));

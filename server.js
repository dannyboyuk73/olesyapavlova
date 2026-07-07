const express = require('express');
const { Resend } = require('resend');
const path = require('path');

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

app.use(express.static(path.join(__dirname)));

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }

  try {
    await resend.emails.send({
      from: 'Website <hello@olesyapavlova.co.uk>',
      to:   'hello@olesyapavlova.co.uk',
      replyTo: email,
      subject: `New enquiry from ${name}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
        <p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>
      `,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Resend error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Olesya Pavlova site running on port ${PORT}`));

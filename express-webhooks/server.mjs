/* global process, console */
// Referalli + Express: a verified webhook endpoint, referral cookie capture and
// signup attribution, in one file.
import express from 'express';
import { Referalli } from 'referalli';
import { attributeSignup, referalliAttribution, referalliWebhook } from '@referalli/express';

const referalli = new Referalli(); // reads REFERALLI_API_KEY
const app = express();

// 1. Webhooks. Mount before express.json(): the middleware verifies the exact
//    bytes Referalli signed, rejects stale deliveries (5 min) and answers 400
//    with a reason when verification fails.
const handled = new Set(); // use your database in production

app.post('/webhooks/referalli', referalliWebhook({ secret: process.env.REFERALLI_WEBHOOK_SECRET }), (req, res) => {
  const event = req.referalliEvent;
  const deliveryId = req.headers['webhook-id'];
  if (handled.has(deliveryId)) return res.json({ received: true, duplicate: true }); // retries and replays repeat
  handled.add(deliveryId);

  switch (event.topic) {
    case 'referral.created':
      console.log(`referral ${event.data.referralId}: ${event.data.customerRef} referred by ${event.data.partnerId}`);
      break;
    case 'commission.earned':
      console.log(`commission ${event.data.commissionId}: ${event.data.amountMinor} ${event.data.currency}`);
      break;
    case 'payout.sent':
      console.log(`payout ${event.data.payoutId} sent to ${event.data.partnerId}`);
      break;
    default:
      console.log(`${event.topic} ${event.id}`);
  }
  res.json({ received: true }); // answer 2xx quickly; do slow work afterwards
});

// 2. Referral capture: ?via= / ref_click_id land in the referalli_ctx cookie; every request gets req.referral.
app.use(referalliAttribution({ publishableKey: process.env.REFERALLI_TRACKING_TOKEN || undefined }));
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  const invited = req.referral?.code ? `<p>Invited with code <b>${escapeHtml(req.referral.code)}</b></p>` : '<p>No referral yet.</p>';
  res.send(`<!doctype html><title>Acme</title><h1>Acme</h1>${invited}
    <form method="post" action="/signup"><input name="email" type="email" required placeholder="you@example.com"> <button>Sign up</button></form>`);
});

// 3. Signup attribution. attributeSignup calls associate with the idempotency
//    key signup:<customerRef> and never throws, so it can't break signup.
app.post('/signup', async (req, res) => {
  const user = { id: `user_${Date.now()}`, email: String(req.body.email ?? '') }; // your real user creation goes here
  const result = await attributeSignup(req, {
    client: referalli,
    programId: process.env.REFERALLI_PROGRAM_ID,
    customerRef: user.id, // the id your billing provider sees for this customer
    email: user.email,
  });
  const partner = result?.referral?.partnerId;
  res.send(`<p>Signed up as ${user.id}. ${partner ? `Attributed to partner ${partner}.` : 'Not referred.'}</p><a href="/">Back</a>`);
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`http://localhost:${port}`));

// Receives Referalli webhooks. createWebhookHandler verifies the Standard
// Webhooks signature on the raw body, rejects stale deliveries, and answers
// 400 on a bad signature, 200 when handled and 500 if a handler throws (so
// Referalli retries).
import { createWebhookHandler } from '@referalli/next';

export const POST = createWebhookHandler({
  secret: process.env.REFERALLI_WEBHOOK_SECRET ?? '',
  on: {
    'referral.created': async (event) => {
      console.log(`referral ${event.data.referralId}: ${event.data.customerRef} referred by ${event.data.partnerId}`);
    },
    'commission.earned': async (event) => {
      console.log(`commission ${event.data.commissionId}: ${event.data.amountMinor} ${event.data.currency} for ${event.data.partnerId}`);
    },
  },
  // Runs for every topic. A delivery can arrive more than once (retries,
  // replays): in production, record event.id and skip ids you have handled.
  onEvent: async (event) => {
    console.log(`event ${event.topic} ${event.id} (${event.livemode === false ? 'test' : 'live'})`);
  },
});

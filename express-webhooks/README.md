# Referalli example: Express webhooks

One Express 5 server (`server.mjs`) with:

- `POST /webhooks/referalli`: `referalliWebhook()` from `@referalli/express` verifies the Standard Webhooks signature on the raw body and hands you a typed `req.referalliEvent`. Deliveries are deduplicated on the `webhook-id` header.
- `referalliAttribution()`: saves `?via=` and `ref_click_id` from a partner's link into the first-party `referalli_ctx` cookie.
- `POST /signup`: attributes the new user to the partner with `attributeSignup()`.

## Setup

You need Node.js 20.6+ (for `--env-file`) and the CLI (`npm install -g @referalli/cli`).

1. In the Referalli dashboard, turn on **Test mode** and create an API key (**Settings → API keys**).
2. Create a program, a partner and a link whose destination is `http://localhost:3000/`.
3. Configure and run:

   ```sh
   cp .env.example .env   # fill in the key and program id
   npm install
   referalli login --key rk_test_...
   referalli listen --forward-to http://localhost:3000/webhooks/referalli
   ```

   Copy the `whsec_...` secret that `listen` prints into `REFERALLI_WEBHOOK_SECRET`, then in another terminal:

   ```sh
   npm start
   ```

## Try it

```sh
referalli trigger referral.created
referalli trigger commission.earned --data '{"amountMinor": 2500}'
```

The server logs each event, and `listen` shows `<-- 200`. Change one byte of the secret and restart: deliveries now get `400 signature`.

For the full flow, open the partner's link in your browser, sign up on `localhost:3000`, and watch `referral.created` arrive.

In production, register the endpoint (`POST /v1/webhook-endpoints` or **Settings → Webhooks**) and use the secret it returns. Docs: [Webhooks](https://referalli.com/docs/webhooks), [CLI](https://referalli.com/docs/cli).

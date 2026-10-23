# Referalli example: Python + Flask

`app.py` is a small Flask app that:

- loads the Referalli tracking script (`aff.js`), which saves `?via=` and `ref_click_id` from a partner's link into the first-party `referalli_ctx` cookie;
- attributes each signup to the partner with `post_referrals_associate`;
- receives webhooks at `POST /webhooks/referalli`, verified with `webhooks.construct_event`.

## Setup

You need Python 3.11+ and the CLI (`npm install -g @referalli/cli`).

1. In the Referalli dashboard, turn on **Test mode** and create an API key (**Settings → API keys**). Copy your tracking token from **Settings → Tracking**.
2. Create a program, a partner and a link whose destination is `http://localhost:3000/`.
3. Install and run:

   ```sh
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env              # fill in the key, program id and tracking token
   referalli login --key rk_test_...
   referalli listen --forward-to http://localhost:3000/webhooks/referalli
   ```

   Copy the `whsec_...` secret that `listen` prints into `REFERALLI_WEBHOOK_SECRET`, then in another terminal:

   ```sh
   python app.py
   ```

## Try it

1. Open the partner's link (`https://referalli.com/go/<token>/<code>`) in your browser; you land on `localhost:3000`.
2. Sign up with any email. The page shows the partner it was attributed to, and `listen` forwards `referral.created`.
3. `referalli trigger commission.earned` sends a sample event; the app logs it.

Use the same browser and host (`localhost`) for the click and the signup. Docs: [SDKs](https://referalli.com/docs/sdks), [Webhooks](https://referalli.com/docs/webhooks), [Tracking script](https://referalli.com/docs/tracking-script).

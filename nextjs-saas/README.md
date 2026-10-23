# Referalli example: Next.js SaaS

A minimal Next.js 15 (App Router) app wired to Referalli:

- `middleware.ts`: `@referalli/next` captures `?via=` and `ref_click_id` from a partner's link into a first-party cookie.
- `app/layout.tsx` and `app/invite-banner.tsx`: `@referalli/react` shows "Invited by Dana".
- `app/page.tsx`: a signup server action that attributes the new user with `attributeSignup`.
- `app/api/webhooks/referalli/route.ts`: a verified webhook route (`referral.created`, `commission.earned`).

## Setup

You need Node.js 20+, a Referalli account, and the CLI (`npm install -g @referalli/cli`).

1. In the dashboard, turn on **Test mode**, then create an API key (**Settings → API keys**, Full access).
2. Create a program, a partner and a link whose destination is `http://localhost:3000/`, in the dashboard or with the [5-minute quickstart](https://referalli.com/docs/first-referral) script.
3. Configure and run:

   ```sh
   cp .env.example .env.local   # fill in the key, program id and tracking token
   npm install
   npm run dev
   ```

4. In a second terminal, forward webhooks and copy the printed `whsec_...` secret into `REFERALLI_WEBHOOK_SECRET` (restart `npm run dev` after):

   ```sh
   referalli login --key rk_test_...
   referalli listen --forward-to http://localhost:3000/api/webhooks/referalli
   ```

## Try it

1. Open the partner's link (`https://referalli.com/go/<token>/<code>`) in your browser. You land on `localhost:3000` and see "Invited by …".
2. Sign up with any email. The page shows the partner the signup was attributed to, and the `listen` terminal shows `referral.created` forwarded with a `200`.
3. `referalli trigger commission.earned` sends a sample commission event to the webhook route.

Use the same browser and host (`localhost`) for the click and the signup: the referral lives in a cookie.

Docs: [React and Next.js](https://referalli.com/docs/react-and-nextjs), [Webhooks](https://referalli.com/docs/webhooks).

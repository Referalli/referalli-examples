"""Referalli + Flask: referral capture, signup attribution and a verified webhook endpoint."""

import hashlib
import json
import os
import time
from html import escape
from urllib.parse import unquote

from dotenv import load_dotenv
from flask import Flask, request

from referalli import Referalli, ReferalliError, WebhookVerificationError, webhooks

load_dotenv()

app = Flask(__name__)
client = Referalli(api_key=os.environ["REFERALLI_API_KEY"])
PROGRAM_ID = os.environ["REFERALLI_PROGRAM_ID"]
TRACKING_TOKEN = os.environ.get("REFERALLI_TRACKING_TOKEN", "")
handled: set[str] = set()  # use your database in production


def referral_context() -> dict:
    """The referral the tracking script (aff.js) saved in the first-party referalli_ctx cookie."""
    raw = request.cookies.get("referalli_ctx")
    if not raw:
        return {}
    try:
        ctx = json.loads(unquote(raw))
    except ValueError:
        return {}
    if not isinstance(ctx, dict) or (ctx.get("exp") and ctx["exp"] < time.time() * 1000):
        return {}
    return ctx


@app.get("/")
def home():
    # aff.js reads ?via= and ref_click_id from the landing URL, keeps them in the
    # referalli_ctx cookie on this domain, and records the visit.
    return f"""<!doctype html><title>Acme</title>
<script src="https://referalli.com/t/{escape(TRACKING_TOKEN)}/aff.js" async></script>
<h1>Acme</h1>
<form method="post" action="/signup">
  <input name="email" type="email" required placeholder="you@example.com"> <button>Sign up</button>
</form>"""


@app.post("/signup")
def signup():
    email = request.form.get("email", "").strip()
    user_id = f"user_{int(time.time() * 1000)}"  # your real user creation goes here
    ctx = referral_context()

    body = {"programId": PROGRAM_ID, "customerRef": user_id}  # customerRef: the id your billing provider sees
    if ctx.get("anonId"):
        body["anonId"] = ctx["anonId"]
    if ctx.get("clickId"):
        body["referralToken"] = ctx["clickId"]
    if email:
        body["emailHash"] = hashlib.sha256(email.lower().encode()).hexdigest()

    partner = None
    try:
        result = client.post_referrals_associate(body, idempotency_key=f"signup:{user_id}")
        partner = (result.get("referral") or {}).get("partnerId")
    except ReferalliError as e:  # attribution is best-effort: never block a signup on it
        app.logger.warning("associate failed: %s", e)

    note = f"Attributed to partner {escape(partner)}." if partner else "Not referred."
    return f"<p>Signed up as {user_id}. {note}</p><a href='/'>Back</a>"


@app.post("/webhooks/referalli")
def referalli_webhook():
    # Verify the raw body before parsing it; deliveries older than 5 minutes are rejected.
    try:
        event = webhooks.construct_event(request.get_data(), request.headers, os.environ["REFERALLI_WEBHOOK_SECRET"])
    except WebhookVerificationError as e:
        return {"error": str(e)}, 400

    delivery_id = request.headers.get("webhook-id", "")
    if delivery_id in handled:  # retries and replays repeat a delivery
        return {"received": True, "duplicate": True}
    handled.add(delivery_id)

    data = event["data"]
    if event["topic"] == "referral.created":
        app.logger.info("referral %s: %s referred by %s", data["referralId"], data["customerRef"], data["partnerId"])
    elif event["topic"] == "commission.earned":
        app.logger.info("commission %s: %s %s", data["commissionId"], data["amountMinor"], data["currency"])
    else:
        app.logger.info("%s %s", event["topic"], event["id"])
    return {"received": True}


if __name__ == "__main__":
    app.run(port=3000, debug=True)

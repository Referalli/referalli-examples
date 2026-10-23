// Referalli + net/http: referral capture with aff.js, signup attribution and a
// verified webhook endpoint. Standard library plus the Referalli Go SDK.
package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	referalli "github.com/referalli/referalli-go"
)

// referralContext is what the tracking script (aff.js) keeps in the referalli_ctx cookie.
type referralContext struct {
	AnonID  string  `json:"anonId"`
	Code    *string `json:"code"`
	ClickID *string `json:"clickId"`
	Exp     int64   `json:"exp"`
}

func readReferral(r *http.Request) *referralContext {
	c, err := r.Cookie("referalli_ctx")
	if err != nil {
		return nil
	}
	raw, err := url.QueryUnescape(c.Value)
	if err != nil {
		return nil
	}
	var ctx referralContext
	if json.Unmarshal([]byte(raw), &ctx) != nil || ctx.AnonID == "" {
		return nil
	}
	if ctx.Exp != 0 && ctx.Exp < time.Now().UnixMilli() {
		return nil
	}
	return &ctx
}

func mustEnv(name string) string {
	v := os.Getenv(name)
	if v == "" {
		log.Fatalf("set %s (see .env.example)", name)
	}
	return v
}

func main() {
	client := referalli.New(mustEnv("REFERALLI_API_KEY"))
	programID := mustEnv("REFERALLI_PROGRAM_ID")
	webhookSecret := mustEnv("REFERALLI_WEBHOOK_SECRET")
	trackingToken := os.Getenv("REFERALLI_TRACKING_TOKEN")

	var mu sync.Mutex
	handled := map[string]bool{} // use your database in production

	http.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		// aff.js reads ?via= and ref_click_id from the landing URL, keeps them in
		// the referalli_ctx cookie on this domain, and records the visit.
		fmt.Fprintf(w, `<!doctype html><title>Acme</title>
<script src="https://referalli.com/t/%s/aff.js" async></script>
<h1>Acme</h1>
<form method="post" action="/signup"><input name="email" type="email" required placeholder="you@example.com"> <button>Sign up</button></form>`,
			html.EscapeString(trackingToken))
	})

	http.HandleFunc("POST /signup", func(w http.ResponseWriter, r *http.Request) {
		email := strings.TrimSpace(r.FormValue("email"))
		userID := fmt.Sprintf("user_%d", time.Now().UnixMilli()) // your real user creation goes here

		// customerRef must be the id your billing provider sees for this customer.
		body := referalli.PostReferralsAssociateBody{ProgramID: programID, CustomerRef: userID}
		if ctx := readReferral(r); ctx != nil {
			body.AnonID = referalli.Ptr(ctx.AnonID)
			body.ReferralToken = ctx.ClickID
		}
		if email != "" {
			sum := sha256.Sum256([]byte(strings.ToLower(email)))
			body.EmailHash = referalli.Ptr(hex.EncodeToString(sum[:]))
		}

		note := "Not referred."
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()
		res, err := client.PostReferralsAssociate(ctx, body, referalli.WithIdempotencyKey("signup:"+userID))
		switch {
		case err != nil: // attribution is best-effort: never block a signup on it
			log.Printf("associate failed: %v", err)
		case res.Referral != nil:
			note = "Attributed to partner " + html.EscapeString(res.Referral.PartnerID) + "."
		}
		fmt.Fprintf(w, `<p>Signed up as %s. %s</p><a href="/">Back</a>`, userID, note)
	})

	http.HandleFunc("POST /webhooks/referalli", func(w http.ResponseWriter, r *http.Request) {
		raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
		if err != nil {
			http.Error(w, "cannot read body", http.StatusBadRequest)
			return
		}
		// Verify the raw body before parsing it; deliveries older than 5 minutes are rejected.
		event, err := referalli.ConstructEvent(raw, r.Header, []string{webhookSecret}, referalli.VerifyOptions{})
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		deliveryID := r.Header.Get("webhook-id")
		mu.Lock()
		dup := handled[deliveryID]
		handled[deliveryID] = true
		mu.Unlock()
		if dup { // retries and replays repeat a delivery
			w.WriteHeader(http.StatusNoContent)
			return
		}

		switch event.Topic {
		case referalli.TopicReferralCreated:
			if d, err := event.AsReferralCreated(); err == nil {
				log.Printf("referral %s: %s referred by %s", d.ReferralID, d.CustomerRef, d.PartnerID)
			}
		case referalli.TopicCommissionEarned:
			if d, err := event.AsCommissionEarned(); err == nil {
				log.Printf("commission %s: %d %s", d.CommissionID, d.AmountMinor, d.Currency)
			}
		default:
			log.Printf("%s %s", event.Topic, event.ID)
		}
		w.WriteHeader(http.StatusNoContent)
	})

	addr := ":3000"
	if p := os.Getenv("PORT"); p != "" {
		addr = ":" + p
	}
	log.Printf("listening on http://localhost%s", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}

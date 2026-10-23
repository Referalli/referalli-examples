import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { attributeSignup, getReferral } from '@referalli/next';
import { programId, referalli } from '@/lib/referalli';
import { InviteBanner } from './invite-banner';

async function signUp(form: FormData) {
  'use server';
  const email = String(form.get('email') ?? '').trim();
  if (!email) return;
  // Replace with your real user creation. customerRef must be the id your
  // billing provider sees for this customer (or is mapped to it).
  const user = { id: `user_${randomUUID()}`, email };

  // Reads the referalli_ctx cookie, hashes the email and calls associate with
  // the idempotency key signup:<customerRef>. Never throws.
  const result = (await attributeSignup({ client: referalli, programId: programId(), customerRef: user.id, email: user.email })) as {
    referral: { partnerId: string } | null;
  } | null;

  redirect(`/?signedUp=${encodeURIComponent(user.id)}&partner=${encodeURIComponent(result?.referral?.partnerId ?? '')}`);
}

export default async function Home({ searchParams }: { searchParams: Promise<{ signedUp?: string; partner?: string }> }) {
  const { signedUp, partner } = await searchParams;
  const referral = await getReferral();

  return (
    <main>
      <h1>Acme</h1>
      <InviteBanner />
      {signedUp ? (
        <p>
          Signed up as <code>{signedUp}</code>. {partner ? <>Attributed to partner <code>{partner}</code>.</> : 'No partner referred this signup.'}
        </p>
      ) : (
        <form action={signUp}>
          <input name="email" type="email" placeholder="you@example.com" required />
          <button type="submit">Create account</button>
        </form>
      )}
      <p style={{ color: '#666', fontSize: 14 }}>
        Referral cookie: <code>{referral ? JSON.stringify(referral) : 'none'}</code>
      </p>
    </main>
  );
}

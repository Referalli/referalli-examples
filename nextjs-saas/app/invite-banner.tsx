'use client';
import { useReferral } from '@referalli/react';

/** "Invited by Dana": the partner's display name is looked up from the referral code. */
export function InviteBanner() {
  const { code, partner, ready } = useReferral();
  if (!ready || !code) return null;
  return (
    <p style={{ background: '#eef6ff', padding: 12, borderRadius: 8 }}>
      Invited by {partner?.partnerDisplayName ?? 'a friend'}: welcome!
    </p>
  );
}

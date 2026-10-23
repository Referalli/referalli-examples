import type { ReactNode } from 'react';
import { ReferalliProvider } from '@referalli/react';
import { getReferral } from '@referalli/next';

export const metadata = { title: 'Acme (Referalli example)' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Read on the server so the page can show "Invited by ..." before hydration.
  const referral = await getReferral();
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 560, margin: '48px auto', padding: '0 16px' }}>
        <ReferalliProvider publishableKey={process.env.NEXT_PUBLIC_REFERALLI_TRACKING_TOKEN ?? ''} initialReferral={referral}>
          {children}
        </ReferalliProvider>
      </body>
    </html>
  );
}

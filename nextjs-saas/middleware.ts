// Saves ?via= / ?ref= / ?aff= and ref_click_id from a referral link into the
// first-party `referalli_ctx` cookie before any page renders. With the tracking
// token set, the landing is also recorded from the server.
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { captureReferral } from '@referalli/next/middleware';

export function middleware(req: NextRequest, event: NextFetchEvent) {
  return captureReferral(req, NextResponse.next(), { publishableKey: process.env.NEXT_PUBLIC_REFERALLI_TRACKING_TOKEN }, event);
}

export const config = { matcher: ['/((?!_next|api|.*\\..*).*)'] };

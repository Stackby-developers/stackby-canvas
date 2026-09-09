import { type NextRequest, NextResponse } from 'next/server';

const PUBLISH_URL = process.env['NEXT_PUBLIC_PUBLISH_URL'] ?? 'http://localhost:3006';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const returnTo = req.nextUrl.searchParams.get('returnTo') ?? '/';
  // We redirect the browser to the publish service's /auth/start, which will
  // generate PKCE and redirect to Stackby OAuth. Pass returnTo so the callback
  // lands back at the right artifact URL.
  const target = new URL(`${PUBLISH_URL}/auth/start`);
  target.searchParams.set('returnTo', returnTo);
  return NextResponse.redirect(target.toString());
}

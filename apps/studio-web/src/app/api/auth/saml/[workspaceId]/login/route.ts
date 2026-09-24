import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { workspaceId: string } },
) {
  const apiUrl = process.env['API_URL'] ?? 'http://localhost:4000';
  redirect(`${apiUrl}/v1/saml/${params.workspaceId}/login`);
}

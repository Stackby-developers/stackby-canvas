import { NextRequest, NextResponse } from 'next/server';
import { DEV_WORKSPACE_ID } from '@/src/lib/dev-constants';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? DEV_WORKSPACE_ID;
  const upstream = await fetch(`${API_URL}/v1/projects?workspaceId=${encodeURIComponent(workspaceId)}`);
  const data: unknown = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body: unknown = await req.json();
  const upstream = await fetch(`${API_URL}/v1/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: unknown = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}

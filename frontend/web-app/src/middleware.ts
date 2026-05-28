import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {
  return new NextResponse('Access denied', { status: 403 });
}

export const config = {
  matcher: '/:path*',
};

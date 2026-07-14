import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  if (authHeader) {
    const encoded = authHeader.split(' ')[1];
    const decoded = atob(encoded);
    const [user, pass] = decoded.split(':');

    const validUser = process.env.AUTH_USERNAME || 'option';
    const validPass = process.env.AUTH_PASSWORD || 'payoff2024';

    if (user === validUser && pass === validPass) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="OptionPayoff"',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.svg).*)'],
};

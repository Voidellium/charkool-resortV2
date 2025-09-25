import { GET, POST } from "../../../../src/lib/auth";

// Add error handling wrapper for NextAuth routes
const handler = async (req, res) => {
  try {
    if (req.method === 'GET') {
      return GET(req, res);
    } else if (req.method === 'POST') {
      return POST(req, res);
    } else {
      return new Response('Method not allowed', { status: 405 });
    }
  } catch (error) {
    console.error('[NEXTAUTH] Route error:', error);
    return new Response(
      JSON.stringify({
        error: 'Authentication service error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

export { handler as GET, handler as POST };

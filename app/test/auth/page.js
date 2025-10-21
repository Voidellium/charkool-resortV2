import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../src/lib/auth";

export default async function AuthTest() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
        
        {session ? (
          <div className="space-y-2">
            <div className="text-green-600 font-semibold">✅ Authentication Working!</div>
            <div><strong>Email:</strong> {session.user?.email}</div>
            <div><strong>Role:</strong> {session.user?.role}</div>
            <div><strong>Name:</strong> {session.user?.firstName} {session.user?.lastName}</div>
            <div><strong>ID:</strong> {session.user?.id}</div>
            
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <div className="text-sm"><strong>Full Session:</strong></div>
              <pre className="text-xs mt-1 overflow-auto">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="text-red-600">❌ No active session</div>
        )}
        
        <div className="mt-4 space-y-2">
          <a href="/login" className="block bg-blue-500 text-white px-4 py-2 rounded text-center">
            Go to Login
          </a>
          <a href="/api/auth/signout" className="block bg-red-500 text-white px-4 py-2 rounded text-center">
            Sign Out
          </a>
        </div>
      </div>
    </div>
  );
}
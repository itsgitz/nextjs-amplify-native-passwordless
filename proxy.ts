import { NextRequest, NextResponse } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/utils/amplifyServerUtils";

export async function proxy(request: NextRequest) {
    const response = NextResponse.next();

    const authenticated = await runWithAmplifyServerContext({
        nextServerContext: { request, response },
        operation: async (contextSpec) => {
            try {
                const session = await fetchAuthSession(contextSpec);
                return session.tokens !== undefined;
            } catch (error) {
                console.log("Auth check error:", error);
                return false;
            }
        },
    });

    // If authenticated, allow access
    if (authenticated) {
        return response;
    }

    // If not authenticated, redirect to signin
    return NextResponse.redirect(new URL("/signin", request.url));
}

export const config = {
    // Protect all routes except signin, api, static files, etc.
    matcher: [
        /*
         * Match all request paths except:
         * - /signin (login page)
         * - /api (API routes)
         * - /_next/static (static files)
         * - /_next/image (image optimization files)
         * - /favicon.ico (favicon file)
         */
        "/((?!signin|api|_next/static|_next/image|favicon.ico).*)",
    ],
};

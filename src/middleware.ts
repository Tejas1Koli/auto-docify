import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Match all routes except Next.js internals, static files, and public assets like favicon and apple-touch icons
    "/((?!_next|.*\\..*|favicon.ico|apple-touch-icon.png|apple-touch-icon-precomposed.png).*)",
  ],
};

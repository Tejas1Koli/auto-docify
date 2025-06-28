import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ClerkProvider, SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AutoDocify 🚀 - Instant Docs from Code/UI',
  description: 'Generate comprehensive documentation for your codebases automatically with AI.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
          <nav className="w-full flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur z-50 sticky top-0">
            <Link href="/" className="text-xl font-bold text-primary">AutoDocify</Link>
            <div className="flex items-center gap-4">
              <Link href="/subscription">
                <button className="px-4 py-2 rounded-md bg-yellow-500 text-white font-medium hover:bg-yellow-600 transition">Subscription</button>
              </Link>
              <SignedOut>
                <SignInButton>
                  <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition">Sign In</button>
                </SignInButton>
                <SignUpButton>
                  <button className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground font-medium hover:bg-secondary/90 transition">Sign Up</button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </nav>
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}

"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { LanguageProvider } from "@/lib/utils/language-context";

type ProvidersProps = {
  children: React.ReactNode;
  session?: Session | null;
};

export default function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <LanguageProvider>{children}</LanguageProvider>
    </SessionProvider>
  );
}

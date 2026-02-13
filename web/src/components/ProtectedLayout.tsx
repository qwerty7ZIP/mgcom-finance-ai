"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Props = {
  children: React.ReactNode;
};

export function ProtectedLayout({ children }: Props) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!supabaseBrowser) {
      router.replace("/auth/sign-in");
      return;
    }

    supabaseBrowser.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/sign-in");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
        <AppHeader />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
            <div
              className="size-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600 dark:border-slate-700 dark:border-t-amber-400"
              aria-hidden
            />
            <span className="text-xs">Проверяем авторизацию…</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      <AppHeader />
      <main className="flex flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

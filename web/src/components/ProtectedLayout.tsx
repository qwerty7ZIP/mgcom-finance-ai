"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import {
  canAccessPath,
  hasAnySectionAccess,
} from "@/lib/access";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Props = {
  children: React.ReactNode;
};

function ProtectedLayoutInner({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, access, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!supabaseBrowser) {
      router.replace("/auth/sign-in");
      return;
    }
    if (!user) {
      router.replace("/auth/sign-in");
    }
  }, [ready, user, router]);

  if (!ready) {
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

  if (!user) {
    return (
      <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
        <AppHeader />
        <main className="flex flex-1 items-center justify-center">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Перенаправляем на вход…
          </span>
        </main>
      </div>
    );
  }

  if (!hasAnySectionAccess(access)) {
    return (
      <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
        <AppHeader />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="rounded-xl border border-slate-200 bg-white/80 px-6 py-5 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
            Попросите администратора о доступе
          </div>
        </main>
      </div>
    );
  }

  if (!canAccessPath(pathname || "/", access)) {
    return (
      <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
        <AppHeader />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="rounded-xl border border-slate-200 bg-white/80 px-6 py-5 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
            У вас нет доступа к этому разделу
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

export function ProtectedLayout({ children }: Props) {
  return (
    <AuthProvider>
      <ProtectedLayoutInner>{children}</ProtectedLayoutInner>
    </AuthProvider>
  );
}

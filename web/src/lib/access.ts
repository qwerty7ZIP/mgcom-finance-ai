import type { User } from "@supabase/supabase-js";

export type SectionAccess = {
  tables: boolean;
  analytics: boolean;
  diagram: boolean;
};

export type AccessState = {
  isAdmin: boolean;
  sections: SectionAccess;
};

const DEFAULT_SECTIONS: SectionAccess = {
  tables: true,
  analytics: true,
  diagram: true,
};

function coerceBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

export function resolveAccessFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): AccessState {
  const m = metadata ?? {};
  const isAdmin = coerceBool(m.is_admin, false);

  const rawAccess =
    typeof m.access === "object" && m.access !== null
      ? (m.access as Record<string, unknown>)
      : null;

  const sections: SectionAccess = rawAccess
    ? {
        tables: coerceBool(rawAccess.tables, false),
        analytics: coerceBool(rawAccess.analytics, false),
        diagram: coerceBool(rawAccess.diagram, false),
      }
    : DEFAULT_SECTIONS;

  if (isAdmin) {
    return {
      isAdmin: true,
      sections: { tables: true, analytics: true, diagram: true },
    };
  }

  return { isAdmin: false, sections };
}

export function resolveAccessFromUser(user: User | null): AccessState {
  if (!user) {
    return {
      isAdmin: false,
      sections: { tables: false, analytics: false, diagram: false },
    };
  }
  return resolveAccessFromMetadata(
    (user.user_metadata as Record<string, unknown> | null | undefined) ?? null,
  );
}

export function hasAnySectionAccess(access: AccessState): boolean {
  return (
    access.sections.tables ||
    access.sections.analytics ||
    access.sections.diagram
  );
}

export function canAccessPath(pathname: string, access: AccessState): boolean {
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/account")) return true;
  if (pathname.startsWith("/admin")) return access.isAdmin;
  if (pathname.startsWith("/analytics")) return access.sections.analytics;
  if (pathname.startsWith("/diagram")) return access.sections.diagram;
  if (pathname === "/") return access.sections.tables;
  return true;
}


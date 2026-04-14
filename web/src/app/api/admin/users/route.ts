import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { resolveAccessFromMetadata } from "@/lib/access";

type AccessPayload = {
  tables?: boolean;
  analytics?: boolean;
  diagram?: boolean;
  branches?: boolean;
};

function parseBearerToken(req: NextRequest): string {
  const authHeader = req.headers.get("authorization") ?? "";
  const [, token] = authHeader.split(" ");
  return token?.trim() ?? "";
}

function normalizeAccess(access: AccessPayload | undefined) {
  return {
    tables: access?.tables === true,
    analytics: access?.analytics === true,
    diagram: access?.diagram === true,
    branches: access?.branches === true,
  };
}

async function ensureAdmin(req: NextRequest) {
  if (!supabaseServer) {
    return { error: NextResponse.json({ error: "Supabase не настроен" }, { status: 500 }) };
  }
  const token = parseBearerToken(req);
  if (!token) {
    return { error: NextResponse.json({ error: "Не авторизован" }, { status: 401 }) };
  }
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user) {
    return { error: NextResponse.json({ error: "Не авторизован" }, { status: 401 }) };
  }
  const access = resolveAccessFromMetadata(
    (data.user.user_metadata as Record<string, unknown> | undefined) ?? undefined,
  );
  if (!access.isAdmin) {
    return { error: NextResponse.json({ error: "Доступ запрещен" }, { status: 403 }) };
  }
  return { user: data.user };
}

export async function GET(req: NextRequest) {
  const guard = await ensureAdmin(req);
  if ("error" in guard) return guard.error;
  if (!supabaseServer) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 500 });
  }

  const { data, error } = await supabaseServer.auth.admin.listUsers();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = (data.users ?? []).map((u) => {
    const access = resolveAccessFromMetadata(
      (u.user_metadata as Record<string, unknown> | undefined) ?? undefined,
    );
    return {
      id: u.id,
      email: u.email ?? "",
      createdAt: u.created_at,
      isAdmin: access.isAdmin,
      access: access.sections,
    };
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const guard = await ensureAdmin(req);
  if ("error" in guard) return guard.error;
  if (!supabaseServer) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 500 });
  }

  const body = await req.json();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const isAdmin = body?.isAdmin === true;
  const access = normalizeAccess(body?.access);

  if (!email || !password) {
    return NextResponse.json({ error: "Нужны email и пароль" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Пароль должен быть не короче 6 символов" }, { status: 400 });
  }

  const { data, error } = await supabaseServer.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      is_admin: isAdmin,
      access,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: { id: data.user?.id, email: data.user?.email ?? email } });
}

export async function PATCH(req: NextRequest) {
  const guard = await ensureAdmin(req);
  if ("error" in guard) return guard.error;
  if (!supabaseServer) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 500 });
  }

  const body = await req.json();
  const id = String(body?.id ?? "").trim();
  const isAdmin = body?.isAdmin === true;
  const hasAccess = body?.access && typeof body.access === "object";
  const access = normalizeAccess(body?.access);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!id) {
    return NextResponse.json({ error: "Не указан пользователь" }, { status: 400 });
  }

  const updatePayload: {
    user_metadata?: Record<string, unknown>;
    password?: string;
  } = {};

  if (hasAccess || typeof body?.isAdmin === "boolean") {
    updatePayload.user_metadata = {
      is_admin: isAdmin,
      access,
    };
  }

  if (password) {
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен быть не короче 6 символов" },
        { status: 400 },
      );
    }
    updatePayload.password = password;
  }

  if (!updatePayload.user_metadata && !updatePayload.password) {
    return NextResponse.json({ error: "Нет данных для обновления" }, { status: 400 });
  }

  const { error } = await supabaseServer.auth.admin.updateUserById(id, updatePayload);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const guard = await ensureAdmin(req);
  if ("error" in guard) return guard.error;
  if (!supabaseServer) {
    return NextResponse.json({ error: "Supabase не настроен" }, { status: 500 });
  }

  const body = await req.json();
  const id = String(body?.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Не указан пользователь" }, { status: 400 });
  }

  if (id === guard.user.id) {
    return NextResponse.json({ error: "Нельзя удалить самого себя" }, { status: 400 });
  }

  const { error } = await supabaseServer.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}


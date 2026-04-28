import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim() || null;
}

async function getUserId(req: Request): Promise<string | null> {
  if (!supabaseServer) return null;
  const token = extractBearerToken(req);
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { chatId } = await params;

  const { data: chat, error: chatError } = await supabaseServer!
    .from("ai_chats")
    .select("id,title,created_at,updated_at")
    .eq("id", chatId)
    .eq("user_id", userId)
    .maybeSingle();

  if (chatError) {
    return NextResponse.json({ error: chatError.message }, { status: 500 });
  }
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const { data: messages, error: msgError } = await supabaseServer!
    .from("ai_chat_messages")
    .select("id,role,content,created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  return NextResponse.json({ chat, messages: messages ?? [] });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { chatId } = await params;

  const { error } = await supabaseServer!
    .from("ai_chats")
    .delete()
    .eq("id", chatId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

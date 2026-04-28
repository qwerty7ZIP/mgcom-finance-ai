import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type SyncBody = {
  chatId?: string | null;
  userMessage?: string;
  aiReply?: string;
};

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

function buildTitle(text: string): string {
  const s = text.replace(/\s+/g, " ").trim();
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
}

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as SyncBody;
  const userMessage = String(body.userMessage ?? "").trim();
  const aiReply = String(body.aiReply ?? "").trim();
  if (!userMessage || !aiReply) {
    return NextResponse.json({ error: "Empty message payload" }, { status: 400 });
  }

  let chatId = body.chatId ?? null;

  if (chatId) {
    const { data: existing } = await supabaseServer!
      .from("ai_chats")
      .select("id")
      .eq("id", chatId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!existing) chatId = null;
  }

  if (!chatId) {
    const { data: created, error: createErr } = await supabaseServer!
      .from("ai_chats")
      .insert({
        user_id: userId,
        title: buildTitle(userMessage) || "Новый чат",
      })
      .select("id")
      .single();
    if (createErr || !created) {
      return NextResponse.json(
        { error: createErr?.message || "Failed to create chat" },
        { status: 500 },
      );
    }
    chatId = created.id;
  }

  const { error: msgErr } = await supabaseServer!.from("ai_chat_messages").insert([
    { chat_id: chatId, role: "user", content: userMessage },
    { chat_id: chatId, role: "ai", content: aiReply },
  ]);

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  await supabaseServer!
    .from("ai_chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chatId)
    .eq("user_id", userId);

  return NextResponse.json({ chatId });
}

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    `mailto:${process.env.PUSH_CONTACT_EMAIL || "admin@eurif.local"}`,
    pub,
    priv,
  );
  vapidReady = true;
  return true;
}

/** Called by the Supabase `trg_push_fanout` trigger on each new notification row. */
export async function POST(req: Request) {
  if (req.headers.get("x-push-secret") !== process.env.PUSH_FANOUT_SECRET) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  if (!ensureVapid()) {
    return Response.json({ error: "VAPID not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const notificationId = body?.notification_id;
  if (!notificationId) return Response.json({ error: "notification_id 필요" }, { status: 400 });

  const admin = createAdminClient();
  const { data: n } = await admin
    .from("notifications")
    .select("user_id, title, body, link, type")
    .eq("id", notificationId)
    .single();
  if (!n) return Response.json({ error: "not found" }, { status: 404 });

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, keys")
    .eq("user_id", n.user_id);
  if (!subs?.length) return Response.json({ ok: true, sent: 0 });

  const payload = JSON.stringify({
    title: n.title,
    body: n.body ?? "",
    url: n.link ?? "/dashboard",
    tag: `ulif-${n.type}`,
  });

  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys as { p256dh: string; auth: string } },
          payload,
        );
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.endpoint);
      }
    }),
  );

  if (dead.length) {
    await admin.from("push_subscriptions").delete().in("endpoint", dead);
  }

  return Response.json({ ok: true, sent, pruned: dead.length });
}

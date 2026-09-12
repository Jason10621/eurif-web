import { requireProfile } from "@/lib/auth";
import { getNotificationState } from "@/lib/notifications";
import { AppNav } from "@/components/app-nav";
import { AiWidget } from "@/components/ai/ai-widget";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const notif = await getNotificationState();

  return (
    <div className="flex min-h-dvh flex-col bg-bg md:flex-row">
      <AppNav profile={profile} notif={notif} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
      <AiWidget />
    </div>
  );
}

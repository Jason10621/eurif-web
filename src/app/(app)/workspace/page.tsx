import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { getWorkspaceData } from "@/lib/workspace";
import { PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import { TaskBoard } from "./_components/task-board";
import { WorkLog } from "./_components/work-log";

export const metadata = { title: "개인 워크스페이스" };

const TABS = [
  { key: "tasks", label: "과제 보드" },
  { key: "logs", label: "업무 일지" },
] as const;

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const profile = await requireProfile();
  const { tab } = await searchParams;
  const active = tab === "logs" ? "logs" : "tasks";

  const { tasks, logs, members, phases } = await getWorkspaceData(profile.id);

  return (
    <>
      <PageHeader
        title="개인 워크스페이스"
        desc={`${profile.name} · ${profile.role === "leader" ? "조장" : "조원"}${profile.part ? ` · ${profile.part}` : ""}`}
      />

      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/workspace?tab=${t.key}`}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition",
              active === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-text",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {active === "tasks" ? (
        <TaskBoard
          tasks={tasks}
          members={members}
          phases={phases}
          currentUser={{ id: profile.id, role: profile.role }}
        />
      ) : (
        <WorkLog logs={logs} phases={phases} userId={profile.id} />
      )}
    </>
  );
}

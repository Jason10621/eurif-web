import { requireLeader } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai/gemini";
import { getAdminData } from "@/lib/admin";
import { PageHeader } from "@/components/ui";
import { KnowledgeManager } from "./_components/knowledge-manager";
import { ProgressEditor } from "./_components/progress-editor";
import { MemberManager } from "./_components/member-manager";
import { AnnouncementManager } from "./_components/announcement-manager";
import { NotificationAdmin } from "./_components/notification-admin";

export const metadata = { title: "관리자" };

export default async function AdminPage() {
  const profile = await requireLeader();
  const { docs, project, phases, goals, members, announcements, notifGroups } =
    await getAdminData();

  return (
    <>
      <PageHeader
        title="관리자"
        desc="조장 전용 · 공지 · 알림 · AI 지식베이스 · 대시보드 데이터 · 팀원 계정"
      />
      <div className="space-y-6">
        <AnnouncementManager announcements={announcements} authorId={profile.id} />
        <NotificationAdmin groups={notifGroups} />
        <KnowledgeManager docs={docs} aiConfigured={aiConfigured()} />
        <ProgressEditor project={project} phases={phases} goals={goals} />
        <MemberManager members={members} />
      </div>
    </>
  );
}

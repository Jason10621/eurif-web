import { requireProfile } from "@/lib/auth";
import { getResourcesWithUrls } from "@/lib/resources";
import { PageHeader } from "@/components/ui";
import { ResourceHub } from "./_components/resource-hub";

export const metadata = { title: "자료실" };

export default async function ResourcesPage() {
  const profile = await requireProfile();
  const resources = await getResourcesWithUrls();

  return (
    <>
      <PageHeader
        title="자료실"
        desc="연구 자료 · 논문 링크 · 리서치 결과 공유"
      />
      <ResourceHub
        resources={resources}
        currentUser={{ id: profile.id, role: profile.role }}
      />
    </>
  );
}

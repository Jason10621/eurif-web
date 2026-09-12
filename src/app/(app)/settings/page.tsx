import { requireProfile } from "@/lib/auth";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/ui";
import { PasswordForm } from "./_components/password-form";
import { PushToggle } from "./_components/push-toggle";

export const metadata = { title: "설정" };

export default async function SettingsPage() {
  const profile = await requireProfile();

  return (
    <>
      <PageHeader title="설정" desc="내 계정" />
      <div className="space-y-6">
        <Card className="max-w-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
              {profile.name.slice(-2)}
            </div>
            <div>
              <p className="text-sm font-semibold">{profile.name}</p>
              <p className="text-xs text-muted">
                {profile.role === "leader" ? "조장" : "조원"}
                {profile.part ? ` · ${profile.part}` : ""}
                {profile.student_no ? ` · ${profile.student_no}` : ""}
              </p>
            </div>
          </div>
        </Card>

        <PushToggle />
        <PasswordForm />
      </div>
    </>
  );
}

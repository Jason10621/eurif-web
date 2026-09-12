import { createClient } from "@/lib/supabase/server";
import type { ResourceWithUploader, ResourceItem } from "@/lib/types";

export { RESOURCE_CATEGORIES } from "@/lib/types";
export type { ResourceItem } from "@/lib/types";

export async function getResourcesWithUrls(): Promise<ResourceItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resources")
    .select("*, uploader:uploaded_by(name)")
    .order("created_at", { ascending: false });

  const rows = (data as ResourceWithUploader[]) ?? [];

  return Promise.all(
    rows.map(async (r) => {
      if (r.storage_path) {
        const { data: signed } = await supabase.storage
          .from("resources")
          .createSignedUrl(r.storage_path, 3600);
        return { ...r, downloadUrl: signed?.signedUrl ?? null };
      }
      return { ...r, downloadUrl: r.url };
    }),
  );
}

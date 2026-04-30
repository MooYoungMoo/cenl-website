import { supabase } from "@/lib/supabase/client";

export type PortalActivityMetadata =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

export type PortalActivityInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: PortalActivityMetadata;
};

export async function logPortalActivity({
  action,
  entityType,
  entityId = null,
  summary,
  metadata = null,
}: PortalActivityInput) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("portal_activity_logs").insert({
      actor_id: user?.id ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      summary,
      metadata,
    });

    if (error) {
      console.warn("Portal activity log failed:", error.message);
    }
  } catch (error) {
    console.warn("Portal activity log failed:", error);
  }
}

import { supabase } from "@/lib/supabase/client";
import { quickStats, type StatItem } from "@/lib/site-data";

type CountResult = PromiseSettledResult<number | null>;

const fallbackMetricMap = quickStats.reduce<Record<string, string>>(
  (accumulator, stat) => {
    accumulator[stat.label] = stat.value;
    return accumulator;
  },
  {},
);

function formatCount(result: CountResult, fallbackLabel: string) {
  if (result.status === "fulfilled" && typeof result.value === "number") {
    return String(result.value);
  }

  return fallbackMetricMap[fallbackLabel] ?? "-";
}

async function countVisiblePublications() {
  const { count, error } = await supabase
    .from("publications")
    .select("id", { count: "exact", head: true })
    .eq("is_visible", true);

  if (error) {
    throw error;
  }

  return count;
}

async function countVisiblePatents() {
  const { count, error } = await supabase
    .from("patents")
    .select("id", { count: "exact", head: true })
    .eq("is_visible", true);

  if (error) {
    throw error;
  }

  return count;
}

async function countVisibleOngoingProjects() {
  const { count, error } = await supabase
    .from("ongoing_projects")
    .select("id", { count: "exact", head: true })
    .eq("is_visible", true);

  if (error) {
    throw error;
  }

  return count;
}

async function countVisibleCurrentMembers() {
  const { count, error } = await supabase
    .from("lab_members")
    .select("id", { count: "exact", head: true })
    .eq("is_visible", true)
    .eq("member_type", "current");

  if (error) {
    throw error;
  }

  return count;
}

export async function fetchHomeMetrics(): Promise<StatItem[]> {
  const [publications, patents, ongoingProjects, labMembers] =
    await Promise.allSettled([
      countVisiblePublications(),
      countVisiblePatents(),
      countVisibleOngoingProjects(),
      countVisibleCurrentMembers(),
    ]);

  return [
    {
      value: formatCount(publications, "Publications"),
      label: "Publications",
    },
    {
      value: formatCount(patents, "Patents"),
      label: "Patents",
    },
    {
      value: formatCount(ongoingProjects, "Ongoing Projects"),
      label: "Ongoing Projects",
    },
    {
      value: formatCount(labMembers, "Lab Members"),
      label: "Lab Members",
    },
  ];
}

"use client";

import { useEffect, useState } from "react";
import {
  fetchVisibleOngoingProjects,
  formatProjectPeriod,
  type SupabaseOngoingProject,
} from "@/lib/ongoing-projects";

export function OngoingProjectsSection() {
  const [projects, setProjects] = useState<SupabaseOngoingProject[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadProjects = async () => {
      try {
        const nextProjects = await fetchVisibleOngoingProjects();

        if (mounted) {
          setProjects(nextProjects);
        }
      } catch {
        if (mounted) {
          setProjects([]);
        }
      }
    };

    void loadProjects();

    return () => {
      mounted = false;
    };
  }, []);

  if (projects.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
      <div className="border-b border-line/70 pb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Ongoing Projects
        </p>
        <h2 className="mt-4 break-words text-2xl font-semibold sm:text-3xl">
          Current funded research activities
        </h2>
        <p className="mt-3 max-w-3xl break-words text-sm leading-7 text-muted">
          Active projects connect CENL&apos;s chemoelectronic nanomaterials
          research with sensor systems, semiconductor devices, and
          materials-based sensing platforms.
        </p>
      </div>

      <div className="mt-8 grid gap-4">
        {projects.map((project) => (
          <article
            key={project.id}
            className="elevated-card border border-line bg-white p-5 sm:p-6"
          >
            <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-2 text-sm text-muted">
                {project.funding_agency ? (
                  <p className="font-semibold text-brand">
                    {project.funding_agency}
                  </p>
                ) : null}
                {project.project_unit ? (
                  <p className="break-words">{project.project_unit}</p>
                ) : null}
                <p>{formatProjectPeriod(project.start_date, project.end_date)}</p>
                {project.project_number ? (
                  <p className="break-all text-xs font-semibold uppercase tracking-[0.12em]">
                    Project No. {project.project_number}
                  </p>
                ) : null}
              </div>
              <div className="min-w-0">
                <h3 className="break-words text-xl font-semibold leading-8">
                  {project.title}
                </h3>
                {project.description ? (
                  <p className="mt-3 break-words text-sm leading-7 text-muted">
                    {project.description}
                  </p>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

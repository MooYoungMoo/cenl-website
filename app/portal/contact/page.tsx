"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { PortalShell } from "@/components/portal-shell";
import {
  fallbackContactContent,
  mapContactContent,
  type ContactPageContent,
  type SupabaseContactContent,
} from "@/lib/contact";
import { supabase } from "@/lib/supabase/client";

type Profile = {
  role: string | null;
};

type FundingSourceManager = {
  funding_source_id: string;
  user_id: string;
};

type ContactForm = {
  recruitingTitle: string;
  recruitingDescription: string;
  recruitingAreas: string;
  applicationEmails: string;
  labName: string;
  contactPerson: string;
  contactRole: string;
  contactEmail: string;
  address: string;
  mapUrl: string;
  mapEmbedUrl: string;
};

const contactSelect =
  "id, recruiting_title, recruiting_description, recruiting_areas, application_emails, lab_name, contact_person, contact_role, contact_email, address, map_url, map_embed_url, updated_by, created_at, updated_at";

function canManage(role: string | null) {
  return role === "professor" || role === "admin" || role === "lab_manager";
}

function listToText(values: string[]) {
  return values.join("\n");
}

function parseList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toContactForm(content: ContactPageContent): ContactForm {
  return {
    recruitingTitle: content.recruitingTitle,
    recruitingDescription: content.recruitingDescription,
    recruitingAreas: listToText(content.recruitingAreas),
    applicationEmails: listToText(content.applicationEmails),
    labName: content.labName,
    contactPerson: content.contactPerson,
    contactRole: content.contactRole,
    contactEmail: content.contactEmail,
    address: content.address,
    mapUrl: content.mapUrl,
    mapEmbedUrl: content.mapEmbedUrl,
  };
}

function getContactPayload(form: ContactForm, userId: string | null) {
  return {
    id: "main",
    recruiting_title: form.recruitingTitle.trim(),
    recruiting_description: form.recruitingDescription.trim(),
    recruiting_areas: parseList(form.recruitingAreas),
    application_emails: parseList(form.applicationEmails),
    lab_name: form.labName.trim(),
    contact_person: form.contactPerson.trim() || "TBD",
    contact_role: form.contactRole.trim() || "TBD",
    contact_email: form.contactEmail.trim() || "TBD",
    address: form.address.trim() || "TBD",
    map_url: form.mapUrl.trim() || null,
    map_embed_url: form.mapEmbedUrl.trim() || null,
    updated_by: userId,
  };
}

function validateContactForm(form: ContactForm) {
  if (!form.recruitingTitle.trim()) {
    return "Recruiting title is required.";
  }

  if (!form.recruitingDescription.trim()) {
    return "Recruiting description is required.";
  }

  if (!form.labName.trim()) {
    return "Lab name is required.";
  }

  return "";
}

export default function PortalContactPage() {
  const [role, setRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [, setUserIsProjectAdmin] = useState(false);
  const [contactForm, setContactForm] = useState<ContactForm>(
    toContactForm(fallbackContactContent),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const userCanManageContact = canManage(role);

  const loadContactContent = useCallback(async () => {
    const { data, error } = await supabase
      .from("contact_page_content")
      .select(contactSelect)
      .eq("id", "main")
      .maybeSingle();

    if (error) {
      setErrorMessage(error.message);
      setContactForm(toContactForm(fallbackContactContent));
      return;
    }

    if (data) {
      setContactForm(
        toContactForm(mapContactContent(data as SupabaseContactContent)),
      );
    } else {
      setContactForm(toContactForm(fallbackContactContent));
    }
  }, []);

  const loadAccess = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setRole(null);
      setCurrentUserId(null);
      setUserIsProjectAdmin(false);
      setErrorMessage("Please sign in again before managing contact content.");
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const [profileResult, managersResult] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      supabase.from("funding_source_managers").select("funding_source_id, user_id"),
    ]);

    if (profileResult.error) {
      setRole(null);
      setErrorMessage(profileResult.error.message);
      setLoading(false);
      return;
    }

    const nextRole =
      ((profileResult.data as Profile | null)?.role ?? null)?.toLowerCase() ??
      null;
    const nextManagers = (managersResult.data ?? []) as FundingSourceManager[];
    const hasProjectAdminAccess = nextManagers.some(
      (manager) => manager.user_id === user.id,
    );

    setRole(nextRole);
    setUserIsProjectAdmin(hasProjectAdminAccess);

    if (canManage(nextRole)) {
      await loadContactContent();
    }

    setLoading(false);
  }, [loadContactContent]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccess();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadAccess]);

  const updateContactForm = (field: keyof ContactForm, value: string) => {
    setContactForm((current) => ({ ...current, [field]: value }));
  };

  const handleSaveContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!userCanManageContact) {
      setErrorMessage("You do not have permission to manage contact content.");
      return;
    }

    const validationMessage = validateContactForm(contactForm);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("contact_page_content")
      .upsert(getContactPayload(contactForm, currentUserId), {
        onConflict: "id",
      });

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Contact page content saved.");
    setSaving(false);
    await loadContactContent();
  };

  return (
    <PortalShell
      title="Contact"
      description="Manage recruiting and lab contact information for the public Contact page."
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Contact
      </p>
      <h2 className="mt-4 text-3xl font-semibold">Contact management</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
        Edit the main recruiting and lab contact content. Areas and application
        emails can be separated by commas or new lines.
      </p>

      {loading ? (
        <div className="portal-card mt-8 rounded-md border border-line p-5 text-sm text-muted">
          Loading contact tools...
        </div>
      ) : null}

      {!loading && !userCanManageContact ? (
        <div className="mt-8 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          You do not have permission to manage contact content.
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-6 rounded-md bg-brand-soft px-4 py-3 text-sm font-medium text-brand">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          {errorMessage}
        </div>
      ) : null}

      {!loading && userCanManageContact ? (
        <form
          onSubmit={handleSaveContact}
          className="mt-8 grid gap-4 rounded-lg border border-line bg-white/60 p-5 shadow-panel md:grid-cols-2"
        >
          <input
            value={contactForm.recruitingTitle}
            onChange={(event) =>
              updateContactForm("recruitingTitle", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Recruiting title"
            required
          />
          <input
            value={contactForm.labName}
            onChange={(event) => updateContactForm("labName", event.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Lab name"
            required
          />
          <textarea
            value={contactForm.recruitingDescription}
            onChange={(event) =>
              updateContactForm("recruitingDescription", event.target.value)
            }
            className="min-h-24 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand md:col-span-2"
            placeholder="Recruiting description"
            required
          />
          <textarea
            value={contactForm.recruitingAreas}
            onChange={(event) =>
              updateContactForm("recruitingAreas", event.target.value)
            }
            className="min-h-28 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Recruiting areas, comma or line separated"
          />
          <textarea
            value={contactForm.applicationEmails}
            onChange={(event) =>
              updateContactForm("applicationEmails", event.target.value)
            }
            className="min-h-28 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Application emails, comma or line separated"
          />
          <input
            value={contactForm.contactPerson}
            onChange={(event) =>
              updateContactForm("contactPerson", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Contact person"
          />
          <input
            value={contactForm.contactRole}
            onChange={(event) =>
              updateContactForm("contactRole", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Contact role"
          />
          <input
            value={contactForm.contactEmail}
            onChange={(event) =>
              updateContactForm("contactEmail", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Contact email"
          />
          <input
            value={contactForm.address}
            onChange={(event) => updateContactForm("address", event.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Address"
          />
          <input
            value={contactForm.mapUrl}
            onChange={(event) => updateContactForm("mapUrl", event.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Map URL"
          />
          <input
            value={contactForm.mapEmbedUrl}
            onChange={(event) =>
              updateContactForm("mapEmbedUrl", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Map embed URL"
          />
          <p className="text-xs leading-6 text-muted md:col-span-2">
            Paste only the Google Maps embed src URL, not the full iframe code.
            Use Map URL for a normal external campus map link.
          </p>
          <div className="flex justify-end md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Contact Content"}
            </button>
          </div>
        </form>
      ) : null}
    </PortalShell>
  );
}

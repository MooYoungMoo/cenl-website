import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";

export default function PortalLoginPage() {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-16 pt-16 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Portal Access
        </p>
        <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">
          Sign-in surface for future lab member authentication
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-muted">
          The login page is UI only. Authentication, roles, university SSO, and
          protected data access can be connected in a later phase.
        </p>
        <Link
          href="/portal/purchase-request"
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-brand transition hover:text-foreground"
        >
          Explore portal placeholders
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="rounded-lg border border-line bg-[#16242d] p-8 text-white shadow-panel md:p-10">
        <div className="mx-auto max-w-md">
          <LockKeyhole className="h-8 w-8 text-brand-soft" />
          <h2 className="mt-6 text-3xl font-semibold">CENL Member Login</h2>
          <p className="mt-3 text-sm leading-7 text-white/70">
            Inputs are visual placeholders and do not submit credentials.
          </p>
          <form className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-white/75">
                Institutional Email
              </label>
              <input
                type="email"
                placeholder="name@university.edu"
                className="w-full rounded-md border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/75">Password</label>
              <input
                type="password"
                placeholder="password"
                className="w-full rounded-md border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
              />
            </div>
            <button
              type="button"
              className="action-button action-button-secondary flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-3 font-medium text-foreground"
            >
              <ShieldCheck className="h-4 w-4" />
              Sign In
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

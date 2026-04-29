import Link from "next/link";
import { contactDetails, navigation } from "@/lib/site-data";

export function SiteFooter() {
  return (
    <footer className="border-t border-line/70 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.3fr_0.8fr_1fr]">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">
            ChemoElectronic Nanomaterials Lab · CENL
          </p>
          <p className="max-w-md text-sm leading-7 text-muted">
            Advancing chemoelectronic nanomaterials, sensor platforms, and
            chemical data intelligence through careful experimental research.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">
            Explore
          </p>
          <div className="grid gap-2 text-sm text-muted">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-brand">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">
            Contact
          </p>
          <div className="grid gap-1 text-sm leading-7 text-muted">
            <p>{contactDetails.lab}</p>
            <p>{contactDetails.pi}</p>
            <p>{contactDetails.affiliation[0]}</p>
            <p>{contactDetails.affiliation[1]}</p>
            <a
              href={`mailto:${contactDetails.emails[0]}`}
              className="hover:text-brand"
            >
              {contactDetails.emails[0]}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

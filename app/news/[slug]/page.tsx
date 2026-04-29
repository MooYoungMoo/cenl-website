import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import { newsItems } from "@/lib/site-data";

type NewsDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return newsItems.map((item) => ({
    slug: item.slug,
  }));
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { slug } = await params;
  const item = newsItems.find((newsItem) => newsItem.slug === slug);

  if (!item) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-5xl px-6 pb-16 pt-14">
      <Link
        href="/news"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to news
      </Link>
      <div className="mt-8">
        <p className="text-sm font-medium text-brand">{item.date}</p>
        <p className="mt-3 inline-flex rounded-md bg-accent-soft px-3 py-2 text-sm font-medium text-accent">
          {item.category}
        </p>
        <h1 className="mt-6 text-4xl font-semibold leading-tight md:text-6xl">
          {item.title}
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted">{item.summary}</p>
      </div>
      <VisualPlaceholder
        label={item.representativeImage}
        className="mt-10 min-h-[420px]"
      />
      <section className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5 text-base leading-8 text-muted">
          {item.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <aside className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
            Photo Gallery
          </p>
          <div className="mt-4 grid gap-3">
            {item.galleryImages.map((image) => (
              <div key={image.label}>
                <VisualPlaceholder
                  label={image.label}
                  className="min-h-32 rounded-md"
                />
                {image.caption ? (
                  <p className="mt-2 text-xs leading-5 text-muted">
                    {image.caption}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </aside>
      </section>
    </article>
  );
}

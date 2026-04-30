import type { Metadata } from "next";
import { NewsDetailContent } from "@/components/news-detail-content";
import { fetchVisibleNewsPostBySlug } from "@/lib/news";
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

export async function generateMetadata({
  params,
}: NewsDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const fallbackItem =
    newsItems.find((newsItem) => newsItem.slug === slug) ?? null;

  try {
    const post = await fetchVisibleNewsPostBySlug(slug);
    const item = post ?? fallbackItem;

    if (!item) {
      return {
        title: "News",
      };
    }

    return {
      title: item.title,
      description: item.summary,
      openGraph: {
        title: item.title,
        description: item.summary,
        images: item.imageUrl ? [item.imageUrl] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: item.title,
        description: item.summary,
        images: item.imageUrl ? [item.imageUrl] : undefined,
      },
    };
  } catch {
    if (!fallbackItem) {
      return {
        title: "News",
      };
    }

    return {
      title: fallbackItem.title,
      description: fallbackItem.summary,
    };
  }
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { slug } = await params;

  return <NewsDetailContent slug={slug} />;
}

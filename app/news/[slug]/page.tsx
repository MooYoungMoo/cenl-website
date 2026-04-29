import { NewsDetailContent } from "@/components/news-detail-content";
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

  return <NewsDetailContent slug={slug} />;
}

"use client";

import { useEffect, useState } from "react";
import { NewsList } from "@/components/news-list";
import { fetchVisibleNewsPosts } from "@/lib/news";
import { newsItems, type NewsItem } from "@/lib/site-data";

export function NewsListSection() {
  const [items, setItems] = useState<NewsItem[]>(newsItems);

  useEffect(() => {
    let mounted = true;

    const loadNews = async () => {
      try {
        const posts = await fetchVisibleNewsPosts();

        if (mounted && posts.length > 0) {
          setItems(posts);
        }
      } catch {
        if (mounted) {
          setItems(newsItems);
        }
      }
    };

    void loadNews();

    return () => {
      mounted = false;
    };
  }, []);

  return <NewsList items={items} />;
}

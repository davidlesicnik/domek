import type { Metadata } from "next";
import Link from "next/link";

import { ArticleCard, BlogPromoCta, BlogTopicPill } from "@/components/blog/blog-shell";
import { getAllPublishedPosts } from "@/lib/blog";
import { getSiteOrigin, getSiteUrl } from "@/lib/site";

function formatBlogDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    alternates: {
      canonical: "/blog",
    },
    description: "Practical home-planning ideas for calendars, chores, shopping, and shared household routines.",
    metadataBase: new URL(getSiteOrigin()),
    openGraph: {
      description: "Practical home-planning ideas for calendars, chores, shopping, and shared household routines.",
      title: "Domek Blog",
      type: "website",
      url: getSiteUrl("/blog"),
    },
    robots: {
      follow: true,
      index: true,
    },
    title: "Domek Blog",
    twitter: {
      card: "summary_large_image",
      description: "Practical home-planning ideas for calendars, chores, shopping, and shared household routines.",
      title: "Domek Blog",
    },
  };
}

export default async function BlogIndexPage() {
  const posts = await getAllPublishedPosts();
  const [featuredPost] = posts;
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    description: "Practical home-planning ideas for calendars, chores, shopping, and shared household routines.",
    name: "Domek Blog",
    url: getSiteUrl("/blog"),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />

      <section className="grid gap-8 rounded-md bg-[#fffdf8] px-6 py-8 shadow-[0_8px_40px_rgba(31,35,30,0.06)] sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.75fr)] lg:items-start">
        <div>
          <h1 className="mt-3 max-w-3xl font-serif text-[clamp(2.4rem,8vw,4.4rem)] font-semibold leading-[0.94] tracking-normal text-[#171a18]">
            Practical home-board ideas that help the week run more smoothly.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#68706b]">
            Articles for households trying to keep plans, chores, shopping, and shared responsibilities in one calm place.
          </p>
        </div>

        <div className="rounded-md border border-[#e4ddd2] bg-[#fffaf1] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-normal text-[#7b817c]">What you will find here</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Family calendar", "Chores", "Shopping lists", "Shared expenses"].map((topic) => (
              <BlogTopicPill key={topic} topic={topic} />
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-[#6c6759]">
            Short, useful guides built around real household friction points, with gentle ways to bring the workflow into Domek when it helps.
          </p>
        </div>
      </section>

      {featuredPost ? (
        <section className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="rounded-md border border-[#e4ddd2] bg-[#fffdf8] p-6 shadow-[0_10px_30px_rgba(31,35,30,0.05)] sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <BlogTopicPill topic={featuredPost.topic} />
              <p className="text-xs text-[#8a8f8b]">{formatBlogDate(featuredPost.publishedAt)}</p>
            </div>
            <h2 className="mt-4 max-w-3xl font-serif text-4xl font-semibold tracking-normal text-[#171a18]">
              <Link className="transition hover:text-[#526c56]" href={`/blog/${featuredPost.slug}`}>
                {featuredPost.title}
              </Link>
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#68706b]">{featuredPost.description}</p>
            <Link
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-[#a8beb0] bg-[#e8efe9] px-5 py-3 text-sm font-semibold text-[#526c56] transition hover:bg-[#dceade]"
              href={`/blog/${featuredPost.slug}`}
            >
              Read featured article
            </Link>
          </article>

          <BlogPromoCta
            body="Readers who want one shared place for plans, chores, lists, and notes can move from article advice straight into a real home board."
            ctaLabel="See Domek pricing"
            ctaHref="/en-US/pricing"
            eyebrow="From idea to routine"
            title="Helpful systems work better when everyone can see them."
          />
        </section>
      ) : null}

      <section className="mt-12">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#545b57]">Latest posts</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-normal text-[#171a18]">Household systems worth keeping.</h2>
          </div>
          <Link className="text-sm font-medium text-[#526c56] transition hover:text-[#3f5745]" href="/blog/rss.xml">
            RSS feed
          </Link>
        </div>

        {posts.length > 0 ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {posts.map((post) => (
              <ArticleCard
                key={post.slug}
                description={post.description}
                href={`/blog/${post.slug}`}
                publishedLabel={formatBlogDate(post.publishedAt)}
                title={post.title}
                topic={post.topic}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-md border border-dashed border-[#d7d0c3] bg-[#fffdf8] p-6 text-sm text-[#6c6759]">
            No posts are published yet. Add an MDX file in <code>content/blog</code> to launch the first article.
          </div>
        )}
      </section>
    </>
  );
}

"use client";

import Markdown from "marked-react";
import { v4 as uuidv4 } from "uuid";
import { TriangleAlertIcon } from "lucide-react";
import CodeRender from "./CodeRenderer";
import type { db as DbPage } from "./types";

function slugify(text: string) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

const linkClass =
  "relative inline-block text-indigo-600 no-underline after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-out after:content-[''] hover:text-indigo-800 hover:after:scale-x-100 focus-visible:after:scale-x-100 dark:text-indigo-400 dark:hover:text-indigo-300";

export const renderer = {
  heading(text: string, level: number) {
    const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
    const id = slugify(text);
    const size =
      level === 1
        ? "text-4xl mb-6"
        : level === 2
          ? "text-3xl mb-4"
          : level === 3
            ? "text-2xl mb-3"
            : level === 4
              ? "text-xl mb-2"
              : "text-lg mb-2";
    return (
      <Tag id={id} key={uuidv4()} className={`${size} font-bold tracking-tight`}>
        {text}
      </Tag>
    );
  },
  paragraph(text: string) {
    return (
      <p className="my-6 leading-relaxed text-gray-600 dark:text-gray-300" key={uuidv4()}>
        {text}
      </p>
    );
  },
  text(text: string) {
    return <span key={uuidv4()}>{text}</span>;
  },
  list(children: React.ReactNode, ordered: boolean, start?: number) {
    const Tag = ordered ? "ol" : "ul";
    return (
      <Tag
        key={uuidv4()}
        start={ordered ? start : undefined}
        className={ordered ? "my-6 ml-6 list-decimal space-y-2" : "my-6 ml-6 list-disc space-y-2"}
      >
        {children}
      </Tag>
    );
  },
  listItem(children: React.ReactNode) {
    return (
      <li key={uuidv4()} className="pl-1 leading-relaxed text-gray-600 dark:text-gray-300">
        {children}
      </li>
    );
  },
  strong(text: string) {
    return (
      <b className="font-semibold text-gray-900 dark:text-white" key={uuidv4()}>
        {text}
      </b>
    );
  },
  image(src: string, alt: string) {
    return (
      <img
        src={src}
        alt={alt}
        key={uuidv4()}
        className="my-8 h-auto max-w-full rounded-xl shadow-md"
      />
    );
  },
  link(href: string, text: string) {
    return (
      <a href={href} className={linkClass} target="_blank" rel="noreferrer" key={uuidv4()}>
        {text}
      </a>
    );
  },
  code(code: string, type: string) {
    return <CodeRender code={code} type={type} key={uuidv4()} />;
  },
  inlineCode(code: string) {
    return (
      <code key={uuidv4()} className="rounded-md bg-gray-100 px-2 py-1 font-mono text-sm dark:bg-gray-800">
        {code}
      </code>
    );
  },
};

function PageArchivedBanner({ writer }: { writer: string }) {
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-red-600 p-4 text-white">
      <TriangleAlertIcon />
      <h2 className="text-lg font-medium">This page has been archived by {writer}</h2>
    </div>
  );
}

export default function PageClient({ db }: { db: DbPage }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {db.page_type === "landing" ? (
        <Landing db={db} />
      ) : db.page_type === "simple" || db.page_type === "info" ? (
        <Simple db={db} />
      ) : (
        <div className="flex min-h-screen flex-col items-center justify-center text-4xl font-bold text-gray-400">
          Content Not Available
        </div>
      )}
      {db.status === "archived" && <PageArchivedBanner writer={db.writer} />}
    </div>
  );
}

function Landing({ db }: { db: DbPage }) {
  return (
    <div className="relative">
      <div className="relative">
        <div className="flex h-screen w-full items-center justify-center p-4">
          {db.landing_image ? (
            <img
              src={db.landing_image}
              alt={`A hero image for ${db.title}`}
              className="h-full w-full rounded-2xl object-cover shadow-lg"
            />
          ) : null}
        </div>

        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 transform">
          <div className="-translate-y-12 justify-center text-center">
            <h1 className="text-2xl font-bold backdrop-blur">{db.title}</h1>
          </div>
          <a href="#learnmore">
            <button className="rounded-full bg-white px-8 py-3 font-semibold text-indigo-600 shadow-lg transition-all hover:bg-gray-50">
              Learn more
            </button>
          </a>
        </div>
      </div>

      <div id="learnmore" className="min-h-screen">
        <section className="container mx-auto max-w-4xl px-4 py-16">
          <article className="max-w-none text-lg">
            <Markdown renderer={renderer} gfm breaks>
              {db.markdown_content}
            </Markdown>
          </article>
        </section>
      </div>
    </div>
  );
}

function Simple({ db }: { db: DbPage }) {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <article className="max-w-none text-lg">
        <Markdown renderer={renderer} gfm breaks>
          {db.markdown_content}
        </Markdown>
      </article>
    </div>
  );
}

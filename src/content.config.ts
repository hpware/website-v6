import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			author: z.string().optional(),
			status: z.enum(["draft", "published", "archived"]).default("published"),
			uuid: z.string().optional(),
			heroImage: z.optional(image()),
		}),
});

const food = defineCollection({
	// Food reviews live as Markdown in `src/content/food/`.
	loader: glob({ base: './src/content/food', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			author: z.string().optional(),
			status: z.enum(["draft", "published", "archived"]).default("published"),
			uuid: z.string().optional(),
			heroImage: z.optional(image()),
			rating: z.number().min(0).max(5).optional(),
			priceRange: z.string().optional(),
			location: z.string().optional(),
		}),
});

export const collections = { blog, food };

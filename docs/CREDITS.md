# Credits and licences

Everything the site shows that wasn't written for this project, with its
licence. Keep this file up to date when adding a font, icon set, image or
data source.

## Logo

The Unicelerate logo (a graduation cap lifted by an upward swoosh) is
**original, made for this project**. It's hand-drawn as SVG paths in
[`components/brand/mark.ts`](../components/brand/mark.ts) and doesn't copy or
adapt any other brand's logo or a stock icon. The tab icon, app icons and
share image are generated from it (`npm run brand:icons`, and
`app/opengraph-image.tsx`).

## Images

| What | Where it's used | Source | Licence |
| --- | --- | --- | --- |
| Photo of a college building behind a striped lawn, by **Vadim Sherbakov** | Landing page hero | <https://unsplash.com/photos/brown-concrete-palace-under-blue-sky-at-daytime-d6ebY-faOO0> (served from `images.unsplash.com/20/cambridge.JPG`, resized by `next/image`) | [Unsplash License](https://unsplash.com/license): free to use, no permission needed; credit given here as a courtesy |

The screen previews on the landing page are drawn with the site's own
components and real computed data; they're not images.

## Fonts

| Font | Used for | Licence |
| --- | --- | --- |
| [Geist](https://vercel.com/font) and Geist Mono | Body text, code | SIL Open Font License 1.1 |
| [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) | Headings | SIL Open Font License 1.1 |

Both are self-hosted at build time by `next/font`.

## Icons

| What | Licence |
| --- | --- |
| [Lucide](https://lucide.dev) icons (`lucide-react`) | ISC |
| [flag-icons](https://github.com/lipis/flag-icons) | MIT |

## Data

See the README's "Where the data comes from": U.S. Department of Education
College Scorecard (public domain, U.S. government work), each university's
own website (figures linked to their page), government immigration websites
for visa guidance, and European Central Bank reference exchange rates.

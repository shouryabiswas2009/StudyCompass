# Credits and licences

Everything the site shows that wasn't written for this project, with its
licence, plus the things that were made for it. This file is also the
site's public /credits page, so keep it up to date when adding a font,
icon set, image, graphic or data source (and keep links absolute https).

## Logo

The Unicelerate logo (a graduation cap lifted by an upward swoosh) is
**original, made for this project**. It's hand-drawn as SVG paths in
`components/brand/mark.ts` and doesn't copy or
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

### Research impact (Leiden Ranking / OpenAlex)

| Source | What we use | Licence |
| --- | --- | --- |
| [CWTS Leiden Ranking Open Edition 2025](https://open.leidenranking.com) ([data on Zenodo](https://doi.org/10.5281/zenodo.17473224)) | PP(top 10%) per university and main field, 2020–2023, turned into percentiles | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| [OpenAlex](https://openalex.org) institutions | Websites and other names, to match universities; the Leiden Ranking is itself built from OpenAlex | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| [Wikidata](https://www.wikidata.org) | Which ROR id belongs to which US (IPEDS) school id, to match US universities | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| [ROR](https://ror.org) (Research Organization Registry) ids, as listed in the sources above | The shared identifier that links them | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

No commercial ranking (QS, Times Higher Education, U.S. News,
ShanghaiRanking) is copied into the site or its database.

### Grade conversions (profile)

Only conversions the exam boards publish themselves; anything else is the
student's own nearest percentage, marked approximate.

| System | Rule used | Source |
| --- | --- | --- |
| CBSE Class X CGPA | Indicative percentage = 9.5 × CGPA | [CBSE Circular No. 24, 28 May 2010](https://www.cbse.gov.in/circulars/cir24-2010.pdf) |
| IB Diploma subject grades | Middle of the IB's suggested mark range per grade (7 = 96–100 … 1 = 1–20), averaged over subjects | [International Baccalaureate, Suggested Conversion for students applying to Indian Universities, April 2012](https://aiu.ac.in/documents/evaluation/Grade%20Conversion%20IB.pdf) |
| Cambridge International A Levels | Middle of the percentage uniform mark range per grade (A* = 90–100 … E = 40–49), averaged over subjects | [Cambridge International, India frequently asked questions (2025), Appendix 1](https://www.cambridgeinternational.org/Images/745293-india-frequently-asked-questions.pdf) |
| US GPA | Not converted (no published GPA-to-percentage table); the student enters their nearest percentage. College Board's per-class guide is linked as guidance | [College Board BigFuture](https://bigfuture.collegeboard.org/plan-for-college/get-started/how-to-convert-gpa-4.0-scale) |

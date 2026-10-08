# Data sources considered for university strength

Every source looked at for the Unicelerate strength index, what its
licence or terms say about reuse (read on 2026-10-07), and what we decided.
The rule: only use a source whose licence or terms explicitly allow reuse.
If the terms couldn't be read or are unclear, the source is treated as not
allowed.

| Source | Licence / terms (checked 2026-10-07) | Decision |
| --- | --- | --- |
| **QS World University Rankings** (topuniversities.com) | The terms page refuses automated access (HTTP 403), so its terms couldn't be read. | **Not used.** Unclear terms count as not allowed; no QS numbers anywhere. Permission can be requested at content@qs.com (see docs/RESEARCH-IMPACT.md). |
| **Times Higher Education** (timeshighereducation.com) | [Website Terms of Use](https://www.timeshighereducation.com/website-terms-of-use): requests to reproduce or distribute rankings data must go to THE; scraping, spiders and data mining are not allowed. | **Not used.** |
| **U.S. News & World Report** (usnews.com) | Its terms page didn't respond to our requests (timed out twice), so the terms couldn't be read. | **Not used** (unclear = not allowed). |
| **ShanghaiRanking / ARWU** (shanghairanking.com) | Only "Copyright © 2026 ShanghaiRanking Consultancy. All Rights Reserved." No licence for reuse. | **Not used.** |
| **Webometrics** (webometrics.info) | The site couldn't be reached (the domain didn't resolve), so no terms could be read. | **Not used** (unclear = not allowed). |
| **uniRank** (unirank.org) | [Terms](https://www.unirank.org/terms/): scraping or republishing university data without prior written permission isn't allowed. | **Not used.** |
| **Wikipedia ranking lists** | Wikipedia text is CC BY-SA 4.0, but its ranking tables copy QS, THE, ARWU and U.S. News figures, whose own terms don't allow reuse. The share-alike licence can't grant rights Wikipedia doesn't have. | **Not used.** |
| **OpenAlex** (openalex.org) | Data released under **CC0 1.0** (the snapshot's `LICENSE.txt`; docs: data is free, the API free for casual use). | **Used**: citation signals per institution (works, citations, h-index, i10-index, 2-year mean citedness) and names/websites for matching. |
| **CWTS Leiden Ranking Open Edition 2025** | Results and data released under **CC0 1.0** ([resources page](https://open.leidenranking.com/resources)). | **Used**: research impact, PP(top 10%), overall and per field. |
| **Wikidata** | "All structured data … is released into the public domain under Creative Commons Zero" ([licensing](https://www.wikidata.org/wiki/Wikidata:Licensing)). | **Used** only for IPEDS id ↔ ROR id, to match US schools. Student counts, founding years and institution types were **not** used: coverage and consistency vary between items, and the index doesn't need them (US peer groups use the Carnegie level from College Scorecard). |
| **ROR** (Research Organization Registry) | CC0 1.0. | **Used** as the shared identifier (via Leiden, OpenAlex and Wikidata). |
| **US College Scorecard** (US Department of Education) | The [data.gov record](https://catalog.data.gov/dataset/college-scorecard) lists the licence as CC BY (attribution); it's a US government dataset. | **Used** (already imported): graduation rate, retention rate, median earnings, SAT, Carnegie research level. Credited on /credits. |
| **Other national bodies** (UK HESA / Discover Uni, Australia QILT, others) | HESA's copyright page refused automated access (HTTP 403); the others weren't evaluated in depth. | **Not used yet.** Each would need its own terms check and matching; a possible later addition for non-US outcome data. |

Commercial rankings never enter the site or database. An exact rank isn't
needed: the strength index is our own labelled estimate built from the
open sources above (docs/STRENGTH-INDEX.md).

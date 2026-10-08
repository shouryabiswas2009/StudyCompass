# Grade systems considered

Checked 2026-10-08. The rule: convert only with a table, formula or
definition that the issuing board, ministry or a national body publishes;
where marks are already percentages, nothing is converted ("exact") and
the source just shows that; everything else keeps the student's own nearest
percentage, marked "approximate". If a source couldn't be fetched or didn't
say it clearly, the system stays approximate. Code: `lib/grades.ts`.

## Added

| System | Basis | What we checked (official source) |
| --- | --- | --- |
| Ontario (OSSD) | exact | Ontario Ministry of Education, [Student assessment, evaluations and report cards](https://www.ontario.ca/page/student-assessment-evaluations-and-report-cards): secondary report cards give achievement levels and the percentage marks they correspond to (policy: Growing Success). We ask for the average of the best six Grade 12 U/M courses, how Ontario universities consider it. |
| British Columbia | exact | [K-12 Student Reporting Policy](https://www2.gov.bc.ca/gov/content/education-training/k-12/administration/legislation-policy/public-schools/student-reporting): "For Grades 10-12 the Policy requires use of letter grades and percentages." Students enter the percentage; the letter bands (e.g. A = 86–100) appear in district guidance, not a Ministry table, so no letter conversion is offered. |
| Alberta | exact | Alberta Education, [Diploma exams overview](https://www.alberta.ca/diploma-exams-overview): "70% of the final mark comes from course work. The remaining 30% comes from the diploma exam." The help text says the final blended mark already includes this. |
| Manitoba | exact | [Manitoba Provincial Report Card Policy](https://www.edu.gov.mb.ca/k12/assess/report_card/docs/provincial_report_card_policy.pdf): Grades 9 to 12 are reported "using only the percentage grade scale". |
| Saskatchewan | **approximate** | The Ministry's [transcripts page](https://www.saskatchewan.ca/residents/education-and-learning/credits-degrees-and-transcripts/requesting-transcripts-for-high-school) confirms Grades 10–12 marks but doesn't say how they're scaled; the only statement that they're percentages came from a school division. Kept approximate until a Ministry source says so. |
| Nova Scotia, New Brunswick, Newfoundland and Labrador, PEI | **approximate** | No official department page stating how Grade 12 marks are reported was found (searches returned think-tank reports and third-party explainers). Kept approximate. |
| Quebec (Secondary V / CEGEP) | **approximate** | The [BCI's cote R page](https://www.bci-qc.ca/cote-r/) describes the R-score: a relative, rank-based score computed from the student's group, not a percentage. Not converted. |
| AP (Advanced Placement) | **approximate** | College Board, [About AP Scores](https://apstudents.collegeboard.org/about-ap-scores): scores are 1–5; no percentage conversion is published. |
| Australia (ATAR) | **approximate** | UAC, [Australian Tertiary Admission Rank](https://www.uac.edu.au/future-applicants/atar): "The ATAR is a rank, not a mark." Not converted; the student enters their average mark. |

Unchanged: plain percentage (exact; also covers CBSE Class XII, ICSE/ISC
and Indian state boards, whose results are marks out of 100), CBSE Class X
CGPA (converted, CBSE Circular 24/2010), IB (converted, IB's suggested
ranges), Cambridge International A Levels (converted, Cambridge's PUM
ranges), US GPA (approximate) and "Another system" (approximate).

## Not added (they stay under "Another system", approximate)

| System | Why |
| --- | --- |
| ICSE / ISC as a separate option | Marks out of 100, so the plain percentage option already fits; no official CISCE page describing the scale could be fetched to cite. |
| UK GCSE / A Level (non-Cambridge boards), Scottish Highers | The UCAS tariff is a published points system, but it isn't a percentage and the app compares percentages; no official grade-to-percentage table. |
| German Abitur | The KMK "modified Bavarian formula" converts *foreign* grades into the German scale for German admissions; using it backwards to make a percentage would be our own formula. |
| French Baccalauréat (out of 20) | Rescaling /20 to /100 is arithmetic, not an equivalence (14/20 is a strong mark); no official conversion. |
| Hong Kong DSE, Singapore A Levels, Sri Lanka A/L | Graded or ranked results with no official percentage table found. |
| Nigerian WAEC / NECO, Bangladesh HSC (GPA 5.0) | Their boards publish mark *ranges* per grade, but no rule for turning a grade or GPA back into one percentage (the IB and Cambridge documents say to use the midpoint; these don't). |
| Pakistan HSSC | Results are marks out of a total; the percentage is the student's own marks ÷ total, so the plain percentage option fits. |
| Chinese Gaokao | Provincial scores out of different totals; no national percentage table. |

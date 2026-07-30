# ArbiSmart documentation

## Getting Started (new users, no technical background needed)

| | |
| --- | --- |
| 🇬🇧 English | [**ArbiSmart-Getting-Started-EN.pdf**](./ArbiSmart-Getting-Started-EN.pdf) |
| 🇮🇷 فارسی | [**ArbiSmart-Getting-Started-FA.pdf**](./ArbiSmart-Getting-Started-FA.pdf) |

A short, illustrated walkthrough with real screenshots: what you need,
connecting a wallet, picking a plan, staking, claiming rewards, the referral
bonus, the Portfolio page, and leaving early. No contract internals, no
jargon — just the steps.

## Complete guide (full reference)

| | |
| --- | --- |
| 🇬🇧 English | [**ArbiSmart-Guide-EN.pdf**](./ArbiSmart-Guide-EN.pdf) |
| 🇮🇷 فارسی | [**ArbiSmart-Guide-FA.pdf**](./ArbiSmart-Guide-FA.pdf) |

A complete, 16-section user and reference guide covering: connecting a
wallet, staking plans, opening/managing/exiting a position, claiming yield,
the referral programme, the Portfolio page, the Security model (what the
owner can and cannot do), partner governance (emergency and rescue votes),
the on-chain activity feed, contract/deployment reference, known limitations,
an FAQ, and a glossary.

Each language pair (Getting Started EN/FA, Guide EN/FA) describes the same
deployed contract and is kept in sync — neither half of a pair is a
translation of the other; each was written directly in its own language.

## Regenerating these PDFs

The documents are built from `docsrc/content_en.html` / `docsrc/content_fa.html`
(not tracked in this repo — see below) rendered to PDF via headless Chromium
with all fonts embedded as base64, so the output PDF has no external
dependencies. If you need to rebuild them after a content change:

1. Fonts: Inter (Latin) and Vazirmatn (Persian) are embedded at build time from
   Google Fonts as base64 `@font-face` data URIs, so the final PDF is fully
   self-contained.
2. The HTML is rendered to PDF with Playwright/Chromium
   (`page.pdf({ format: 'A4', printBackground: true, displayHeaderFooter: true })`)
   for accurate print pagination and page-number footers.
3. Table-of-contents page numbers are **not** hand-typed — they are extracted
   from the rendered PDF's actual text (matching each section's heading marker
   per page) and patched back into the source before a final render, so the
   printed contents page matches the real pagination exactly.

## Accuracy

Every figure in these guides (plan rates, referral percentages, penalty
schedule, governance delays, contract address) was read from the deployed
contract source and, where applicable, from live on-chain state at the time
of writing — not copied from marketing copy. Where a figure can change after
publication (partner count, pause state), the guide says so explicitly and
points to the live page (`/partners`, `/activity`) rather than asking the
reader to trust the printed number.

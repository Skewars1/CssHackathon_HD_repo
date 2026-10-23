# SureCOD

**A privacy-first Cash-on-Delivery (COD) buyer trust-score and dispatch verification network that protects independent online sellers from costly Return-to-Origin (RTO) losses.**

---

## Problem Statement

* *Affected Users:* Online sellers who experience bogus buyers or buyers who back out at the last moment in Cash-on-Delivery (COD) setups. Some buyers may be unavailable to receive their orders on the scheduled delivery date, while others may place fake or fraudulent orders without any intention of completing the order. As a result, sellers experience financial losses due to returned products and wasted materials, even though they never receive payment for their products.

* *Why It Matters:* Bogus buyers and uncollected Cash-on-Delivery (COD) orders directly erode the profit margins of independent online sellers through unrecoverable packaging, handling, and return-to-origin (RTO) freight costs. In a systematic review of e-commerce returns management, researchers from the University of Hildesheim analyzed 54 key academic studies and found that **44.4% of the literature specifically focuses on returns prevention** (Freichel et al., 2024). This highlights that stopping failed transactions before fulfillment is the single largest priority in modern e-commerce research.

* *Current Gaps:*
  * **Platform Lock-In:** Existing COD risk apps (e.g., CODcheck, Munshi Trust Network, TrueCOD) require an active Shopify store subscription, leaving out thousands of independent Filipino sellers operating via social commerce (Facebook Marketplace, Instagram, TikTok, and direct checkout links).
  * **Legal & Privacy Liability:** Sellers currently warn each other by posting screenshots of buyers' names, addresses, and phone numbers in public "bogus buyer" social media groups — exposing sellers to **Cyber-Libel** and **Data Privacy Act of 2012 (RA 10173)** violations.

---

## Proposed Solution

* **0–100 Buyer Trust Score & Dynamic Payment Gate:**
  * Every buyer starts at a neutral baseline of **50 points** (on a **0–100** scale) identified solely by a client-side **SHA-256 hash** of their mobile number (`sha256_...`), ensuring zero raw personal data is stored or exposed.
  * Sellers log delivery outcomes that adjust the buyer's score based on severity:
    * **Confirmed Deliveries:** Standard COD (`+10 pts`) or Protected COD with deposit (`+15 pts`).
    * **Missed / Returned (RTO) Penalties:** Weighted across **Mild** (`-5` to `-8 pts` for prior notice/reschedule), **Moderate** (`-15` to `-18 pts` for unreachable buyer or no cash ready), and **Severe** (`-25` to `-35 pts` for doorstep refusal or fake address/bogus order).
  * **Automated Checkout Restrictions by Tier:**
    * **Trusted (`70 – 100`):** Unlocks **Standard COD**, Protected COD, and Full Upfront payment.
    * **Neutral (`35 – 69`, Starting Score: `50`):** Standard COD is locked; buyers must build trust using **Protected COD** (₱80 shipping deposit via GCash held in escrow) or **Full Upfront**.
    * **Watchlist (`21 – 34`, First Restriction Flag at `30`):** Flagged for heightened courier verification; restricted to **Protected COD** deposit or **Full Upfront**.
    * **High Risk (`0 – 20`):** Both COD options are locked; **only Full Upfront payment** remains available.
* **AI Evidence Review for Human Moderation:**
  * Buyers who were penalized due to courier error or emergencies can submit an appeal note and counter-evidence. **Google Gemini** performs a 3-step forensic pre-screening (checking screenshot metadata, courier call-attempt alignment, and claim consistency) and forwards a structured advisory report to **Human Moderation** without allowing automated point manipulation.

* *One-Sentence Summary:*
  For smaller sellers, losing revenue from even a few failed deliveries can be a massive hit — SureCOD provides a privacy-safe, shared risk-score tracking system that identifies repeat offenders before dispatch and dynamically requires shipping downpayments or upfront payment so every delivery goes smoothly.

* *SDG Alignment:*
  * **SDG 8:** Decent Work and Economic Growth *(protecting MSME and social-commerce seller livelihoods from RTO losses)*
  * **SDG 9:** Industry, Innovation, and Infrastructure *(accessible digital trust infrastructure for informal & independent e-commerce)*
  * **SDG 10:** Reduced Inequalities *(giving small independent merchants the same fraud-prevention tools as enterprise platforms)*
  * **SDG 12:** Responsible Consumption and Production *(reducing wasted packaging materials and unnecessary round-trip courier emissions from failed deliveries)*

---

## MVP Scope

* *Prototype Core Flow (What it does):*
  An end-to-end, 5-screen operational loop that can be tested live:
  1. **Dashboard (`/`)**: View real-time network statistics comparing **Accepted / Successful Parcels** vs. **Missed / Unsuccessful (RTO) Parcels**.
  2. **Risk-Aware Checkout Simulator (`/checkout`)**: Enter a Philippine mobile number (`09XXXXXXXXX`), hash it in-browser via SHA-256, look up the buyer's `0–100` trust score, and dynamically lock/unlock **Standard COD**, **Protected COD (₱80 deposit)**, or **Full Upfront** before placing an order.
  3. **Log Delivery Outcome (`/outcomes`)**: Select a pending parcel and resolve it as *Confirmed Received* (`+10` / `+15 pts`) or *Missed / Returned* (`-5` to `-35 pts`), updating the buyer's score and tier in real time.
  4. **Seller Risk Lookup (`/risk`)**: Search any anonymized buyer (`ACC-XXXX` or `sha256` prefix) to inspect their `0–100` score bar, payment eligibility, transaction ledger, and clickable past AI Review Reports.
  5. **AI Evidence Review (`/appeals`)**: Submit a penalized order with buyer notes and counter-evidence for **Gemini AI** pre-screening, generating a 3-point forensic review report queued for human moderation.

* *Out of Scope (What it does not do):*
  * Hardware/SIM-level device fingerprinting for buyers who purchase brand-new SIM cards to reset their score back to the `50` baseline (noting that new numbers still start at `50` in the *Neutral* tier and must pay the Protected COD shipping deposit until they reach `70+`).
  * Live payment gateway settlement with GCash/Maya banking rails and live courier webhook APIs (J&T, Flash Express, LBC).
  * Automated point restoration without human moderator sign-off (AI acts strictly as an advisory pre-screener to prevent prompt-injection or gaming).

* *Real vs. Mocked:*
  * **Real:**
    * Client-side **SHA-256 phone number normalization and hashing** via the browser Web Crypto API.
    * Live **Supabase PostgreSQL database** (`buyer_profiles`, `parcel_records`, `appeals`) and atomic PL/pgSQL RPC functions (`place_order`, `resolve_parcel`, `apply_appeal`).
    * Deterministic **`0–100` Trust Score Engine** (`50` starting baseline, weighted reason impacts, tier cutoffs, and payment route gating).
    * Live **Google Gemini API** (`gemini-3.6-flash` / `gemini-3.5-flash` multi-model fallback) server-side structured JSON evaluation of appeal claims and evidence signals.
  * **Mocked:**
    * The e-commerce storefront item (*Minimalist Heavyweight Boxy Tee*) and GCash/QRPh payment collection screen.
    * Pre-extracted EXIF/tamper metadata signals attached to the counter-evidence screenshot presets.

---

## Planned Tech Stack

| Layer | Pick | Why |
| :--- | :--- | :--- |
| **UI / UX Design** | **Stitch & Custom Navy/Blue Design System** | High-contrast Navy Blue (`#0B1437`) & Royal Blue (`#2563EB`) dashboard with interactive hover micro-animations |
| **Frontend & SSR Framework** | **TanStack Start + React 19 + TypeScript + Vite 8 + Tailwind CSS v4** | Type-safe file-based routing, fast SSR/server functions, and responsive component architecture |
| **Database & Backend** | **Supabase (PostgreSQL + Row-Level Security + PL/pgSQL RPCs)** | Stores real anonymized buyer profiles, parcel ledgers, and AI review reports with atomic score updates |
| **Score Logic** | **Deterministic TypeScript + SQL Rules (`0–100` Scale)** | Transparent and defensible: starts at `50`, clamps `0–100`, applies exact severity weights, and enforces payment gates |
| **Privacy Layer** | **Web Crypto API (`SHA-256`)** | Hashes mobile numbers in the browser before network transmission so raw phone numbers never touch the database |
| **AI Pre-Screening** | **Google Gemini API** (`@tanstack/react-start` Server Function) | Evaluates buyer appeal explanations and evidence signals via strict JSON schema before human moderation |
| **AI Coding & Debugging** | **Google Antigravity & Lovable** | Rapid full-stack iteration, Supabase schema migration, and multi-model Gemini fallback engineering |
| **Version Control & Hosting** | **GitHub + Vercel** | Continuous deployment from `main` to a live public URL for judge evaluation |

---

## Limitations and Risks

* **SIM Card Cycling (Sybil Risk):** A repeat offender could buy a new prepaid SIM card to escape a *High Risk (`≤20`)* score. **Mitigation:** Because every new buyer starts at **`50` (*Neutral*)** rather than *Trusted (`≥70`)*, brand-new numbers **cannot use Standard COD** right away — they must still pay the **₱80 Protected COD deposit** or **Full Upfront** until they complete successful deliveries.
* **Unfair or Malicious Seller Reporting:** A seller or courier rider might falsely mark a parcel as *Refused at Doorstep* when no delivery attempt was actually made. **Mitigation:** Buyers can contest penalties through the **AI Evidence Review** tab, which flags courier call-log discrepancies for human moderators without letting either party arbitrarily manipulate points.
* **Storefront Placeholder:** The checkout cart is a demonstration harness representing how an external e-commerce checkout plugin or social-commerce payment link integrates with the SureCOD risk API.

---

## Feasibility, Scalability and Sustainability

* *Feasibility:*
  **Legal & Privacy Compliance:** Unlike public "bogus buyer" social media posts that risk cyber-libel and Data Privacy Act violations, the platform hashes sensitive buyer identifiers (phone numbers) and outputs only anonymized risk tiers (`Trusted`, `Neutral`, `Watchlist`, `High Risk`) and payment rules rather than exposing raw personal data publicly.

* *Scalability:*
  **AI Triage for Human Moderation at Scale:** As transaction disputes grow, the Gemini AI Review Engine automatically pre-screens standard evidence (delivery receipts, courier tracking statuses, and call logs) and summarizes findings into a 3-point dossier so human moderators can review cases in seconds.

* *Sustainability:*
  **Courier & Aggregator Partnerships + SaaS API:** Collaborating with logistics providers, shipping aggregators, and social-commerce checkout platforms who also lose operational capacity on Return-to-Origin (RTO) parcels — charging a micro-fee per verified checkout lookup or taking a small escrow service fee on Protected COD deposits.

---

## Team Members and Roles

* **Raymond Marasigan:** Team Leader | Frontend | Backend | Product & Research | UI/UX | Pitching
* **Christian Klien Monje:** Developer | Frontend | Backend | UI/UX | Product & Research | Pitching
* **Thomas Angelo Tongson:** Developer | Backend | Product & Research | Pitching
* **Ariani Ann Faye Austria:** Presenter | UI/UX | Pitching

---

## Next Steps After the Hackathon

1. **Human Moderator Admin Portal:** Build the dedicated moderator action queue to approve or reject AI-reviewed dossiers with one click and log moderator audit trails.
2. **Seller Trust Weighting & Verification:** Introduce KYC-verified merchant tiers so established sellers with high fulfillment volume have weighted reporting authority and cannot abuse penalty logs.
3. **Live Courier & Payment Webhooks:** Integrate real-time tracking webhooks from PH couriers (J&T Express, Flash Express, NinjaVan) and PayMongo/GCash QRPh APIs to automate Protected COD shipping deposit escrow and release.
4. **Shareable Social-Commerce Checkout Links & Shopify/WooCommerce Plugin:** Package the SureCOD lookup and payment gate as a 1-click shareable link for Facebook/TikTok sellers and a lightweight plugin for independent web stores.

# Scaffolding job-tracking software — what exists, what's missing
Research date: 20 August 2026

## Who's already in this market

| Product | Built for | Strength | Weakness for a small firm |
|---|---|---|---|
| **Avontus** (Quantify / Designer / ScaffoldIQ) | Large contractors, multiple yards | Full lifecycle: request → erect → inspect → handover → dismantle, plus component-level inventory and rental billing | Priced and shaped for big logistics operations; heavy to set up |
| **SMART Scaffolder** (SMART Manager, Estimating) | UK scaffolding contractors | Estimating → handover certs → inspections, strong audit trail; well-liked UK toolset | Modular pricing adds up; desktop-first heritage |
| **CloudScaff** | Scaffold + formwork asset owners | Erect / tag / inspect / handover / modify / dismantle logs, QR tag scanning | Asset-management framing; overkill if you don't rent components out |
| **Footprint WFM** | Field workforce | Handover certs, weekly inspections, harness checks, dismantle notices, timesheets; works offline | Workforce-management first, job pipeline second |
| **Doka Hi-Vis / CORE EHS ScafEdge** | Industrial sites, client-side | Electronic scaffold requests, permits, tagging, live site view | Built for the client/principal contractor, not the scaffolding contractor |
| **Scaffmax / Scaffcalc** | Designers | Fast 3D layouts and take-offs | Design only — no job tracking at all |
| Spreadsheets + WhatsApp + a whiteboard | Most firms under ~15 staff | Free, everyone already knows it | Nothing is verified, nothing is searchable, inspections get missed |

## What's genuinely lacking

1. **The gap between whiteboard and enterprise.** Firms under ~15 staff either pay enterprise money for asset-tracking they don't need, or run on a whiteboard. There's very little in the middle that just answers "what's up, what's coming down, who's doing it, is it signed off."
2. **Verification is usually one-sided.** Most tools let the crew tick "done." Few enforce that a *second named person* confirms it. That second signature is what protects you in a dispute or an HSE conversation.
3. **Questions have nowhere to live.** Site questions happen on WhatsApp and are lost by the time the job is invoiced. None of the mainstream tools keep a question thread attached to the job.
4. **Up/down time isn't treated as money.** Hire revenue accrues per week a scaffold stands, yet "days up × weekly rate" is rarely visible on the job card, so over-runs and forgotten off-hires quietly cost margin.
5. **Inspection intervals need chasing manually.** Statutory inspections at ≤7 day intervals (and after alteration or bad weather) are the single most-missed compliance item. Auto-scheduling the next one the moment the last is signed off is uncommon outside the expensive tiers.
6. **Everything needs an account.** Most crews will not create logins. Anything that needs onboarding before a scaffolder can tick a box loses.

## What this build does about it

- Job lifecycle modelled on how the trade actually talks: **Enquiry → Quoted → Booked in → Up / on hire → Off-hire → Down → Complete**.
- **Two-person sign-off**: crew marks done, someone else verifies. Self-verification is blocked by default (togglable in Settings).
- **Inspections schedule themselves**: verify one and the next is created automatically at your chosen interval, from the erect date, and stops when the scaffold comes down.
- **Hire money on the card**: days up × weekly rate, live.
- **Questions live on the job**, with answers and a close button, plus a global unanswered list.
- **Handover certificate** with loading class recorded against the job.
- One link, no accounts — each person just picks their name.

## Suggestions — sensible next moves

**High value, low effort**
1. **Photos on sign-off.** A photo attached to a verification is the strongest evidence there is. (Needs a place to store images — see below.)
2. **QR tag per scaffold.** Print a tag with the job ref; scanning opens that job's inspection form. Cheap to add, looks very professional to clients.
3. **Weekly off-hire chase.** A list of scaffolds up longer than their planned dismantle date, with a one-tap "email the client" draft. This is found money.
4. **Materials on the job** (tube/board/fittings counts) — even rough counts tell you what's in the yard vs on sites.

**Worth planning for**
5. **Client view.** A read-only link per job for the main contractor: status, handover cert, inspection dates. Kills half the phone calls.
6. **Timesheets from tasks.** Crew already mark work done — capturing start/finish turns that into payroll and job costing for free.
7. **Quote → job in one step**, and job → invoice at completion, so numbers are typed once.
8. **Weather flag.** Wind speed over threshold at a site postcode ⇒ an extra inspection prompt. Genuinely differentiating and nobody small does it.

**Architecture**
9. Today the data is a single JSON document, shared through the artifact link or held on the device. That's ideal up to a handful of users. If you want photos, true real-time editing by several people at once, and per-person logins, the next step is a small backend (Supabase or Firebase would do it) — the data model in this app maps to it directly.
10. **Back up weekly** with Export JSON until a backend exists.

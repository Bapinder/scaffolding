# Running the tracker as a scaffolding firm — test log, pros, cons
Tested 21 August 2026 against the published build.

## What was tested
A full job cycle driven through the real interface, not the code: three-man firm set up from an
empty tracker (manager, chargehand, scaffolder), job created from an enquiry, standard task list
applied, erect marked done by the scaffolder, self-verification attempted, verified by the
chargehand, handover issued, tag printed, nine days simulated, question raised from site and
answered by the office, off-hire, dismantle verified, hire calculated.

| # | Check | Result |
|---|---|---|
| 1 | Three members added to a brand-new tracker | pass (fixed — the first member could not be added before) |
| 2 | Job created with client, site, dates, value, weekly hire | pass |
| 3 | Standard tasks laid out: deliver, erect, handover inspection, dismantle | pass |
| 4 | Scaffolder marks erect done | pass, stamped with name and time |
| 5 | Same man tries to verify his own work | correctly refused |
| 6 | Chargehand verifies | pass — job flips to UP, erected date set |
| 7 | Inspection auto-scheduled, then +7 days on each sign-off | pass (handover inspection → 28 Aug → 4 Sep) |
| 8 | Handover certificate with loading class | pass |
| 9 | Scaffold tag prints with live status and QR | pass — QR verified module-for-module against an independent encoder |
| 10 | Nine days later, tag flips to INSPECTION OVERDUE | pass |
| 11 | Dashboard raises the overdue inspection | pass |
| 12 | Question from site, answered by office | pass |
| 13 | Off-hire then dismantle verified | pass — job DOWN, outstanding inspections closed (fixed) |
| 14 | Hire earned pro-rata | pass (£121 for 10 days at £85/week) |
| 15 | Photos attach to a job and to a specific task | pass, resized to about 60–120 KB each |
| 16 | Export and import a backup | pass |
| 17 | Dates match the crew's local calendar | fixed — dates were being computed in UTC and could land a day out |

Three real defects were found and fixed during this pass: the blocked first member, inspections
still chasing a scaffold that was already down, and the UTC date bug.

## Pros — what it does well for a firm this size
- **The board answers the only question that matters at 7am:** what is up, what goes up today,
  what comes down, who is on it.
- **Sign-off is real.** Two names on every piece of work, the doer blocked from verifying himself.
  Nothing else in this price bracket does that.
- **Inspections cannot quietly lapse.** They generate themselves, they show on the tag, and the tag
  says INSPECTION OVERDUE rather than SAFE TO USE.
- **The tag is genuinely useful.** Printed, cable-tied on, and it carries the job reference, the
  handover class, the last inspection and the next one due — with a QR that opens live status.
- **Hire is visible while it accrues,** so a scaffold standing three weeks past its off-hire date
  is obvious rather than discovered at invoicing.
- **No accounts, no licences, no training.** A man opens a link, taps his name, and ticks a box.
- **Photos are evidence, not clutter** — attached to the specific task that was signed off.

## Cons — honest limitations
1. **Identity is self-declared.** Anyone with the link picks any name, so a sign-off is a record of
   what was claimed, not proof of who claimed it. Fine for running the yard; not proof in a dispute.
2. **One job = one scaffold.** A site with a front elevation, a rear tower and a temporary roof has
   to be three jobs, or one job with three sets of tasks and one tag.
3. **Simultaneous edits.** Two people saving at the same second: one save wins, the other person's
   view reloads and their unsaved change is lost. Rare with a small crew, real with ten.
4. **Photo storage is finite** — roughly 30 to 40 photos before the tracker is full. It warns from
   75%, but a photo-heavy firm will outgrow it inside a season.
5. **No notifications.** The verify queue does not chase anyone; someone has to look.
6. **No money beyond the job value and hire rate.** No variations, no extras, no invoice, no
   labour hours — so margin per job is still guesswork.
7. **Offline.** The shared link needs a signal. Saved as a file on a phone it works anywhere, but
   then it is that phone's copy only.
8. **Nothing goes to the client automatically** — the handover and inspection history are printable,
   but nobody gets emailed.

## Recommendations, in the order I would do them
1. **Variations and extras on a job** — description, price, who approved it, date. This is the
   single biggest money leak in the trade and it is a day's work to add.
2. **Adaptations reset the inspection clock.** Right now an adapt task does not force a new
   inspection; regulation-wise any alteration should. Small change, real safety value.
3. **Handover signed by the client's man** — a name and a typed signature on the certificate.
   Turns a record into something worth producing in an argument.
4. **PIN per person.** Four digits against each member would take identity from "claimed" to
   "reasonably attributed" without introducing accounts.
5. **Multiple scaffolds per site** — a site holding several scaffolds, each with its own tag,
   inspection clock and hire rate.
6. **Timesheets on tasks** — hours per person per job, so job value minus labour gives margin.
7. **Off-hire chase list** with a ready-to-send message to the client.
8. **Weekly print pack** for the Monday meeting: up, due, overdue, unanswered.
9. **Photo housekeeping** — a yearly archive-and-clear so the tracker does not silently fill.

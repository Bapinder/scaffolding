# business/

## scaffold-tracker/
`scaffold-tracker/index.html` — the whole app in one file. No build step, no dependencies, no server.

**What it does**
A job is: who it's for, where it is, what it's worth, when it goes up, when it comes down. One person
ticks **Scaffold is UP**, and later **Scaffold is DOWN**. Everything else follows from those two dates.

- **Today** — what's up now, what's booked, hire earned, anything overdue, and the next two weeks.
- **Jobs** — all of them, filtered by booked / up / down, searchable.
- **Calendar** — going up in green, coming down in grey, inspections in red.
- **Settings** — company name, currency, inspection reminder, the crew, the yard, backups.

**Two ways to run it**
- **Shared:** open the published link. Every change one person makes reaches everyone else.
- **On its own:** double-click `index.html`. Data stays in that browser. Export a backup from Settings.

**Dates** — tap the date and a month opens; tap a day. Arrows move month to month, and there's a
Today and a Clear. Same on a new job and on an existing one.

**Copy a job** — "Copy for the same client" keeps the client, contact, rates and crew, clears the
address and dates, and gives it a new number.

**Logo** — add it once in Settings and it prints top-right on both documents.

**Paperwork** — two documents per job, both saved as a picture you can attach to WhatsApp or email:
- *Job sheet* — client, site, contact, dates, crew, price, notes and the site photo.
- *Handover certificate* — certificate number, duty/loading class, limitations, the safety wording,
  your name and the client's signature, signed on the phone with a finger.

**Photo** — one picture of the site per job, taken with the phone camera or picked from the gallery.
It is shrunk on the way in, so it costs roughly 60–120 KB.

**Colour** — the round button in the header: six presets or your own, plus light/dark for your device.
The colour is company-wide; light/dark is per person.

**Finding a site** — three ways, and they work together:
- *Look this address up* — a link straight into Google Maps with the address you typed (needs signal).
- *Use my location* — pins the exact spot while you're standing on it, or paste a map link back in.
- Once pinned, the job draws a small **offline map**: the site against the yard, with distance,
  compass direction and north. No tiles, no signal needed — the artifact sandbox blocks map tiles,
  so this is what works everywhere. "Open in Maps" still hands the pin to the phone's own maps app.

**Inspections** — optional, off or on in Settings. When on, a scaffold that goes up gets a reminder
every 7 days (or whatever you set); "Inspected today" rolls it forward. It stops when the job comes down.

**Careful when the app is republished**
The published link stores its data inside the page. The source file here keeps that store empty so a
fresh copy starts clean — so republishing the source as-is would wipe whatever the crew has entered.
Before publishing a change: back up the live data, inject it, publish, then clear. `sync-live-state.py`
does all three and documents the order at the top of the file. `live-state-backup.json` holds the last
captured copy.

`REVIEW.md` — test log of a full job cycle, with pros, cons and recommendations (written against the
earlier, larger version).
`MARKET.md` / `market-review.html` — feature-by-feature review of the competing products.
`RESEARCH.md` — the original market research and the gaps this was built into.

# App Store Connect — every field, ready to paste

Everything below is drafted to Apple's current limits. Character counts are given where
Apple enforces one.

---

## App information

| Field | Value |
|---|---|
| **Name** (30 max) | `My Scaffolding Ltd` — 18 |
| **Subtitle** (30 max) | `Jobs, hire and inspections` — 26 |
| **Bundle ID** | `com.myscaffoldingltd` |
| **SKU** | `myscaffolding-001` |
| **Primary category** | Business |
| **Secondary category** | Productivity |
| **Primary language** | English (U.K.) |

## URLs

| Field | Value |
|---|---|
| **Privacy Policy URL** | `https://bapinder.github.io/myscaffolding-legal/` |
| **Support URL** | `https://bapinder.github.io/myscaffolding-legal/support` |
| **Marketing URL** | leave blank |

> The support URL needs a page to exist — see `store/support.html`, which goes in the same
> repo as the privacy policy.

## Promotional text (170 max)

```
Every scaffold you have up, what it is earning, and which inspections fall due this week —
on the phone, in the yard, without a signal.
```
— 141 characters.

## Description (4000 max)

```
My Scaffolding Ltd keeps track of every scaffold your firm has out: who it is for, where it
is, what it is worth, when it went up and when it comes down.

WHAT IT ANSWERS AT SEVEN IN THE MORNING
See at a glance what is up now, what is booked in, what hire you have earned, and anything
overdue. The next fortnight is laid out so nobody turns up to a job nobody prepared for.

INSPECTIONS THAT CANNOT QUIETLY LAPSE
A scaffold that goes up schedules its own seven-day inspection. The phone reminds you the
morning it falls due, and marking it inspected rolls the clock forward. It stops on its own
when the scaffold comes down.

PAPERWORK IN TWO TAPS
Produce a job sheet or a handover certificate as a picture you can send straight to a client
by message or email. The certificate carries the duty class, the limitations, the safety
wording and a signature signed on the phone with a finger.

THE WHOLE CREW, ONE SET OF JOBS
Start a shared tracker and read the code out to your lads. Everyone sees the same jobs, and
what one person changes reaches everybody. No accounts to set up, no licences, no training —
a man opens the app, taps his name, and gets on with it.

BUILT FOR A YARD, NOT AN OFFICE
Take a photo of the site and it stays with the job. Pin a scaffold's exact spot while you are
standing on it, and every job shows how far it is from your yard — drawn without map tiles,
so it works with no signal at all.

WHAT IT DOES NOT DO
No adverts. No tracking. No analytics. Your jobs are yours: kept on the phone, and on our own
server only if you choose to share a tracker with your crew.
```
— 1,486 characters.

## Keywords (100 max, comma separated, no spaces after commas)

```
scaffold,scaffolding,scaffolder,site,inspection,handover,hire,job,tracker,construction,trades
```
— 92 characters.

## What's New in This Version

```
First release.
```

---

## App Review Information

| Field | Value |
|---|---|
| **Sign-in required** | No |
| **Contact** | myscaffoldingltd@outlook.com |

**Notes for the reviewer:**

```
The app opens straight into a working tracker with no sign-in — tap "+ New job" to create one.

To see the sharing feature: Settings -> "Start a shared tracker" produces an eight-character
code. Entering that code on another device joins the same tracker. No account is involved;
the code itself is the credential.

Camera and location are both optional and only requested at the moment you tap the button
that needs them ("Choose a photo", "Use my location"). The app works fully without granting
either.
```

---

## Age rating

Answer **None / No** to every content question. The result is **4+**.

It is a work tool with no user-generated public content, no web browsing, no contests,
no gambling and no mature themes.

---

## Export compliance

| Question | Answer |
|---|---|
| Does your app use encryption? | **Yes** |
| Does it qualify for an exemption? | **Yes** |
| Which exemption? | Only uses standard encryption within iOS (HTTPS/TLS) |

The app makes HTTPS calls to Supabase and nothing more — no proprietary or non-standard
cryptography. This is the routine exemption; no CCATS or year-end report is required.

---

## App Privacy — the nutrition label

Answer the questionnaire as follows.

**Do you collect data from this app?** — **Yes** (only when the user starts a shared tracker,
but Apple wants Yes if it can ever leave the device).

### Data types collected

| Apple category | Collected | Linked to identity | Used for tracking | Purpose |
|---|---|---|---|---|
| **Contact Info → Name** | Yes | No | No | App Functionality |
| **Contact Info → Phone Number** | Yes | No | No | App Functionality |
| **Contact Info → Physical Address** | Yes | No | No | App Functionality |
| **User Content → Photos** | Yes | No | No | App Functionality |
| **User Content → Other** (signatures, job notes) | Yes | No | No | App Functionality |
| **Location → Precise Location** | Yes | No | No | App Functionality |

Everything else — Identifiers, Usage Data, Diagnostics, Purchases, Browsing History, Search
History, Health, Financial Info, Sensitive Info, Contacts — answer **not collected**.

**Linked to identity** is now correct for the fields above: from 1.1 the app has accounts, and
data sits against the email address you sign in with. Update the App Privacy answers on the
store at the same time 1.1 ships — the 1.0 answers said not-linked, which stops being true.

**Used for tracking: No** everywhere. There is no advertising, no third-party SDK, and nothing
is shared with data brokers.

---

## Screenshots

Required: **6.9-inch display**, 1320 x 2868 or 1290 x 2796 pixels, between 3 and 10 images.

Suggested set, in order:

1. **Today** — the dashboard with a few live jobs, one overdue inspection showing
2. **Jobs** — the list, filtered to what is up
3. **A job open** — dates, crew, value, site photo
4. **Handover certificate** — the finished document with a signature
5. **Calendar** — a month with jobs going up and coming down
6. **Settings → shared tracker** — the join code screen

Take them on an iPhone 16/17 Pro Max, or any 6.9-inch device. Screenshots from a 6.3-inch
phone are not an accepted size and App Store Connect will reject them.

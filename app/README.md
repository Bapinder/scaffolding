# Scaffold Tracker — the phone apps

The same tracker as `../scaffold-tracker/index.html`, wrapped as real iOS and Android
apps with [Capacitor](https://capacitorjs.com). One web app, two stores, no rewrite.

There is still **no build step and no framework**. `www/index.html` is the app, exactly
as it always was. Capacitor's plugins are reached through the global `Capacitor.Plugins`
proxy rather than ESM imports, precisely so that stays true.

---

## What had to change, and why

The web version kept the crew in step by **republishing its own HTML** through the Claude
artifact runtime — `claude.use('artifact')`, then `cap.publish(...)` with the state
injected back into `<script id="app-state">`. There is no such thing on a phone. That was
the one genuine blocker, and it is what most of this work replaces.

| Was | Is now |
|---|---|
| `claude.use('artifact')` + republish the page | Supabase: one JSON document per firm, compare-and-swap on a revision number |
| Reload every open copy to spread changes | Poll one integer every 10s; pull the document only when it actually moved |
| `claude.use('downloads')` / `<a download>` | System share sheet (`Filesystem` + `Share`) — `<a download>` does nothing in a webview |
| Google Fonts over the network | `www/fonts/` — 12 woff2 files, 168 KB, works with no signal |
| No viewport tag (the artifact shell supplied one) | Real viewport + `env(safe-area-inset-*)` so nothing hides under the notch |
| Nothing chased anyone | Local notification at 7am the day an inspection falls due |

**`mergeStates()` was not touched.** The per-job last-write-wins merge with tombstones was
always transport-agnostic — only the pipe under it changed. `initStorage`, `save`,
`publishNow` and the deleted `fetchPublished` are the whole of the swap.

The app still runs as a plain web page. Open `www/index.html` in a browser and Capacitor
is absent, `native.js` quietly no-ops, and `Backend.configured()` is false, so it falls
back to the single-device localStorage behaviour it always had.

---

## One-time setup

### 1. Supabase

1. Make a project at [supabase.com](https://supabase.com) (the free tier is ample — the
   whole firm is one row).
2. SQL Editor → paste **all** of `supabase/schema.sql` → Run.
3. Settings → Data API → copy the **Project URL** and the **anon / publishable key**.
4. Put both into `www/config.js`.

```js
window.SUPABASE_URL      = 'https://yourproject.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

The anon key is *meant* to be public — it ships inside every copy of the app. It grants
nothing on its own: `schema.sql` turns RLS on, gives `anon` no table access at all, and
exposes only four `security definer` functions that each demand a join code.

**Be clear-eyed about what the join code is.** It is a shared secret, the same capability
model the secret artifact link had. Anyone holding it can read and write the tracker. It
is *not* per-person identity — a sign-off still records what was claimed, not who claimed
it, exactly as `REVIEW.md` says. If you want that fixed, it is Supabase Auth plus a PIN
per member, and it is a separate piece of work.

### 2. Build tools

```bash
npm install
```

- **iOS** — Xcode and CocoaPods. Verified against Xcode 26.6.
- **Android** — a JDK 21 and the Android SDK. If `java` is missing:

```bash
brew install openjdk@21
```

Then, in the shell you build from:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

---

## Day to day

Edit `www/index.html` as you always did, then:

```bash
npx cap sync
```

Run them:

```bash
npx cap open ios
```

```bash
npx cap open android
```

Or straight from the command line:

```bash
cd android && ./gradlew assembleDebug
```

Rebuild the icons after changing `assets/icon.svg`:

```bash
npx @capacitor/assets generate
```

---

## Before you submit

Both stores were the stated target, so these are the parts that actually get builds
rejected.

### Both

- [ ] Fill in `www/config.js` — a build shipped with it empty has no sharing at all.
- [ ] Bump the version. iOS: `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in Xcode.
      Android: `versionCode` / `versionName` in `android/app/build.gradle`.
- [ ] Write a privacy policy and host it somewhere public. Both stores require a URL, and
      this app takes photos, location and client names. Say plainly what is collected,
      that it sits in your Supabase project, and who can reach it.

### iOS

- [ ] Apple Developer Program — £79/yr.
- [ ] Set your team and a real bundle id in Xcode. It is currently
      `com.myscaffoldingltd`.
- [ ] **Apple guideline 4.2, "minimum functionality"** is the live risk for any app that
      is a website in a wrapper. The defence is that this one genuinely uses the device:
      camera, location, local notifications, offline operation. Say so in the review
      notes, and give the reviewer a **working join code with data in it** — an empty
      tracker reads as an unfinished app and gets rejected.
- [ ] Usage strings are already written into `Info.plist`. If you change what the app
      does with a permission, change the sentence too.
- [ ] `ITSAppUsesNonExemptEncryption` is set to `false`, so the export-compliance question
      is answered on every upload already.

### Android

- [ ] Play Console — $25, once.
- [ ] Generate an upload keystore and keep it somewhere you will not lose it. Lose it and
      you cannot update the listing.
- [ ] `./gradlew bundleRelease` — Play wants an `.aab`, not an `.apk`.
- [ ] Fill in the Data Safety form. Same content as the privacy policy.
- [ ] Note there is **no** `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM` in the manifest, on
      purpose: Play restricts those to alarm and calendar apps and would query the
      listing. A reminder landing at 7:04 instead of 7:00 costs a scaffolding firm
      nothing, so the notification is scheduled inexactly.

---

## Layout

```
app/
  www/                  the app — this is what ships
    index.html          the tracker itself, one file, as ever
    config.js           your Supabase URL and key       <- fill this in
    sync.js             the transport that replaced artifact republishing
    native.js           share sheet, notifications, status bar, Android back
    fonts/              Barlow, bundled so it works with no signal
  supabase/schema.sql   paste into the SQL editor, once
  assets/               icon.svg / splash.svg -> every size both stores want
  ios/  android/        generated by Capacitor; safe to delete and re-add
```

---

## Still true from REVIEW.md

Going native fixed two of the listed cons outright — **no notifications** (inspections now
chase you) and **offline** (the app keeps working with no signal and syncs when it
returns). The rest stand, and are worth reading before promising anything to a customer:
identity is self-declared, one job is one scaffold, there is no money beyond job value and
hire rate, and nothing reaches the client automatically.

Photo storage is better than it was but not solved. State still lives in `localStorage`,
so the old 30–40 photo ceiling still applies. Moving photos to IndexedDB or to Supabase
Storage is the obvious next piece of work, and the app already warns from 75% full.

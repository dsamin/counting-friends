# App Store Connect — Listing Copy

Ready-to-paste copy and metadata for the **Counting Friends** App Store submission.
Character limits noted where Apple enforces them. Replace the placeholder support email
before submitting.

---

## App name

```
Counting Friends
```

## Subtitle (≤ 30 characters)

```
Calm counting, no ads, no fail
```

(30 characters exactly.)

---

## Promotional text (≤ 170 characters)

```
A gentle tap-to-count toy for ages 3–5. Hear "How many ducks?", tap the number, get confetti. No ads, no purchases, no data, no way to fail. Works fully offline.
```

---

## Description

```
Counting Friends is a calm, no-fail counting toy for pre-readers — the years when a
child can say "1, 2, 3" long before they know that three cats means tapping the number 3.

No ads. No in-app purchases. No data collected. No way to fail.

That promise is the whole point. You can hand your child the iPad and walk away. There
are no banners, no "watch a video" prompts, no surprise unlock screens, and nothing your
child can tap their way into. The app collects, stores, and transmits nothing — once it's
loaded, it never touches the network.

HOW IT PLAYS
A few friendly animals wander onto a soft meadow. A warm voice asks, "How many ducks?"
Your child taps the matching big number. A correct answer bursts into confetti, a happy
squash-and-stretch, and spoken praise — by name, if you like. A wrong tap does nothing
harsh: the number just wobbles gently and the question is asked again. There's no score,
no timer, no losing. Your child can play forever, and every answer is a small win.

NO READING REQUIRED
Everything is conveyed by picture, size, color, and voice. A child who can't read a
single word can start and play on their own.

GROWS WITH YOUR CHILD
Three difficulty tiers, chosen on a wordless start screen by tapping one of three duck
sizes:
• Easy — count 1 to 5
• Medium — count 1 to 10
• Hard — count 1 to 20

FOUR FRIENDS
Dot the duck, Pip the cat, Hopper the frog, and Momo the bunny take turns each round, so
play stays fresh. Tap any animal and it makes its sound.

PRIVATE AND OFFLINE
No accounts, no analytics, no ad networks, no trackers, no third-party SDKs. The only
things saved are your own settings, kept on your device and never sent anywhere. The app
works with no internet connection at all.

MADE FOR LITTLE HANDS
Big, forgiving buttons. A calm, low-stimulation palette. Reduce-motion support, VoiceOver
labels, and feedback that never relies on color alone. Grown-up settings sit behind a
press-and-hold parental gate, so little fingers can't wander out of play.

One honest price, then nothing. That's the deal.
```

---

## Keywords (≤ 100 characters, comma-separated)

```
counting,numbers,toddler,preschool,pre-k,kids,no ads,learning,math,montessori
```

(Do not repeat words already in the app name/subtitle — Apple indexes those separately.
"Friends," "counting," and "calm" are already covered by the name and subtitle.)

---

## What's New (v1.0)

```
Welcome to Counting Friends! This is our first release.

• Tap-to-count play across three tiers: 1–5, 1–10, and 1–20
• Four animal friends to count
• A big confetti celebration for every correct answer — and no way to fail
• Fully offline. No ads, no purchases, no data collected.

We'd love your feedback. Happy counting!
```

---

## App Store metadata checklist

| Field                        | Value                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Category**                 | Kids Category                                                                                                            |
| **Age band**                 | 5 & under                                                                                                                |
| **Primary category**         | Education                                                                                                                |
| **Secondary category**       | Games (or Games › Educational)                                                                                           |
| **Age rating**               | 4+                                                                                                                       |
| **App Privacy**              | **Data Not Collected** — across **every** data category (no contact info, no identifiers, no usage data, no diagnostics) |
| **Price**                    | Paid up front, ~$3.99 (Tier 4). No in-app purchases.                                                                     |
| **Privacy Policy URL**       | `https://dsamin.github.io/counting-friends/privacy.html` (must be live before submit)                                    |
| **Support URL**              | A reachable page with a contact method (replace placeholder `hello@countingfriends.app`)                                 |
| **Marketing URL** (optional) | `https://dsamin.github.io/counting-friends/`                                                                             |
| **In-app purchases**         | None                                                                                                                     |
| **Sign in with Apple**       | Not used                                                                                                                 |
| **Third-party SDKs**         | None                                                                                                                     |

### Screenshots (required sizes)

Apple requires iPad screenshots for an iPad app. Provide both orientations where the app
supports both (it does — landscape-first).

- **iPad 12.9" (3rd–6th gen):** 2048 × 2732 (portrait) / 2732 × 2048 (landscape)
- **iPad 13" (M4):** 2064 × 2752 (portrait) / 2752 × 2064 (landscape)

Lead the screenshot set with the four-promises marketing frame ("No ads. No data. No
fail."), then: the counting scene, the celebration moment, and the tier-select start
screen. Use the brand marketing frames in `assets/marketing/` as the basis.

### App preview video (optional but recommended)

A 15–30s preview. Reuse the celebration loop: a round being answered correctly, the
confetti burst, then the next round dealing in. Capture it from the live PWA (the same
Playwright/screen-record pipeline used for the marketing frames). No text overlays needed
beyond the brand line; let the calm and the confetti carry it.

---

## Guideline 1.3 (Kids Category) pre-submission self-audit

Run this before hitting Submit — Kids Category review is stricter and a single rejection
round can slip the launch. Check every box:

- [ ] **Parental gate placement.** The settings/about corner — the only grown-up
      affordance — is behind a press-and-hold gate (3 seconds), not a one-tap dialog.
      Confirm the gate guards _everything_ grown-up, including the optional child-name
      field.
- [ ] **Zero child-facing outbound links.** There are no links, "rate us," "more apps,"
      buy buttons, or anything that leaves the app reachable anywhere a child can tap.
      Any such link must live behind the parental gate (this app has none child-facing).
- [ ] **Privacy URL is live and reachable.** `https://dsamin.github.io/counting-friends/privacy.html`
      loads, states plainly that the app collects/stores/transmits no data, and matches
      the "Data Not Collected" declaration.
- [ ] **App Privacy declaration matches reality.** "Data Not Collected" across all
      categories; no analytics, ad networks, or third-party SDKs bundled.
- [ ] **No ads, no IAP, no account.** Confirmed in the build and in App Store Connect.
- [ ] **Age band and category** set to Kids / 5 & under / 4+.
- [ ] **Both orientations** (landscape + portrait), **Reduce Motion**, and **VoiceOver**
      verified on a real iPad before submit.

```

```

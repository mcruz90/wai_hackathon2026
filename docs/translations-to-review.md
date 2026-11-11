# Translations to review

Every patient-facing string is stored in `lib/i18n.ts`. There is no live AI translation.

The strings ported from `reference/demo.html` were already marked draft there. The strings below are **new in this prototype** and were drafted in French, Mandarin (Simplified Chinese), Spanish and Tagalog without a native speaker. All of them need review before any pilot. Keys are the property names in `lib/i18n.ts`.

## Changed from the demo

| Key | English | Why it changed |
| --- | --- | --- |
| `thFull` | Thank you. Your report is recorded. | The demo said the listing was now hidden. A listing is now hidden only after 2 separate reports. |

## Listing and shared

| Key | English |
| --- | --- |
| `toPlan` | My plan |
| `tooMany` | Too many reports for now. Please try again later. |
| `err` | That did not work. Please try again. |
| `gone` | This listing is no longer shown. |

## My plan (screen 4)

| Key | English |
| --- | --- |
| `planH` | My plan |
| `planSub` | Calling clinics yourself is the fastest way to find a doctor. This list stays on this device and is cleared when you close the browser. |
| `opened` | Clinics you opened |
| `noneOpened` | You have not opened a clinic yet. |
| `repOpen` | You reported: still taking patients |
| `repFull` | You reported: full |
| `repNone` | Not reported yet |
| `callNext` | Call next |
| `noMore` | No other open listings near you right now. Check again in a few days. |
| `alsoDo` | Also do this |
| `hccIf` | If you have a valid Ontario health card, do this at the same time. Keep calling clinics while you wait. |
| `concept` | Concept |
| `wlLink` | See how a fair waitlist could work |
| `needSearch` | Enter your postal code first. |

## Waitlist concept: status and rule screens

| Key | English |
| --- | --- |
| `wlBanner` | Concept, sample patients |
| `wlNot` | This is not a real waitlist. Nobody can join it and no message is sent. |
| `wlStatusH` | Waitlist status |
| `wlEntry` | Sample entry near {fsa} |
| `wlAbout` | About {n} people are waiting near this area. |
| `wlFew` | Fewer than 5 people are waiting near this area. |
| `wlLast` / `wlLast1` / `wlLastToday` | Last spot offered {n} days ago. / Last spot offered yesterday. / A spot was offered today. |
| `wlNever` | No spot has been offered near this area yet. |
| `wlNoPlace` | We do not show an exact place in line. It changes when people accept, pass or leave. |
| `wlRuleLink`, `wlRuleH` | How the order works |
| `wlOutboxLink` | See the sample messages |
| `wlRules[0..4]` | The five lines of the ordering rule (radius, first joined first, batch size, reply window, 30-day check-in). |

## Waitlist concept: outbox messages

| Key | English |
| --- | --- |
| `mOffer` | {clinic} ({area}) has an open spot for a new patient. Reply YES to accept or PASS to skip. Please reply by {date}. If you pass, you keep your place on the list. |
| `mReminder` | Reminder: the open spot at {clinic} is held for you until {date}. Reply YES to accept or PASS to skip. |
| `mCheckin` | Do you still need a doctor? Reply 1 to keep waiting, 2 to switch area, or 3 to leave the list. |

## Things a reviewer should look at closely

- **Reply keywords** in `mOffer` and `mReminder` differ by language (YES/PASS, OUI/PASSER, SÍ/PASO, OO/PASA; Chinese keeps YES/PASS). Decide whether keywords should be localized at all.
- **"Nurse practitioner"** is rendered in the feminine in French and Spanish (carried over from the demo).
- **Health Care Connect** is called "Accès Soins" in French and left in English elsewhere.
- **Language names on the listing screen** (the pills such as "Farsi", "Tamil") are shown in English in every language.
- **Not translated:** the staff screens (`/admin`, `/partner`, `/admin/waitlist`) and the labels around each outbox message are English only.

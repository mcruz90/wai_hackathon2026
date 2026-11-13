# Translations to review

Every patient-facing string is stored in `lib/i18n.ts`. There is no live AI translation.

The strings ported from `reference/demo.html` were already marked draft there. The strings below are **new in this prototype** and were drafted in French, Mandarin (Simplified Chinese) and Tagalog without a native speaker. All of them need review before any pilot.

**Arabic and Punjabi are new in full.** Every string in the `ar` and `pa` blocks, including the call script, was drafted without a native speaker and needs review. Points to check:

- Arabic is Modern Standard Arabic. Check number agreement (for example `days` uses أيام for every number, which is wrong above 10), and whether the waitlist messages should keep the Latin reply words YES and PASS.
- Arabic screens are right to left. Check the layout of mixed Arabic and English text, such as clinic names and the English call-script lines.
- Punjabi is written in Gurmukhi. Confirm this suits the pilot area, since some Punjabi speakers read Shahmukhi. The call script uses both masculine and feminine forms (ਰਿਹਾ/ਰਹੀ, ਬੋਲਦਾ/ਬੋਲਦੀ); a reviewer may prefer a neutral wording.
- Spanish was removed from the patient screens. Its strings remain in git history. Keys are the property names in `lib/i18n.ts`.

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

## Ontario search changes

Review the updated `unk` notice and new `radius` string in all six languages in `lib/i18n.ts`. Unknown locations no longer imply downtown Toronto. Results now explain their approximate postal-area distance and configured radius. French, Mandarin, Arabic, Punjabi and Tagalog wording is a draft awaiting native-speaker review.

## Languages not listed, language reports and the appointment guide

New in all six languages, drafted without a native speaker. Keys in `lib/i18n.ts`:

| Key | English |
| --- | --- |
| `langUnknown` | Languages not listed. Ask when you call. |
| `speaksRep` | Patients report: speaks {lang} |
| `interpRep` | Patients report: interpreter offered |
| `langQ` | Did they speak {lang}? |
| `lSpoke` | Yes, someone spoke {lang} |
| `lInterp` | They offered an interpreter |
| `lNeither` | Neither |
| `thLang` | Thank you. This tells the next person what to expect. |
| `guideLink` | Questions to bring to your appointment |
| `guideH` | Questions for your appointment |
| `guideSub` | Show these to the clinic. They are practical questions. For the health conversation itself, ask for a professional interpreter. |
| `gt[0..4]` | Calling the clinic · Booking your first appointment · At your first visit · Medications and records · After the visit |
| `gq[0..9]` | The 10 guide questions, in the order of `GUIDE` in `lib/i18n.ts` |

The guide questions are shown to clinic staff, so the English is the part that must be exact; the translation tells the patient what they are showing. Check especially:

- The IFHP question names the program the way patients know it in each language (French: Programme fédéral de santé intérimaire, PFSI).
- The Punjabi first-person lines use both masculine and feminine forms (ਨਵਾਂ/ਨਵੀਂ, ਲੈਂਦਾ/ਲੈਂਦੀ), like the call script.
- The medication question asks for a longer renewal; it must not read as asking for a different medication or dose.

## Read aloud and other languages

New in all six languages, drafted without a native speaker:

| Key | English |
| --- | --- |
| `speak` | Read aloud in English |
| `xlLabel` | Another language? Type it, and we will machine-translate the phone script and these questions. |
| `xlPlaceholder` | For example: Somali, Farsi, Ukrainian |
| `xlButton` | Translate |
| `xlNote` | Machine translation into {lang}, not reviewed by a person. The English is what you show or play to the clinic. |
| `xlFail` | The translation is not available right now. The English below still works. |
| `xlLink` | Another language? Get the phone script and appointment questions machine-translated |

Languages typed into the guide are translated by Cohere at the time of use and are never reviewed. Spot-check the most requested ones (for example Somali, Farsi, Urdu, Tamil, Ukrainian, Spanish) with native speakers before a pilot, and move any that matter into reviewed translations in `lib/i18n.ts`.


## Clinic instructions into the patient's language

The guide page has a panel where clinic staff type an instruction in English, or tap an example, and the patient sees it machine-translated into their language. The staff-facing text in that panel is English only. The strings below are new in all six languages, drafted without a native speaker:

| Key | English |
| --- | --- |
| `clinicH` | When the clinic gives you instructions |
| `clinicNote` | Machine translation, not checked by a person. Always confirm doses and dates with the pharmacist, or ask for a professional interpreter. |
| `clinicOwn` | In your language: |
| `clinicSpeak` | Read aloud in your language |
| `clinicFail` | The translation is not available right now. Ask for an interpreter. |
| `clinicNums` | Warning: the numbers in the translation do not match the English. Check them with the clinic. |

The instruction itself is translated by Cohere at the time of use and is never reviewed. Cohere's translation model (`command-a-translate-08-2025`) is used for the 23 languages it covers; Punjabi, Tagalog and other languages go to `LLM_MODEL`. Before a pilot, check the example instructions (`CLINIC_PRESETS` in `lib/i18n.ts`) in each language with a native speaker, especially doses and times.

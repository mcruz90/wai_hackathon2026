# Extraction evaluation

Run: 2026-11-12T16:12:52.553Z

Provider: cohere

Model: command-a-plus-05-2026

File: eval\synthetic.jsonl

Announcements: 3 in the file, 3 scored, 0 failed to run

## Accuracy by field

| Field | Correct | Accuracy |
| --- | --- | --- |
| location | 0 of 3 | 0% |
| provider_type | 3 of 3 | 100% |
| languages | 3 of 3 | 100% |
| date | 3 of 3 | 100% |

Location is scored on the postal area (first 3 characters). Languages must match as a set. A null label means the right answer is to return null.

## Mistakes

| Announcement | Field | Expected | Got | Model confidence |
| --- | --- | --- | --- | --- |
| ex-01 | location | M1L | null | low |
| ex-02 | location | M6K | null | low |
| ex-03 | location | M1T | null | low |

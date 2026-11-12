# Extraction evaluation

Run: 2026-11-12T16:10:00.577Z

Provider: cohere

Model: command-a-plus-05-2026

File: eval\announcements.jsonl

Announcements: 15 in the file, 15 scored, 0 failed to run

## Accuracy by field

| Field | Correct | Accuracy |
| --- | --- | --- |
| location | 15 of 15 | 100% |
| provider_type | 11 of 15 | 73% |
| languages | 15 of 15 | 100% |
| date | 15 of 15 | 100% |

Location is scored on the postal area (first 3 characters). Languages must match as a set. A null label means the right answer is to return null.

## Mistakes

| Announcement | Field | Expected | Got | Model confidence |
| --- | --- | --- | --- | --- |
| real-01 | provider_type | family_doctor | unknown | low |
| real-03 | provider_type | family_doctor | unknown | low |
| real-04 | provider_type | family_doctor | unknown | low |
| real-06 | provider_type | family_doctor | unknown | low |

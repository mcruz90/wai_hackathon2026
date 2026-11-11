# Extraction evaluation

Run: 2026-11-11T17:10:05.312Z  
Provider: mock  
Model: offline keyword reader (not AI)  
File: eval/announcements.jsonl  
Announcements: 15 in the file, 15 scored, 0 failed to run

## Accuracy by field

| Field | Correct | Accuracy |
| --- | --- | --- |
| location | 5 of 15 | 33% |
| provider_type | 11 of 15 | 73% |
| languages | 14 of 15 | 93% |
| date | 13 of 15 | 87% |

Location is scored on the postal area (first 3 characters). Languages must match as a set. A null label means the right answer is to return null.

## Mistakes

| Announcement | Field | Expected | Got | Model confidence |
| --- | --- | --- | --- | --- |
| real-01 | provider_type | family_doctor | unknown | low |
| real-02 | location | M5A | null | low |
| real-03 | location | M6P | null | low |
| real-03 | provider_type | family_doctor | unknown | low |
| real-04 | location | M5T | null | low |
| real-05 | location | M5A | null | low |
| real-06 | provider_type | family_doctor | unknown | low |
| real-07 | location | M1P | null | low |
| real-08 | location | M5T | null | low |
| real-09 | location | M6M | null | low |
| real-09 | languages | Italian, Portuguese, Spanish, Hungarian, Arabic, English | English, Spanish, Arabic, Portuguese, Italian | high |
| real-10 | location | M6P | null | low |
| real-11 | location | M3N | null | low |
| real-11 | date | 2026-10-03 | null | low |
| real-12 | location | M6H | null | low |
| real-13 | date | 2026-10-13 | null | low |
| real-15 | provider_type | nurse_practitioner | family_doctor | low |

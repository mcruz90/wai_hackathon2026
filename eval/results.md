# Extraction evaluation

Run: 2026-11-11T16:03:34.700Z  
Provider: mock  
Model: offline keyword reader (not AI)  
Announcements: 3 in the file, 3 scored, 0 failed to run

## Accuracy by field

| Field | Correct | Accuracy |
| --- | --- | --- |
| location | 3 of 3 | 100% |
| provider_type | 3 of 3 | 100% |
| languages | 3 of 3 | 100% |
| date | 2 of 3 | 67% |

Location is scored on the postal area (first 3 characters). Languages must match as a set. A null label means the right answer is to return null.

## Mistakes

| Announcement | Field | Expected | Got | Model confidence |
| --- | --- | --- | --- | --- |
| ex-03 | date | 2026-11-03 | null | low |

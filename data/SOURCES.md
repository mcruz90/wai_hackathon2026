# Ontario postal-area representative points

`ontario-fsa.json` contains 527 Ontario forward sortation areas (FSA, the first three postal characters), their representative latitude/longitude, and place names.

Source: [GeoNames postal-code data](https://www.geonames.org/postal-codes/), licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Retrieved on November 11, 2026 through the [postalcodes-ca CA.tsv mirror at commit 90f65a0](https://github.com/verhovsky/postalcodes-ca/blob/90f65a0cb1ccbabd997122ac11adaa85f34c8cfd/CA.tsv). The mirror documents its GeoNames source and license in its README.

Changes: selected rows whose province is ON, kept FSA, latitude, longitude and place name, grouped repeated FSA rows by averaging their representative coordinates and joining their place names, sorted by FSA, and converted to JSON. The 530 Ontario source rows yield 527 distinct FSAs. Coordinates were checked against a broad Ontario bounding box. This is a snapshot, not an authoritative or current Canada Post address directory. Representative points are approximate; rural FSAs can be large. Distances are straight-line estimates, not travel distances. New/unlisted areas remain unsupported until the data is updated; the app must never substitute Toronto coordinates for them.

# Discovery starting URLs

`discovery-seeds.json` is a small catalog of public starting URLs, assembled on November 11, 2026 from the repository's existing evaluation source links and public web-search leads for Ottawa and Thunder Bay. Each record contains only a URL and a descriptive label. These are source-review leads, not verified accepting-patients listings. Sites may be closed to registrations, out of date, redirected, unavailable or unsuitable; a human must review them before monitoring. The seed does not fetch pages or enable trust and never overwrites prior review decisions. Adding a URL does not imply endorsement by, or affiliation with, its operator.

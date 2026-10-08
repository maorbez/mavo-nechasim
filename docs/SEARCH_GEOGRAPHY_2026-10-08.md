# Search geography — 2026-10-08

The public `looking.html` form uses the municipal catalog in
`assets/regions/neighborhood-catalog-2026-10-08.json`: 71 Tel Aviv-Yafo areas
and 16 Bat Yam areas. Scope is both full cities, including Jaffa and Tel Aviv
north of the Yarkon, as approved by the user on 2026-10-08.

The catalog contains municipal neighborhoods **and areas**, including parks,
employment districts, and the cemetery where the municipality's layer includes
them. Names and boundaries are not inferred from listing coordinates.

## Sources and identity

- Tel Aviv-Yafo: municipal GIS neighborhood layer, with the `ms_shchuna`
  source identifier retained as `tlv:<id>`.
- Bat Yam: [municipal GIS](https://v5.gis-net.co.il/v5/batyam), neighborhood
  layer 100, source `Id` retained as `batyam:<id>`.
- City identifiers: CBS municipality codes `5000` and `6200`.
- Every catalog record includes its exact source URL, original municipal name,
  geometry, source identifier and an interior label point. The catalog's
  `sources` section records the source retrieval details.
- Spelling aliases resolve to the same ID. Display punctuation is corrected
  only in `display_name`; original names remain unchanged for persistence.
- Searching פארק הים resolves to דרום חדש (`batyam:71`). The UI explicitly
  says this selects the entire municipal דרום חדש area; no separate Park
  Hayam polygon is invented.

## Selection and presentation

The city selector changes the visible neighborhood list and map while retaining
choices in the other city. Search is scoped to that visible city. Whole-city
selection replaces the city's individual selections. Removing a neighborhood
from a whole-city choice converts that choice to the remaining named areas.
Clearing all selections means no location restriction.

The map uses the existing keyless basemap, two-finger gestures, and attribution.
Official polygons and interior labels share the same selected state as the list
and chips. Labels that overlap are hidden until zooming reveals room for them;
their polygons remain selectable. If a future catalog record lacks a polygon,
its point must be visibly identified as a general area.

## Public intake contract

The existing write-only schema version remains `1`. `search` additionally sends:

```json
{
  "catalog_version": "2026-10-08",
  "locations": [
    {"city_id": "5000", "whole_city": false, "area_ids": ["tlv:39"]},
    {"city_id": "6200", "whole_city": true, "area_ids": []}
  ]
}
```

An empty `locations` array is unrestricted. For each entry, `whole_city: true`
requires empty `area_ids`; `false` requires at least one area belonging to that
city. All 87 official areas can be selected without the old twelve-area limit.
The browser also supplies readable `cities`/`areas` projections, which the server
rebuilds from canonical IDs rather than trusting them. Server persistence adds
the explicit whole-city area label (for example `בת ים (כל העיר)`).

The deployment must pair this frontend with the Office intake's catalog-aware
validator and city-scoped search matcher. Serving this frontend against the old
validator is not a complete deployment. No Office read capability or secret is
added to the browser. Existing consent, retry keys, deduplication and the
receipt-verified success condition remain in place.

## Verification boundary

The local test suite covers city switching, mixed whole-city/neighborhood scope,
removal, clear, aliases, canonical names versus display names, all 87 selections,
summary labels, and intake request serialization. Existing budget tests retain
the 4,999 / 5,000 / 5,001 boundaries.

Public deployment, synthetic Office persistence/readback, anonymous read denial,
and live browser QA must be recorded separately by the release owner. Unit tests
alone do not prove the server saved a request.

## Local verification performed on 2026-10-08

After the final alias merge, the catalog SHA-256 was
`fa23201caacec5e114ebb4b2eb325e343749ceff13746ef1af7f05b8ba0cea89`.
All 72 website tests passed. Both updated JavaScript files passed syntax checks,
and `git diff --check` passed.

The release owner exercised the actual local page through CUA at desktop
1280px and mobile 390px widths. City switching retained the earlier city's
selection; a Bat Yam map-label click updated the list and chip; removing the
chip deselected the map area. Selecting all Bat Yam replaced only the Bat Yam
area choices and retained the Tel Aviv selection. Searching `נווה צדק` found
the official `נוה צדק` entry. Multiple areas, removal, and map/list sync passed.
No horizontal overflow was observed at 390px or 375px. These are browser
viewport checks, not a physical phone test.

A separate local-only transport fixture served the same site, replacing only
the public intake endpoint in the served JavaScript. It did not change the
repository's endpoint or call Office. The release owner exercised:

1. A rent/residential search at 5,000 shekels, for Florentin plus all Bat Yam.
   The stub stored a synthetic record and dropped the first response. The page
   showed a connection error, not a success screen.
2. A double-click retry. The client sent one additional request with the same
   key, the stub reused the existing record, and the page received a success
   response after a one-second delay.
3. Adding another search: buy/commercial, 4,999 shekels, Bat Yam's דרום חדש.
   It produced a different key and a second separate synthetic record.

Independent fixture-file readback confirmed three attempts and two records,
with the second attempt deduplicated and the third using a new key. This proves
the local UI's disconnect/retry/busy/additional-search behavior against a test
transport. **It is not evidence of Office persistence or production delivery.**

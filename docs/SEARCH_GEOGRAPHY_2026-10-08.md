# Search geography — 2026-10-08

The public `looking.html` form uses the municipal catalog in
`assets/regions/neighborhood-catalog-2026-10-08.json`: 71 Tel Aviv-Yafo areas,
16 Bat Yam, 7 Givatayim, 36 Ramat Gan and 20 Holon. Scope is all five cities,
including Jaffa and Tel Aviv north of the Yarkon, as approved on 2026-10-08.
See the five-city expansion section below for the latest release state.

The catalog contains municipal neighborhoods **and areas**, including parks,
employment districts, and the cemetery where the municipality's layer includes
them. Names and boundaries are not inferred from listing coordinates.

## Sources and identity

- Tel Aviv-Yafo: municipal GIS neighborhood layer, with the `ms_shchuna`
  source identifier retained as `tlv:<id>`.
- Bat Yam: [municipal GIS](https://v5.gis-net.co.il/v5/batyam), neighborhood
  layer 100, source `Id` retained as `batyam:<id>`.
- City identifiers: CBS municipality codes `5000`, `6200`, `6300`, `8600`, `6600`.
- Every catalog record includes its exact source URL, original municipal name,
  geometry when publicly available, source identifier and a label point. The catalog's
  `sources` section records the source retrieval details.
- Spelling aliases resolve to the same ID. Display punctuation is corrected
  only in `display_name`; original names remain unchanged for persistence.
- Searching פארק הים resolves to דרום חדש (`batyam:71`). The UI explicitly
  says this selects the entire municipal דרום חדש area; no separate Park
  Hayam polygon is invented.

## Selection and presentation

The city selector changes the visible neighborhood list and map while retaining
choices in the other cities. Search is scoped to that visible city. Whole-city
selection replaces the city's individual selections. Removing a neighborhood
from a whole-city choice converts that choice to the remaining named areas.
Clearing all selections means no location restriction.

The map uses the existing keyless basemap, two-finger gestures, and attribution.
Official polygons and interior labels share the same selected state as the list
and chips. Labels that overlap are hidden until zooming reveals room for them;
their polygons remain selectable. Givatayim records lack public vector boundaries;
their municipality-sourced reference points are visibly identified as general areas.

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
city. All 150 official areas can be selected without the old twelve-area limit.
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
removal, clear, aliases, canonical names versus display names, all 150 selections,
summary labels, and intake request serialization. Existing budget tests retain
the 4,999 / 5,000 / 5,001 boundaries.

Public deployment, synthetic Office persistence/readback, anonymous read denial,
and live browser QA must be recorded separately by the release owner. Unit tests
alone do not prove the server saved a request.

## Production acceptance — 2026-10-08

The paired release is live: Pages commit `338538aac5accc00039a1fdbc8e4c3186acb13c3`
built at 07:25:30 UTC; Office runtime `9d24ae926eff6c8d2634bed061cceb872b707343`,
Railway deployment `e908f4c8-6692-43af-8a36-f35280939686` is `SUCCESS`.
All five public HTML/CSS/JS/catalog files match the committed bytes. The Office
release has 180 exact runtime file hashes, 74 unchanged settings and unchanged
original rows across eleven business/signing tables. SQLite integrity and foreign
keys are clean. Full suites: 1,948 Office tests and 72 website tests passed.

Four isolated actual intake submissions verified 4,999 rental as lead-only,
5,000/5,001 rental as active searches and purchase below the rental threshold as
active. Authenticated Office repeated readback confirmed exact city and area IDs,
three separate searches and receipt reuse without duplicates. Anonymous forms
CRM access returned 404, Office record access 403, and public phone lookup 405.

A fifth isolated request was submitted through the public browser at 390px:
rent, 5,000 ILS, Tel Aviv-Yafo `tlv:37` plus Bat Yam `batyam:61`. Its receipt and
canonical Office search were read twice with the same exact preferences. Updates
and marketing stayed off. All owned synthetic contacts/searches were recoverably
archived after verification; no customer messages were sent.

Live 1280px and 390px browser checks covered aliases, city switching, polygon-label
selection, map/list synchronization, whole-city selection, removal, clearing and
no horizontal overflow. Offline/retry/double-click behavior was tested through a
local transport fixture, separately from the successful real Office submissions.
Physical phone hardware and physical two-finger gestures were not tested.

The Office's existing flat text-area editor displays structured map selections
read-only to prevent loss of their city association; ordinary budget/other edits
preserve them. The existing permission-scoped API supports structured geographic
updates. A separate internal Office map picker is not part of this release.

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

## Five-city expansion — 2026-10-08 (prepared; live acceptance pending)

The user's additive request adds Givatayim (6300, 7), Ramat Gan (8600, 36),
and Holon (6600, 20): 150 selectable municipal neighborhoods/areas across five
cities. The original 87 entries, two city records and catalog version are unchanged.
Keeping version 2026-10-08 preserves existing receipt fingerprints; this is an
additive coverage revision, not a redefinition of an existing saved ID.

Ramat Gan uses official layer20 OBJECTID (ramatgan:1–36); its semantic no field
has two zero values and cannot identify a unique area. Keep municipal_neighborhood_no
as provenance and reconcile IDs explicitly on future source republishing. Holon
uses current municipal layer48 zone_num (holon:1–20). Combined official districts
remain combined, with supported name aliases; no artificial subdivisions.

Givatayim publishes seven neighborhood/communication areas, identified by its
resident subscription subject IDs14–20. Its public GIS metadata exposes52 layers
but no neighborhood boundary layer. The form therefore uses7 general-area
reference points published by the municipality, with permanent explanatory copy,
dashed labels and no fabricated polygons. These are reference places, not exact
centroids or a claim to cover every historical project nickname as a separate area.

City switching retains every other city's selections. Existing design, request
contract, consent, permissions, deduplication and separate-search behavior remain.
All150 selections fit the unchanged16KiB public request cap (6,646-byte browser
fixture including maximum-size Hebrew name and four amenities).

Sources: [Givatayim neighborhoods](https://www.givatayim.muni.il/שכונות-ורובעי-העיר/),
[Givatayim official registry](https://www.givatayim.muni.il/toshav-center/register/),
[Ramat Gan municipal GIS](https://v5.gis-net.co.il/v5/ramat_gan),
[Ramat Gan engineering](https://handasa.ramat-gan.muni.il/),
[Holon municipal maps](https://www.holon.muni.il/HolonCity/pages/maps.aspx),
[Holon GIS](https://v5.gis-net.co.il/v5/Holon). Retrieval date is not a source-update date.

### Added names, by city

**גבעתיים**

רמב"ם, ארלוזורוב, בורוכוב, ההסתדרות ודרום העיר, פועלי הרכבת, שינקין, קריית יוסף.

**רמת גן**

קריית קריניצי, שיכון צנחנים, קריית בורוכוב, יד לבנים, הבורסה, חרוזים, איצטדיון, נחלת גנים, עליות, הלל, תל השומר, שיכון ותיקים, גפן, תל בנימין, מתחם נגבה, רמת עמידר, נווה רם, בר אילן, תל גנים, פארק לאומי, רמת שקמה, כפר אז״ר, גני מרום, מרום נווה, אזור הבילויים, גבעת גאולה, רמת חן, נווה יהושע, תל יהודה, ראשונים, רמת אפעל, בן גוריון, מרכז העיר, יהלום, חשמונאים, רמת צדק.

**חולון**

תל גיבורים, גרין ועם, אגרובנק, נאות רחל, קרית עבודה, רסקו א', מפדה אזרחי, נאות שושנים, רסקו ב', נאות יהודית ונווה ארזים, אזור התעשיה, נווה רמז, שיכון ותיקים, קרית אילון, קרית שרת מערב, קרית שרת מזרח, ג'סי כהן וקרית מיכה, קרית רבין, קרית בן גוריון, מולדת - דרום חולון.

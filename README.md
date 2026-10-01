# ocl-cache

Properties derived from a structure — idCode, noStereoID, tautomer ids, logP,
logS, surface area, substructure index — computed once with OpenChemLib and
cached in SQLite, so they are read back thereafter.

Running at [ocl-cache.cheminfo.org](https://ocl-cache.cheminfo.org).

## The pages

| Address       | What it is                                                       |
| ------------- | ---------------------------------------------------------------- |
| `/`           | the tool: look a molecule up, or search the cache for a fragment |
| `/statistics` | what the whole database holds, and when it arrived               |
| `/about`      | what it is built on, how to cite it, and its licence             |
| `/docs`       | the API, documented interactively                                |

## API

Every route lives under `/v1`.

| Route                 | Query                                  | Returns                                     |
| --------------------- | -------------------------------------- | ------------------------------------------- |
| `GET /v1/lookup`      | `q`, `kind?`, `cacheOnly?`             | one molecule, in any of the three notations |
| `POST /v1/batch`      | body: `queries`, `kind?`, `cacheOnly?` | many molecules in one request               |
| `GET /v1/stats`       | —                                      | the figures the statistics page draws       |
| `GET /v1/fromSmiles`  | `smiles`                               | molecule information for a SMILES           |
| `GET /v1/fromMolfile` | `molfile`                              | molecule information for a molfile          |
| `GET /v1/fromIDCode`  | `idCode`                               | molecule information for an OCL idCode      |
| `GET /health`         | —                                      | `{"status":"ok"}`                           |

```sh
curl 'https://ocl-cache.cheminfo.org/v1/lookup?q=CCOCC'
```

`q` is read as a molfile when it carries a counts line, as an idCode when it
writes itself back unchanged, and as a SMILES otherwise; `kind` says so
explicitly. A molecule that is not cached is computed on the spot and returned
— unless `cacheOnly` is set, which makes a miss return nothing. The row is
written a moment later, by a thread of its own, so an answer never waits on the
database's write lock.

### Many at once

`POST /v1/batch` takes up to 1000 queries and answers each on its own, so one
string that is not a molecule reports its error and leaves the rest alone. A
structure the batch names twice — under two spellings, even — is computed once.

```sh
curl -X POST https://ocl-cache.cheminfo.org/v1/batch \
  -H 'content-type: application/json' \
  -d '{"queries": ["CCOCC", "c1ccccc1", "gJQ@@eKU@@"]}'
```

```json
{
  "results": [
    {
      "query": "CCOCC",
      "result": { "idCode": "gJQ@@eKU@@", "mf": "C4H10O" },
      "cached": true,
      "kind": "smiles"
    }
  ],
  "summary": { "total": 3, "cached": 2, "computed": 1, "failed": 0 }
}
```

### Browsing and searching by structure

`GET /v1/search` pages through the cache, narrowed by structure, by property, or
by both. With no `q` it browses everything, newest last.

```sh
curl 'https://ocl-cache.cheminfo.org/v1/search?q=c1ccccc1&mode=substructure&limit=24'
curl 'https://ocl-cache.cheminfo.org/v1/search?mwMin=100&mwMax=250&donorsMax=2'
```

| Parameter                | Meaning                                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `q`, `kind`              | the structure to match; absent, everything is browsed                                                                                   |
| `mode`                   | `substructure`, `similarity`, `exact`, `exactNoStereo`, `exactNoStereoTautomer`                                                         |
| `limit`, `cursor`        | the page size (24, at most 96) and where the page starts                                                                                |
| `mf`                     | one exact molecular formula                                                                                                             |
| `<name>Min`, `<name>Max` | bounds on `mw`, `em`, `logP`, `logS`, `psa`, `acceptors`, `donors`, `rotatable`, `stereocentres`, `fragments`, `charge`, `unsaturation` |

A property filter is applied as the candidate set a structure scan is restricted
to, never to its results: the whole cost of a scan is the candidates it reads.

**It never counts.** `COUNT(*)` here is a walk of 150 million rows, so a browse
answers "is there another page" by reading one row more than it was asked for,
and `total` is null. A structure scan reports what it matched within its own
bound. Pagination is a cursor on the rowid rather than an offset, because
`OFFSET` makes SQLite walk and discard everything before the page.

### The structure keys

Every answer carries three 64-bit keys beside the idCodes they belong to, each
as the 16 hex digits a JSON number could not hold:

| Field                  | What it identifies                                                |
| ---------------------- | ----------------------------------------------------------------- |
| `hash`                 | the row's own idCode — the key the cache is looked up by          |
| `noStereoHash`         | the compound up to stereochemistry: both enantiomers key the same |
| `noStereoTautomerHash` | the compound up to stereochemistry and tautomerism as well        |

They are OpenChemLib's own hashes, so they are the values any other OpenChemLib
build computes for the same structure. Each is the hash of the canonical idCode
in the column next to it, computed from it in one pass rather than by canonizing
twice.

`hash` is not chemistry: it is the hasher run over the idCode's characters, which
needs no molecule and costs about 1.3 µs. That is what lets a presence check
happen on the thread serving the request, and what lets the table be probed
through an 8-byte integer index rather than a 40-byte text one. It is not unique
— two idCodes share one once in 2^64 — so every read seeks on it and confirms the
idCode in the same statement.

`noStereoTautomerHash` is null when the molecule has none: either OpenChemLib
could not read it, or its tautomer enumeration reached the 5000-tautomer ceiling
and the generic form it had reached is not canonical. `failedTautomerID` says so
too. The ceiling is a work bound and not a clock, so the same molecule reaches it
on every machine and two hosts filling one cache agree about what a compound is.

### Sharing and embedding

| Parameter | Meaning                                                                                 |
| --------- | --------------------------------------------------------------------------------------- |
| `embed`   | drop the site chrome, so the page can be framed in another site                         |
| `hide`    | comma-separated features to switch off: `pages`, `structure`, `identifiers`, `examples` |

```html
<iframe
  src="https://ocl-cache.cheminfo.org/?embed=1&hide=pages,identifiers"
  width="100%"
  height="700"
  style="border: 1px solid #ddd; border-radius: 8px"
  title="ocl-cache — molecule lookup"
></iframe>
```

An unknown `hide` key is ignored, so a link written before a feature was
renamed still opens.

## Statistics

`/v1/stats` reads **one row**, so the page costs the same whether the cache
holds two million molecules or two hundred million. Measured against a 2M-row
database: 0.038 ms for the whole route body, and the stored rollup is a fixed
8.5 KB whatever the cache has grown to. The molecule count beside it is live and
free — no row is ever deleted, so the rowids run `1..n` and the last one is the
count, which SQLite answers by seeking one end of the b-tree.

The figures behind it come from the `refresh-stats` service, never from a
request. The table is only ever appended to, so a pass normally reads just the
molecules that arrived since the last one and adds them to what was already
counted — every histogram, count and total is additive. Measured on 2M rows:

| pass                        | reads                | time                |
| --------------------------- | -------------------- | ------------------- |
| incremental (the usual one) | 50 000 new molecules | **0.18 s**          |
| full                        | all 2 000 000        | 12.5 s (6.3 µs/row) |

Only three figures cannot be added to — the two distinct counts and the formula
ranking, which have to see every row. They are carried forward between full
passes, so they are refreshed on `STATS_FULL_INTERVAL` (daily) rather than on
every pass. At two hundred million molecules a full pass is around twenty
minutes; set it weekly if that is too often.

A full pass sorts every id in the table. SQLite is told to spill that sort to
`$DATA_DIR/tmp` rather than hold it: in memory it costs ~21 bytes per distinct
value — over four gigabytes at two hundred million, more than the container is
given — and spilled it costs ~3 bytes and runs faster.

**Molecules cached before release 2.0 carry no date**, because the column did
not exist. They are counted apart on the statistics page rather than folded into
a month they may not belong to; everything cached since carries the day it
arrived.

## Bulk import

Drop `.sdf` (optionally gzipped or zipped) files into `data/sdf/to_process`, or
SMILES files into `data/smiles/to_process`. The `process-sdf` service picks them
up, appends every new molecule to the cache, and moves the file to `processed`.

## The search index

Substructure, similarity and identity search run off a second database,
`data/sqlite/search.sqlite`, holding the fingerprint index and the two identity
hashes. **The cache's own schema is never touched**: nothing is added to
`molecules`, so bringing search up needs no migration over 150 million rows and
no window during which the API cannot answer.

The `index-molecules` service fills it and keeps it filled. It starts with the
stack and needs no operator action; `docker compose logs -f index-molecules`
shows its progress. The index can be deleted and rebuilt — or built on another
machine and copied in — without the cache noticing.

It adds molecules the index does not hold yet, then hashes them. The
fingerprints go first and completely, because they are what a substructure
search needs; the hashes only answer the two identity modes and cost two orders
of magnitude more per molecule.

The fingerprint is read out of the cache rather than recomputed: every row has
carried its `ssIndex` since the first release. Measured over real idcodes, that
is **88 µs a molecule against 1350** — under four hours against fifty-six at 150
million.

Measured over 400 000 indexed entries on eight threads, the first page of a
substructure search costs 4–49 ms whatever the table size, because it stops at
the end of the chunk that reached the limit. An exhaustive scan is 25 minutes to
3.6 hours at 150 million depending on how common the fragment is, which is why
no route offers one.

## Environment

| Variable              | Default                       | Meaning                                                                                                                                                  |
| --------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                | `20822`                       | port the API listens on; the Vite dev server sits one above it                                                                                           |
| `DATA_DIR`            | `<repo>/data`                 | holds `sqlite/` and the import queues                                                                                                                    |
| `TRACKING_SCRIPT`     | unset                         | audience-measurement snippet, injected verbatim at the end of the served page's `<head>`; unset loads nothing, so a dev run tracks nothing               |
| `SITE_URL`            | unset                         | where the site is served from, written into every canonical link and sitemap entry; unset uses the request's host                                        |
| `STATS_INTERVAL`      | `21600000`                    | milliseconds between two statistics passes                                                                                                               |
| `INDEX_LIMIT`         | `500000`                      | molecules the `index-molecules` service adds per window                                                                                                  |
| `INDEX_INTERVAL`      | `10000`                       | milliseconds it pauses between two windows that still had work                                                                                           |
| `INDEX_IDLE_INTERVAL` | `60000`                       | milliseconds it waits before looking again once everything is indexed                                                                                    |
| `INDEX_HASHES`        | `true`                        | set `false` to index fingerprints only, leaving the two identity modes empty                                                                             |
| `TRUST_PROXY`         | unset (`false`)               | proxies whose `X-Forwarded-For` is believed: an address, a CIDR, a comma-separated list, or a hop count                                                  |
| `WORKER_THREADS`      | the container's CPU allowance | openchemlib worker threads per service; a cgroup hides the real quota from `/proc/cpuinfo`, so an unbounded pool is killed for reaching the memory limit |
| `IMAGE_NAME`          | `ghcr.io/cheminfo/ocl-cache`  | image the compose files run                                                                                                                              |
| `IMAGE_TAG`           | `latest`                      | rewritten by the server's deploy script — never edit by hand                                                                                             |
| `TUNNEL_TOKEN`        | —                             | Cloudflare Tunnel token, cloudflared mode only                                                                                                           |

## Deployment

```sh
cp .env.example .env
# uncomment exactly one COMPOSE_FILE line in .env
docker compose up -d
```

`docker compose pull && docker compose up -d` runs the released image;
`docker compose up -d --build` builds from the current checkout.

Three modes, selected by `COMPOSE_FILE` in `.env`:

- **`compose.yaml`** (default) — publishes `PORT` on the host loopback.
- **`compose.traefik.yaml`** — no published port; the host must already run
  Traefik on an external Docker network named `traefik`, with a `websecure`
  entrypoint and a `letsencrypt` cert resolver. Adjust the `Host(...)` label to
  your hostname (default `ocl-cache.cheminfo.org`).
- **`compose.cloudflared.yaml`** — no published port; a `cloudflared` sidecar
  fronts the service. In the Cloudflare dashboard: Networking → Tunnels → Create
  a tunnel → Cloudflared connector → copy the token into `.env` as
  `TUNNEL_TOKEN` → open the tunnel → Published applications → add an application
  with Service `HTTP`, URL `ocl-cache:20822`, hostname `ocl-cache.lactame.com`.

Each mode runs three services off the one image: the server, `process-sdf` for
the import queues, and `refresh-stats` for the figures. The database and the
queues are bind-mounted from `./data`.

> **Upgrading from 1.1.x** — the database moved from `./sqlite/db.sqlite` to
> `./data/sqlite/db.sqlite`. Run `mkdir -p data/sqlite && mv sqlite/db.sqlite*
data/sqlite/` once before starting the new image.

## Local development

```sh
npm install
npm run dev
```

The backend listens on `PORT` (20822 by default) and the Vite dev server on
`PORT + 1`, proxying `/v1` to the backend — so the tool is at
`http://localhost:20823` and the documentation at
`http://localhost:20822/docs`.

Requires Node.js ≥ 22.13, which is the first release exposing `node:sqlite`
unflagged — there is no native module to compile.

```sh
npm run test        # tests, types, tokens, deploy contract, lint, format, e2e
npm run test-only   # unit tests with coverage, both workspaces
npm run test-e2e    # the Playwright suite, against the built page
```

## License

[MIT](./LICENSE)

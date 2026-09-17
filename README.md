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

| Route                 | Query                      | Returns                                     |
| --------------------- | -------------------------- | ------------------------------------------- |
| `GET /v1/lookup`      | `q`, `kind?`, `cacheOnly?` | one molecule, in any of the three notations |
| `GET /v1/stats`       | —                          | the figures the statistics page draws       |
| `GET /v1/fromSmiles`  | `smiles`                   | molecule information for a SMILES           |
| `GET /v1/fromMolfile` | `molfile`                  | molecule information for a molfile          |
| `GET /v1/fromIDCode`  | `idCode`                   | molecule information for an OCL idCode      |
| `GET /health`         | —                          | `{"status":"ok"}`                           |

```sh
curl 'https://ocl-cache.cheminfo.org/v1/lookup?q=CCOCC'
```

`q` is read as a molfile when it carries a counts line, as an idCode when it
writes itself back unchanged, and as a SMILES otherwise; `kind` says so
explicitly. A molecule that is not cached is computed on the spot, stored and
returned — unless `cacheOnly` is set, which makes a miss return nothing.

The cache answers for one molecule at a time. It deliberately offers no query
that walks the whole table: the `ssIndex` columns are kept for a future
substructure screen, and nothing exposes them over HTTP.

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

## Environment

| Variable          | Default                      | Meaning                                                                                                                                    |
| ----------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `PORT`            | `20822`                      | port the API listens on; the Vite dev server sits one above it                                                                             |
| `DATA_DIR`        | `<repo>/data`                | holds `sqlite/` and the import queues                                                                                                      |
| `TRACKING_SCRIPT` | unset                        | audience-measurement snippet, injected verbatim at the end of the served page's `<head>`; unset loads nothing, so a dev run tracks nothing |
| `SITE_URL`        | unset                        | where the site is served from, written into every canonical link and sitemap entry; unset uses the request's host                          |
| `STATS_INTERVAL`  | `21600000`                   | milliseconds between two statistics passes                                                                                                 |
| `TRUST_PROXY`     | unset (`false`)              | proxies whose `X-Forwarded-For` is believed: an address, a CIDR, a comma-separated list, or a hop count                                    |
| `IMAGE_NAME`      | `ghcr.io/cheminfo/ocl-cache` | image the compose files run                                                                                                                |
| `IMAGE_TAG`       | `latest`                     | rewritten by the server's deploy script — never edit by hand                                                                               |
| `TUNNEL_TOKEN`    | —                            | Cloudflare Tunnel token, cloudflared mode only                                                                                             |

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

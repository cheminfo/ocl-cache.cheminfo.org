# ocl-cache

Cache derived molecule properties — idCode, noStereoID, tautomer ids, logP, logS,
surface area, substructure index — in a SQLite database, so they are computed
once and read back thereafter.

Running at [ocl-cache.cheminfo.org](https://ocl-cache.cheminfo.org).

## API

Every route lives under `/v1`. Interactive documentation is at `/docs`.

| Route                 | Query     | Returns                                |
| --------------------- | --------- | -------------------------------------- |
| `GET /v1/fromSmiles`  | `smiles`  | molecule information for a SMILES      |
| `GET /v1/fromMolfile` | `molfile` | molecule information for a molfile     |
| `GET /v1/fromIDCode`  | `idCode`  | molecule information for an OCL idCode |
| `GET /health`         | —         | `{"status":"ok"}`                      |

```sh
curl 'https://ocl-cache.cheminfo.org/v1/fromSmiles?smiles=CCOCC'
```

A molecule that is not yet cached is computed on the spot, stored, and returned.

## Bulk import

Drop `.sdf` (optionally gzipped or zipped) files into `data/sdf/to_process`, or
SMILES files into `data/smiles/to_process`. The `process-sdf` service picks them
up, appends every new molecule to the cache, and moves the file to `processed`.

## Environment

| Variable       | Default                      | Meaning                                                                                                 |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| `PORT`         | `20822`                      | port the API listens on                                                                                 |
| `DATA_DIR`     | `<repo>/data`                | holds `sqlite/` and the import queues                                                                   |
| `TRUST_PROXY`  | unset (`false`)              | proxies whose `X-Forwarded-For` is believed: an address, a CIDR, a comma-separated list, or a hop count |
| `IMAGE_NAME`   | `ghcr.io/cheminfo/ocl-cache` | image the compose files run                                                                             |
| `IMAGE_TAG`    | `latest`                     | rewritten by the server's deploy script — never edit by hand                                            |
| `TUNNEL_TOKEN` | —                            | Cloudflare Tunnel token, cloudflared mode only                                                          |

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

The database and the import queues are bind-mounted from `./data`.

> **Upgrading from 1.1.x** — the database moved from `./sqlite/db.sqlite` to
> `./data/sqlite/db.sqlite`. Run `mkdir -p data/sqlite && mv sqlite/db.sqlite*
data/sqlite/` once before starting the new image.

## Local development

```sh
npm install
npm run dev
```

The server reads `PORT` from the environment and defaults to `20822`, so
`http://localhost:20822/docs` serves the documentation.

Requires Node.js ≥ 22.13, which is the first release exposing `node:sqlite`
unflagged — there is no native module to compile.

```sh
npm run test        # tests, type-check, eslint, prettier
npm run test-only   # tests with coverage
```

## License

[MIT](./LICENSE)

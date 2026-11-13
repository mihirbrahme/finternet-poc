# Optional integration workbench

The active sponsorship application runs with `pnpm demo:run`. It starts and owns its own Anvil chain on port 18545; it does not need Docker, PostgreSQL, MinIO, IPFS or a copied `.env` file.

The root `docker-compose.yml` is retained as a future-integration workbench for persistent data, private evidence storage and public-metadata experiments. These containers are not connected to the current app.

| Service | Port | Intended integration |
|---|---|---|
| PostgreSQL | 5432 | Future persistent repositories and operation journal |
| MinIO | 9000 / 9001 | Future private evidence storage and console |
| Anvil | 8545 | Separate integration chain; not the application's chain |
| Kubo IPFS | 5001 / 8080 | Optional non-sensitive metadata experiments |

From repository root:

```powershell
docker compose up -d
docker compose ps
docker compose down
```

Optional `.env.example` workbench values can be copied and adjusted for local development. Do not use sample credentials for hosted services. `docker compose down` preserves volumes; no volume deletion is needed to stop the workbench.

Use the [Vartul product document](../../../docs/product/Vartul_Product_Document.md) (architecture, operations and readiness gates) for the required adapters, migrations, authorisation and operations before claiming these dependencies are integrated.

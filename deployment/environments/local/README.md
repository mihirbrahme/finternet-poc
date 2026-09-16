# Local Environment

This environment is the Packet 1 workbench for the Finternet PoC. It starts only shared local dependencies needed by later packets. It does not create application services, contracts, schemas, UI apps, Beckn nodes or AI agents.

## Dependency Modes

| Dependency | Local mode | Notes |
|---|---|---|
| Ethereum | `LOCAL_MOCK` | Anvil local EVM on `http://localhost:8545`. |
| PostgreSQL | `LOCAL_MOCK` | Local development database on `localhost:5432`. |
| Object Storage | `LOCAL_MOCK` | MinIO S3-compatible storage on `http://localhost:9000`. |
| IPFS | `LOCAL_MOCK` | Local Kubo node exposed as `mock-ipfs`; replaceable with a pinning provider later. |
| Beckn | `SANDBOX_ADAPTER` | Not started in Packet 1. Packet 6 will add Beckn-shaped adapters. |
| VC Issuer | `NOT_CONNECTED` | Demo issuer arrives in the trusted participant slice. |
| Smart Account Provider | `NOT_CONNECTED` | Adapter boundary arrives in the trusted participant slice. |
| OBP Registry | `NOT_CONNECTED` | The PoC records OBP-ready evidence claims only, not official credits. |
| EPR/Government Reference | `NOT_CONNECTED` | Reference-only until an authorised integration exists. |

## Start

From the repository root:

```bash
docker compose up -d
```

## Check Status

```bash
docker compose ps
```

Optional checks when the related CLIs are installed:

```bash
docker compose exec postgres pg_isready -U finternet -d finternet_poc
curl http://localhost:9000/minio/health/live
cast chain-id --rpc-url http://localhost:8545
curl http://localhost:5001/api/v0/version -X POST
```

Expected local endpoints:

| Service | Endpoint |
|---|---|
| PostgreSQL | `localhost:5432` |
| MinIO API | `http://localhost:9000` |
| MinIO Console | `http://localhost:9001` |
| Anvil RPC | `http://localhost:8545` |
| IPFS API | `http://localhost:5001` |
| IPFS Gateway | `http://localhost:8080` |

## Stop

```bash
docker compose down
```

To remove local Docker volumes as well:

```bash
docker compose down -v
```

## Notes

- Named Docker volumes are used so local runtime data is not written into the repository.
- The `.env.example` file documents the environment variables expected by later services. Packet 1 does not require a copied `.env` file.
- OBP language must remain precise: this environment can support an OBP-ready evidence claim workflow later, but it does not connect to an official OBP certification registry.

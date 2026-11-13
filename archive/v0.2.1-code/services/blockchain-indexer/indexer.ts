import type { ExplorerTokenReadModel, IndexedEvent } from "./types.js";

export class InMemoryBlockchainIndexer {
  private readonly readModels = new Map<string, ExplorerTokenReadModel>();
  private readonly events: IndexedEvent[] = [];

  index(event: IndexedEvent): ExplorerTokenReadModel | undefined {
    this.events.push(event);

    if (event.type === "AssetMinted") {
      const existing = this.readModels.get(event.tokenId);
      const model: ExplorerTokenReadModel = {
        assetId: event.assetId,
        tokenId: event.tokenId,
        totalSupply: (existing?.totalSupply ?? 0) + event.quantity,
        balances: {
          ...(existing?.balances ?? {}),
          [event.to]: (existing?.balances[event.to] ?? 0) + event.quantity
        },
        lockedBalances: existing?.lockedBalances ?? {},
        metadataUri: event.metadataUri,
        evidenceRoot: event.evidenceRoot,
        mintTxHash: existing?.mintTxHash ?? event.txHash,
        lastTxHash: event.txHash,
        dependencyMode: "LOCAL_MOCK"
      };
      this.readModels.set(event.tokenId, model);
      return model;
    }

    const model = this.requireModel(event.tokenId);
    model.lastTxHash = event.txHash;

    if (event.type === "TransferSingle") {
      if (event.from !== "0x0000000000000000000000000000000000000000") {
        model.balances[event.from] = (model.balances[event.from] ?? 0) - event.quantity;
      }
      model.balances[event.to] = (model.balances[event.to] ?? 0) + event.quantity;
      return model;
    }

    if (event.type === "AssetLocked") {
      model.lockedBalances[event.owner] = (model.lockedBalances[event.owner] ?? 0) + event.quantity;
      return model;
    }

    if (event.type === "AssetUnlocked") {
      model.lockedBalances[event.owner] = (model.lockedBalances[event.owner] ?? 0) - event.quantity;
      return model;
    }

    return model;
  }

  indexMany(events: IndexedEvent[]): ExplorerTokenReadModel[] {
    return events
      .map((event) => this.index(event))
      .filter((model): model is ExplorerTokenReadModel => Boolean(model));
  }

  getToken(tokenId: string): ExplorerTokenReadModel | undefined {
    const model = this.readModels.get(tokenId);
    return model ? cloneModel(model) : undefined;
  }

  getAsset(assetId: string): ExplorerTokenReadModel | undefined {
    const model = [...this.readModels.values()].find((candidate) => candidate.assetId === assetId);
    return model ? cloneModel(model) : undefined;
  }

  listTokens(): ExplorerTokenReadModel[] {
    return [...this.readModels.values()].map(cloneModel);
  }

  listEvents(): IndexedEvent[] {
    return [...this.events];
  }

  private requireModel(tokenId: string): ExplorerTokenReadModel {
    const model = this.readModels.get(tokenId);
    if (!model) {
      throw new Error(`Cannot index event before mint for token: ${tokenId}`);
    }
    return model;
  }
}

function cloneModel(model: ExplorerTokenReadModel): ExplorerTokenReadModel {
  return {
    ...model,
    balances: { ...model.balances },
    lockedBalances: { ...model.lockedBalances }
  };
}

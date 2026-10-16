import mongoose, { Types } from 'mongoose';
import { IGiftEntity, IGiftTransferEntity, SEED_GIFTS } from '../../../domain/entities/Gift';
import { IGiftRepository } from '../../../domain/repositories/GiftRepository';
import { GiftModel, GiftTransferModel, IGiftDocument, IGiftTransferDocument } from '../mongoose/GiftModel';

function toDbId(id?: string): Types.ObjectId | string | undefined {
  if (!id) return undefined;
  if (Types.ObjectId.isValid(id) && id.length === 24 && !id.includes('-')) {
    return new Types.ObjectId(id);
  }
  return id;
}

export class MongooseGiftRepository implements IGiftRepository {
  private inMemoryGifts = new Map<string, IGiftEntity>();
  private inMemoryTransfers: IGiftTransferEntity[] = [];

  constructor() {
    for (const g of SEED_GIFTS) {
      this.inMemoryGifts.set(g.slug, { ...g });
    }
  }

  public clearInMemoryStore(): void {
    this.inMemoryTransfers = [];
    this.inMemoryGifts.clear();
    for (const g of SEED_GIFTS) {
      this.inMemoryGifts.set(g.slug, { ...g });
    }
  }

  private mapGift(doc: IGiftDocument): IGiftEntity {
    return {
      id: doc._id.toString(),
      name: doc.name,
      slug: doc.slug,
      coinPrice: doc.coin_price,
      creatorEarningPaise: doc.creator_earning_paise,
      platformFeePaise: doc.platform_fee_paise,
      iconUrl: doc.icon_url,
      animationUrl: doc.animation_url,
      isActive: doc.is_active,
      displayOrder: doc.display_order,
    };
  }

  private mapTransfer(doc: IGiftTransferDocument, slug: string = ''): IGiftTransferEntity {
    return {
      id: doc._id.toString(),
      giftId: doc.gift_id.toString(),
      giftSlug: slug,
      senderId: doc.sender_id.toString(),
      recipientId: doc.recipient_id.toString(),
      matchSessionId: doc.match_id ? doc.match_id.toString() : undefined,
      coinsSpent: doc.coins_spent,
      creatorEarningsPaise: doc.creator_earnings_paise,
      platformFeePaise: doc.platform_fee_paise,
      createdAt: doc.created_at,
    };
  }

  async listActiveGifts(): Promise<IGiftEntity[]> {
    if (mongoose.connection.readyState === 1) {
      const docs = await GiftModel.find({ is_active: true }).sort({ display_order: 1 });
      if (docs.length > 0) {
        return docs.map((d) => this.mapGift(d));
      }
    }
    return Array.from(this.inMemoryGifts.values())
      .filter((g) => g.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async findBySlug(slug: string): Promise<IGiftEntity | null> {
    if (mongoose.connection.readyState === 1) {
      const doc = await GiftModel.findOne({ slug });
      if (doc) return this.mapGift(doc);
    }
    return this.inMemoryGifts.get(slug) || null;
  }

  async recordTransfer(
    transfer: Omit<IGiftTransferEntity, 'id' | 'createdAt'>
  ): Promise<IGiftTransferEntity> {
    if (mongoose.connection.readyState === 1) {
      const doc = await GiftTransferModel.create({
        gift_id: toDbId(transfer.giftId),
        sender_id: toDbId(transfer.senderId),
        recipient_id: toDbId(transfer.recipientId),
        match_id: toDbId(transfer.matchSessionId),
        coins_spent: transfer.coinsSpent,
        creator_earnings_paise: transfer.creatorEarningsPaise,
        platform_fee_paise: transfer.platformFeePaise,
      });
      return this.mapTransfer(doc, transfer.giftSlug);
    }

    const created: IGiftTransferEntity = {
      id: `gtx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...transfer,
      createdAt: new Date(),
    };
    this.inMemoryTransfers.push(created);
    return created;
  }
}

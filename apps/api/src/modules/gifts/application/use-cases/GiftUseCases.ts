import { IGiftEntity, IGiftTransferEntity } from '../../domain/entities/Gift';
import { CannotGiftSelfError, GiftNotFoundError } from '../../domain/errors/GiftErrors';
import { IGiftRepository } from '../../domain/repositories/GiftRepository';
import { IWalletRepository } from '../../../wallet/domain/repositories/WalletRepository';
import { WalletUseCases } from '../../../wallet/application/use-cases/WalletUseCases';
import { env } from '../../../../config/env';

export class GiftUseCases {
  constructor(
    private readonly giftRepository: IGiftRepository,
    private readonly walletUseCases: WalletUseCases,
    private readonly walletRepository: IWalletRepository
  ) {}

  async listGifts(): Promise<IGiftEntity[]> {
    const rawGifts = await this.giftRepository.listActiveGifts();
    const commission = env.PLATFORM_COMMISSION_GIFT;
    return rawGifts.map((g) => {
      const totalValuePaise = g.coinPrice * 100;
      const platformFeePaise = Math.round(totalValuePaise * (commission / 100));
      const creatorEarningPaise = totalValuePaise - platformFeePaise;
      return {
        ...g,
        platformFeePaise,
        creatorEarningPaise,
      };
    });
  }

  async sendGift(
    senderId: string,
    recipientId: string,
    giftSlug: string,
    matchSessionId?: string
  ): Promise<{
    transfer: IGiftTransferEntity;
    gift: IGiftEntity;
    remainingCoins: number;
  }> {
    if (senderId === recipientId) {
      throw new CannotGiftSelfError();
    }

    const rawGift = await this.giftRepository.findBySlug(giftSlug);
    if (!rawGift || !rawGift.isActive) {
      throw new GiftNotFoundError(giftSlug);
    }

    // Dynamic platform commission deduction logic from env
    const commission = env.PLATFORM_COMMISSION_GIFT;
    const totalValuePaise = rawGift.coinPrice * 100;
    const platformFeePaise = Math.round(totalValuePaise * (commission / 100));
    const creatorEarningPaise = totalValuePaise - platformFeePaise;

    const gift: IGiftEntity = {
      ...rawGift,
      platformFeePaise,
      creatorEarningPaise,
    };

    const idempotencyKey = `gift_send_${senderId}_${recipientId}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 6)}`;

    // 1. Debit sender's purchased coins
    const debitResult = await this.walletUseCases.debitCoins(
      senderId,
      gift.coinPrice,
      'GIFT_SENT_DEBIT',
      idempotencyKey,
      'GIFT',
      gift.id,
      {
        recipientId,
        giftSlug: gift.slug,
        giftName: gift.name,
      }
    );

    // 2. Credit recipient's wallet with earnings after deducting platform commission
    await this.walletRepository.creditEarningsPaise(
      recipientId,
      creatorEarningPaise,
      `recv_${idempotencyKey}`,
      'GIFT',
      gift.id,
      {
        senderId,
        giftSlug: gift.slug,
        giftName: gift.name,
        platformCommissionPercentage: commission,
        platformFeePaise,
      }
    );

    // 3. Record audit transfer
    const transfer = await this.giftRepository.recordTransfer({
      giftId: gift.id,
      giftSlug: gift.slug,
      senderId,
      recipientId,
      matchSessionId,
      coinsSpent: gift.coinPrice,
      creatorEarningsPaise: creatorEarningPaise,
      platformFeePaise,
    });

    return {
      transfer,
      gift,
      remainingCoins: debitResult.wallet.purchasedCoinsBalance,
    };
  }
}

import { IGiftEntity, IGiftTransferEntity } from '../../domain/entities/Gift';
import { CannotGiftSelfError, GiftNotFoundError } from '../../domain/errors/GiftErrors';
import { IGiftRepository } from '../../domain/repositories/GiftRepository';
import { IWalletRepository } from '../../../wallet/domain/repositories/WalletRepository';
import { WalletUseCases } from '../../../wallet/application/use-cases/WalletUseCases';

export class GiftUseCases {
  constructor(
    private readonly giftRepository: IGiftRepository,
    private readonly walletUseCases: WalletUseCases,
    private readonly walletRepository: IWalletRepository
  ) {}

  async listGifts(): Promise<IGiftEntity[]> {
    return this.giftRepository.listActiveGifts();
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

    const gift = await this.giftRepository.findBySlug(giftSlug);
    if (!gift || !gift.isActive) {
      throw new GiftNotFoundError(giftSlug);
    }

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

    // 2. Credit recipient's with 70% earnings in paise
    await this.walletRepository.creditEarningsPaise(
      recipientId,
      gift.creatorEarningPaise,
      `recv_${idempotencyKey}`,
      'GIFT',
      gift.id,
      {
        senderId,
        giftSlug: gift.slug,
        giftName: gift.name,
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
      creatorEarningsPaise: gift.creatorEarningPaise,
      platformFeePaise: gift.platformFeePaise,
    });

    return {
      transfer,
      gift,
      remainingCoins: debitResult.wallet.purchasedCoinsBalance,
    };
  }
}

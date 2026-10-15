import mongoose, { Types } from 'mongoose';
import { IWalletEntity, IWalletTransactionEntity, WalletTransactionType } from '../../../domain/entities/Wallet';
import { InsufficientCoinsError, InsufficientEarningsError } from '../../../domain/errors/WalletErrors';
import { IWalletRepository } from '../../../domain/repositories/WalletRepository';
import { IWalletDocument, IWalletTransactionDocument, WalletModel, WalletTransactionModel } from '../mongoose/WalletModel';

export class MongooseWalletRepository implements IWalletRepository {
  // In-memory fallback map for unit tests when MongoDB daemon is not running
  private inMemoryWallets = new Map<string, IWalletEntity>();
  private inMemoryTransactions = new Map<string, IWalletTransactionEntity>();

  public clearInMemoryStore(): void {
    this.inMemoryWallets.clear();
    this.inMemoryTransactions.clear();
  }

  private mapWallet(doc: IWalletDocument): IWalletEntity {
    return {
      id: doc._id.toString(),
      userId: doc.user_id.toString(),
      purchasedCoinsBalance: doc.purchased_coins_balance,
      withdrawableEarningsPaise: doc.withdrawable_earnings_paise,
      totalCoinsSpent: doc.total_coins_spent,
      totalEarningsWithdrawnPaise: doc.total_earnings_withdrawn_paise,
      payoutUpiId: doc.payout_upi_id || undefined,
      version: doc.version,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    };
  }

  private mapTransaction(doc: IWalletTransactionDocument): IWalletTransactionEntity {
    return {
      id: doc._id.toString(),
      walletId: doc.wallet_id.toString(),
      userId: doc.user_id.toString(),
      type: doc.type as WalletTransactionType,
      coinsAmount: doc.coins_amount,
      currencyAmountPaise: doc.currency_amount_paise,
      idempotencyKey: doc.idempotency_key,
      referenceType: doc.reference_type as IWalletTransactionEntity['referenceType'],
      referenceId: doc.reference_id,
      status: doc.status,
      balanceAfter: {
        purchasedCoins: doc.balance_after.purchased_coins,
        withdrawablePaise: doc.balance_after.withdrawable_paise,
      },
      metadata: doc.metadata,
      createdAt: doc.created_at,
    };
  }

  async findByUserId(userId: string): Promise<IWalletEntity | null> {
    if (mongoose.connection.readyState === 1) {
      const doc = await WalletModel.findOne({ user_id: new Types.ObjectId(userId) });
      return doc ? this.mapWallet(doc) : null;
    }
    return this.inMemoryWallets.get(userId) || null;
  }

  async createOrGet(userId: string): Promise<IWalletEntity> {
    if (mongoose.connection.readyState === 1) {
      const userObjectId = new Types.ObjectId(userId);
      let doc = await WalletModel.findOne({ user_id: userObjectId });
      if (!doc) {
        try {
          doc = await WalletModel.create({
            user_id: userObjectId,
            purchased_coins_balance: 0,
            withdrawable_earnings_paise: 0,
            total_coins_spent: 0,
            total_earnings_withdrawn_paise: 0,
            version: 1,
          });
        } catch (err: unknown) {
          doc = await WalletModel.findOne({ user_id: userObjectId });
          if (!doc) throw err as Error;
        }
      }
      return this.mapWallet(doc);
    }

    let wallet = this.inMemoryWallets.get(userId);
    if (!wallet) {
      wallet = {
        id: `w_${userId}`,
        userId,
        purchasedCoinsBalance: 0,
        withdrawableEarningsPaise: 0,
        totalCoinsSpent: 0,
        totalEarningsWithdrawnPaise: 0,
        payoutUpiId: undefined,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.inMemoryWallets.set(userId, wallet);
    }
    return wallet;
  }

  async creditCoins(
    userId: string,
    coins: number,
    idempotencyKey: string,
    referenceType: 'RAZORPAY_ORDER' | 'SYSTEM',
    referenceId: string,
    metadata?: Record<string, unknown>
  ): Promise<{ wallet: IWalletEntity; transaction: IWalletTransactionEntity }> {
    const existingTx = await this.findTransactionByIdempotencyKey(idempotencyKey);
    if (existingTx) {
      const wallet = await this.createOrGet(userId);
      return { wallet, transaction: existingTx };
    }

    if (mongoose.connection.readyState === 1) {
      const userObjectId = new Types.ObjectId(userId);
      const updatedWallet = await WalletModel.findOneAndUpdate(
        { user_id: userObjectId },
        {
          $inc: {
            purchased_coins_balance: coins,
            version: 1,
          },
        },
        { new: true, upsert: true }
      );

      const txDoc = await WalletTransactionModel.create({
        wallet_id: updatedWallet._id,
        user_id: userObjectId,
        type: 'COIN_PURCHASE',
        coins_amount: coins,
        currency_amount_paise: metadata?.pricePaise || 0,
        idempotency_key: idempotencyKey,
        reference_type: referenceType,
        reference_id: referenceId,
        status: 'COMPLETED',
        balance_after: {
          purchased_coins: updatedWallet.purchased_coins_balance,
          withdrawable_paise: updatedWallet.withdrawable_earnings_paise,
        },
        metadata: metadata || {},
      });

      return {
        wallet: this.mapWallet(updatedWallet),
        transaction: this.mapTransaction(txDoc),
      };
    }

    // In-Memory implementation
    const wallet = await this.createOrGet(userId);
    wallet.purchasedCoinsBalance += coins;
    wallet.version += 1;
    wallet.updatedAt = new Date();

    const tx: IWalletTransactionEntity = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      walletId: wallet.id,
      userId,
      type: 'COIN_PURCHASE',
      coinsAmount: coins,
      currencyAmountPaise: (metadata?.pricePaise as number) || 0,
      idempotencyKey,
      referenceType,
      referenceId,
      status: 'COMPLETED',
      balanceAfter: {
        purchasedCoins: wallet.purchasedCoinsBalance,
        withdrawablePaise: wallet.withdrawableEarningsPaise,
      },
      metadata,
      createdAt: new Date(),
    };

    this.inMemoryTransactions.set(tx.id, tx);
    return { wallet, transaction: tx };
  }

  async debitCoins(
    userId: string,
    coins: number,
    type: WalletTransactionType,
    idempotencyKey: string,
    referenceType: 'MATCH' | 'CONVERSATION' | 'GIFT' | 'SYSTEM',
    referenceId: string,
    metadata?: Record<string, unknown>
  ): Promise<{ wallet: IWalletEntity; transaction: IWalletTransactionEntity }> {
    const existingTx = await this.findTransactionByIdempotencyKey(idempotencyKey);
    if (existingTx) {
      const wallet = await this.createOrGet(userId);
      return { wallet, transaction: existingTx };
    }

    if (mongoose.connection.readyState === 1) {
      const userObjectId = new Types.ObjectId(userId);
      const updatedWallet = await WalletModel.findOneAndUpdate(
        {
          user_id: userObjectId,
          purchased_coins_balance: { $gte: coins },
        },
        {
          $inc: {
            purchased_coins_balance: -coins,
            total_coins_spent: coins,
            version: 1,
          },
        },
        { new: true }
      );

      if (!updatedWallet) {
        const current = await this.createOrGet(userId);
        throw new InsufficientCoinsError(coins, current.purchasedCoinsBalance);
      }

      const txDoc = await WalletTransactionModel.create({
        wallet_id: updatedWallet._id,
        user_id: userObjectId,
        type,
        coins_amount: -coins,
        currency_amount_paise: 0,
        idempotency_key: idempotencyKey,
        reference_type: referenceType,
        reference_id: referenceId,
        status: 'COMPLETED',
        balance_after: {
          purchased_coins: updatedWallet.purchased_coins_balance,
          withdrawable_paise: updatedWallet.withdrawable_earnings_paise,
        },
        metadata: metadata || {},
      });

      return {
        wallet: this.mapWallet(updatedWallet),
        transaction: this.mapTransaction(txDoc),
      };
    }

    // In-memory implementation
    const wallet = await this.createOrGet(userId);
    if (wallet.purchasedCoinsBalance < coins) {
      throw new InsufficientCoinsError(coins, wallet.purchasedCoinsBalance);
    }

    wallet.purchasedCoinsBalance -= coins;
    wallet.totalCoinsSpent += coins;
    wallet.version += 1;
    wallet.updatedAt = new Date();

    const tx: IWalletTransactionEntity = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      walletId: wallet.id,
      userId,
      type,
      coinsAmount: -coins,
      currencyAmountPaise: 0,
      idempotencyKey,
      referenceType,
      referenceId,
      status: 'COMPLETED',
      balanceAfter: {
        purchasedCoins: wallet.purchasedCoinsBalance,
        withdrawablePaise: wallet.withdrawableEarningsPaise,
      },
      metadata,
      createdAt: new Date(),
    };

    this.inMemoryTransactions.set(tx.id, tx);
    return { wallet, transaction: tx };
  }

  async creditEarningsPaise(
    userId: string,
    earningsPaise: number,
    idempotencyKey: string,
    referenceType: 'GIFT' | 'SYSTEM',
    referenceId: string,
    metadata?: Record<string, unknown>
  ): Promise<{ wallet: IWalletEntity; transaction: IWalletTransactionEntity }> {
    const existingTx = await this.findTransactionByIdempotencyKey(idempotencyKey);
    if (existingTx) {
      const wallet = await this.createOrGet(userId);
      return { wallet, transaction: existingTx };
    }

    if (mongoose.connection.readyState === 1) {
      const userObjectId = new Types.ObjectId(userId);
      const updatedWallet = await WalletModel.findOneAndUpdate(
        { user_id: userObjectId },
        {
          $inc: {
            withdrawable_earnings_paise: earningsPaise,
            version: 1,
          },
        },
        { new: true, upsert: true }
      );

      const txDoc = await WalletTransactionModel.create({
        wallet_id: updatedWallet._id,
        user_id: userObjectId,
        type: 'GIFT_RECEIVED_CREDIT',
        coins_amount: 0,
        currency_amount_paise: earningsPaise,
        idempotency_key: idempotencyKey,
        reference_type: referenceType,
        reference_id: referenceId,
        status: 'COMPLETED',
        balance_after: {
          purchased_coins: updatedWallet.purchased_coins_balance,
          withdrawable_paise: updatedWallet.withdrawable_earnings_paise,
        },
        metadata: metadata || {},
      });

      return {
        wallet: this.mapWallet(updatedWallet),
        transaction: this.mapTransaction(txDoc),
      };
    }

    // In-memory implementation
    const wallet = await this.createOrGet(userId);
    wallet.withdrawableEarningsPaise += earningsPaise;
    wallet.version += 1;
    wallet.updatedAt = new Date();

    const tx: IWalletTransactionEntity = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      walletId: wallet.id,
      userId,
      type: 'GIFT_RECEIVED_CREDIT',
      coinsAmount: 0,
      currencyAmountPaise: earningsPaise,
      idempotencyKey,
      referenceType,
      referenceId,
      status: 'COMPLETED',
      balanceAfter: {
        purchasedCoins: wallet.purchasedCoinsBalance,
        withdrawablePaise: wallet.withdrawableEarningsPaise,
      },
      metadata,
      createdAt: new Date(),
    };

    this.inMemoryTransactions.set(tx.id, tx);
    return { wallet, transaction: tx };
  }

  async listTransactions(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: IWalletTransactionEntity[]; total: number }> {
    if (mongoose.connection.readyState === 1) {
      const userObjectId = new Types.ObjectId(userId);
      const skip = (page - 1) * limit;

      const [docs, total] = await Promise.all([
        WalletTransactionModel.find({ user_id: userObjectId })
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit),
        WalletTransactionModel.countDocuments({ user_id: userObjectId }),
      ]);

      return {
        transactions: docs.map((d) => this.mapTransaction(d)),
        total,
      };
    }

    const all = Array.from(this.inMemoryTransactions.values())
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const skip = (page - 1) * limit;
    return {
      transactions: all.slice(skip, skip + limit),
      total: all.length,
    };
  }

  async findTransactionByIdempotencyKey(key: string): Promise<IWalletTransactionEntity | null> {
    if (mongoose.connection.readyState === 1) {
      const doc = await WalletTransactionModel.findOne({ idempotency_key: key });
      return doc ? this.mapTransaction(doc) : null;
    }

    for (const tx of this.inMemoryTransactions.values()) {
      if (tx.idempotencyKey === key) {
        return tx;
      }
    }
    return null;
  }

  async updatePayoutUpiId(userId: string, upiId: string): Promise<IWalletEntity> {
    if (mongoose.connection.readyState === 1) {
      const userObjectId = new Types.ObjectId(userId);
      const updatedWallet = await WalletModel.findOneAndUpdate(
        { user_id: userObjectId },
        {
          $set: { payout_upi_id: upiId },
          $inc: { version: 1 },
        },
        { new: true, upsert: true }
      );
      return this.mapWallet(updatedWallet);
    }

    const wallet = await this.createOrGet(userId);
    wallet.payoutUpiId = upiId;
    wallet.version += 1;
    wallet.updatedAt = new Date();
    return wallet;
  }

  async withdrawEarnings(
    userId: string,
    amountPaise: number,
    idempotencyKey: string,
    payoutId: string,
    metadata?: Record<string, unknown>
  ): Promise<{ wallet: IWalletEntity; transaction: IWalletTransactionEntity }> {
    const existingTx = await this.findTransactionByIdempotencyKey(idempotencyKey);
    if (existingTx) {
      const wallet = await this.createOrGet(userId);
      return { wallet, transaction: existingTx };
    }

    if (mongoose.connection.readyState === 1) {
      const userObjectId = new Types.ObjectId(userId);
      const updatedWallet = await WalletModel.findOneAndUpdate(
        {
          user_id: userObjectId,
          withdrawable_earnings_paise: { $gte: amountPaise },
        },
        {
          $inc: {
            withdrawable_earnings_paise: -amountPaise,
            total_earnings_withdrawn_paise: amountPaise,
            version: 1,
          },
        },
        { new: true }
      );

      if (!updatedWallet) {
        const current = await this.createOrGet(userId);
        throw new InsufficientEarningsError(amountPaise, current.withdrawableEarningsPaise);
      }

      const txDoc = await WalletTransactionModel.create({
        wallet_id: updatedWallet._id,
        user_id: userObjectId,
        type: 'WITHDRAWAL_PAYOUT',
        coins_amount: 0,
        currency_amount_paise: -amountPaise,
        idempotency_key: idempotencyKey,
        reference_type: 'RAZORPAY_PAYOUT',
        reference_id: payoutId,
        status: 'COMPLETED',
        balance_after: {
          purchased_coins: updatedWallet.purchased_coins_balance,
          withdrawable_paise: updatedWallet.withdrawable_earnings_paise,
        },
        metadata: metadata || {},
      });

      return {
        wallet: this.mapWallet(updatedWallet),
        transaction: this.mapTransaction(txDoc),
      };
    }

    // In-memory implementation
    const wallet = await this.createOrGet(userId);
    if (wallet.withdrawableEarningsPaise < amountPaise) {
      throw new InsufficientEarningsError(amountPaise, wallet.withdrawableEarningsPaise);
    }

    wallet.withdrawableEarningsPaise -= amountPaise;
    wallet.totalEarningsWithdrawnPaise += amountPaise;
    wallet.version += 1;
    wallet.updatedAt = new Date();

    const tx: IWalletTransactionEntity = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      walletId: wallet.id,
      userId,
      type: 'WITHDRAWAL_PAYOUT',
      coinsAmount: 0,
      currencyAmountPaise: -amountPaise,
      idempotencyKey,
      referenceType: 'RAZORPAY_PAYOUT',
      referenceId: payoutId,
      status: 'COMPLETED',
      balanceAfter: {
        purchasedCoins: wallet.purchasedCoinsBalance,
        withdrawablePaise: wallet.withdrawableEarningsPaise,
      },
      metadata,
      createdAt: new Date(),
    };

    this.inMemoryTransactions.set(tx.id, tx);
    return { wallet, transaction: tx };
  }
}

import { walletRepository, walletUseCases } from '../wallet';
import { GiftUseCases } from './application/use-cases/GiftUseCases';
import { MongooseGiftRepository } from './infrastructure/persistence/repositories/MongooseGiftRepository';
import { GiftController } from './presentation/http/controllers/GiftController';
import { createGiftRouter } from './presentation/http/routes/GiftRoutes';

const giftRepository = new MongooseGiftRepository();
const giftUseCases = new GiftUseCases(giftRepository, walletUseCases, walletRepository);
const giftController = new GiftController(giftUseCases);
const giftRouter = createGiftRouter(giftController);

export {
  giftRepository,
  giftUseCases,
  giftController,
  giftRouter,
  GiftUseCases,
  MongooseGiftRepository,
};

export * from './domain/entities/Gift';
export * from './domain/errors/GiftErrors';
export * from './domain/repositories/GiftRepository';

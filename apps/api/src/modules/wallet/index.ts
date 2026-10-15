import { WalletUseCases } from './application/use-cases/WalletUseCases';
import { RazorpayService } from './infrastructure/payment/RazorpayService';
import { MongooseWalletRepository } from './infrastructure/persistence/repositories/MongooseWalletRepository';
import { WalletController } from './presentation/http/controllers/WalletController';
import { createWalletRouter } from './presentation/http/routes/WalletRoutes';

// Instantiate default dependencies for the modular monolith
const walletRepository = new MongooseWalletRepository();
const razorpayService = new RazorpayService();
const walletUseCases = new WalletUseCases(walletRepository, razorpayService);
const walletController = new WalletController(walletUseCases);
const walletRouter = createWalletRouter(walletController);

export {
  walletRepository,
  razorpayService,
  walletUseCases,
  walletController,
  walletRouter,
  WalletUseCases,
  MongooseWalletRepository,
  RazorpayService,
};

export * from './domain/entities/Wallet';
export * from './domain/errors/WalletErrors';
export * from './domain/repositories/WalletRepository';

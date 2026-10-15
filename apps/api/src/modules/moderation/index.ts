import { UserRepository } from '../users/domain/repositories/UserRepository';
import { ModerationUseCases } from './application/use-cases/ModerationUseCases';
import { IModerationRepository } from './domain/repositories/ModerationRepository';
import { MongooseModerationRepository } from './infrastructure/persistence/repositories/MongooseModerationRepository';
import { ModerationController } from './presentation/http/controllers/ModerationController';
import { createModerationRouter } from './presentation/http/routes/ModerationRoutes';

export interface ModerationModuleOptions {
  userRepository?: UserRepository;
  moderationRepository?: IModerationRepository;
}

export const createModerationModule = (options: ModerationModuleOptions = {}) => {
  const moderationRepository = options.moderationRepository || new MongooseModerationRepository();
  const moderationUseCases = new ModerationUseCases(
    moderationRepository,
    options.userRepository
  );
  const controller = new ModerationController(moderationUseCases);
  const router = createModerationRouter(controller);

  return {
    router,
    moderationUseCases,
    moderationRepository,
  };
};

export * from './domain/entities/Report';
export * from './domain/errors/ModerationErrors';
export * from './domain/repositories/ModerationRepository';
export { MongooseModerationRepository };

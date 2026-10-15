import { Router } from 'express';
import { ConversationRepository } from './domain/repositories/ConversationRepository';
import { MongooseConversationRepository } from './infrastructure/persistence/repositories/MongooseConversationRepository';
import { UserRepository } from '../users/domain/repositories/UserRepository';
import { MongooseUserRepository } from '../users/infrastructure/persistence/repositories/MongooseUserRepository';
import { UserPreferencesUseCase } from '../users/application/use-cases/UserPreferencesUseCase';
import { MatchmakingService } from '../matching/infrastructure/services/MatchmakingService';
import {
  ListConversationsUseCase,
  GetConversationByIdUseCase,
  DeleteConversationUseCase,
  DirectCallUseCase,
  RecordCallConnectionUseCase,
} from './application/use-cases/ConversationUseCases';
import { ConversationController } from './presentation/http/controllers/ConversationController';
import { createConversationRouter } from './presentation/http/routes/ConversationRoutes';

export interface ConversationsModuleOptions {
  conversationRepository?: ConversationRepository;
  userRepository?: UserRepository;
  preferencesUseCase?: UserPreferencesUseCase;
  matchmakingService?: MatchmakingService;
}

export interface ConversationsModule {
  router: Router;
  controller: ConversationController;
  repository: ConversationRepository;
  useCases: {
    list: ListConversationsUseCase;
    getById: GetConversationByIdUseCase;
    delete: DeleteConversationUseCase;
    directCall: DirectCallUseCase;
    recordCall: RecordCallConnectionUseCase;
  };
}

export const createConversationsModule = (
  options: ConversationsModuleOptions = {}
): ConversationsModule => {
  const conversationRepository =
    options.conversationRepository ?? new MongooseConversationRepository();
  const userRepository = options.userRepository ?? new MongooseUserRepository();
  const preferencesUseCase = options.preferencesUseCase ?? new UserPreferencesUseCase();
  const matchmakingService = options.matchmakingService ?? new MatchmakingService();

  const list = new ListConversationsUseCase(conversationRepository, userRepository);
  const getById = new GetConversationByIdUseCase(conversationRepository, userRepository);
  const deleteUseCase = new DeleteConversationUseCase(conversationRepository);
  const directCall = new DirectCallUseCase(
    conversationRepository,
    preferencesUseCase,
    matchmakingService
  );
  const recordCall = new RecordCallConnectionUseCase(conversationRepository);

  const controller = new ConversationController(list, getById, deleteUseCase, directCall);
  const router = createConversationRouter(controller);

  return {
    router,
    controller,
    repository: conversationRepository,
    useCases: {
      list,
      getById,
      delete: deleteUseCase,
      directCall,
      recordCall,
    },
  };
};

export * from './domain/entities/Conversation';
export * from './domain/repositories/ConversationRepository';
export * from './domain/errors/ConversationErrors';
export * from './application/use-cases/ConversationUseCases';

import { Router } from 'express';
import { UserRepository } from '../users/domain/repositories/UserRepository';
import { MongooseUserRepository } from '../users/infrastructure/persistence/repositories/MongooseUserRepository';
import { PresenceService } from './infrastructure/services/PresenceService';
import { MatchmakingService } from './infrastructure/services/MatchmakingService';
import { GetOnlinePresenceUseCase } from './application/use-cases/GetOnlinePresenceUseCase';
import { JoinQueueUseCase } from './application/use-cases/JoinQueueUseCase';
import { LeaveQueueUseCase } from './application/use-cases/LeaveQueueUseCase';
import { GetCallSessionUseCase, EndCallSessionUseCase } from './application/use-cases/CallSessionUseCases';
import { MatchingController } from './presentation/http/controllers/MatchingController';
import { createMatchingRouter, createCallsRouter } from './presentation/http/routes/MatchingRoutes';

export interface MatchingModuleOptions {
  userRepository?: UserRepository;
  presenceService?: PresenceService;
  matchmakingService?: MatchmakingService;
}

export interface MatchingModule {
  matchingRouter: Router;
  callsRouter: Router;
  controller: MatchingController;
  services: {
    presence: PresenceService;
    matchmaking: MatchmakingService;
  };
  useCases: {
    getOnlinePresence: GetOnlinePresenceUseCase;
    joinQueue: JoinQueueUseCase;
    leaveQueue: LeaveQueueUseCase;
    getCallSession: GetCallSessionUseCase;
    endCallSession: EndCallSessionUseCase;
  };
}

export const createMatchingModule = (options: MatchingModuleOptions = {}): MatchingModule => {
  const userRepository = options.userRepository ?? new MongooseUserRepository();
  const presence = options.presenceService ?? new PresenceService();
  const matchmaking = options.matchmakingService ?? new MatchmakingService();

  const getOnlinePresence = new GetOnlinePresenceUseCase(presence);
  const joinQueue = new JoinQueueUseCase(matchmaking, userRepository);
  const leaveQueue = new LeaveQueueUseCase(matchmaking);
  const getCallSession = new GetCallSessionUseCase(matchmaking);
  const endCallSession = new EndCallSessionUseCase(matchmaking);

  const controller = new MatchingController(
    getOnlinePresence,
    joinQueue,
    leaveQueue,
    getCallSession,
    endCallSession
  );

  const matchingRouter = createMatchingRouter(controller);
  const callsRouter = createCallsRouter(controller);

  return {
    matchingRouter,
    callsRouter,
    controller,
    services: {
      presence,
      matchmaking,
    },
    useCases: {
      getOnlinePresence,
      joinQueue,
      leaveQueue,
      getCallSession,
      endCallSession,
    },
  };
};

export * from './domain/entities/MatchSession';
export * from './domain/errors/MatchmakingErrors';
export * from './infrastructure/services/PresenceService';
export * from './infrastructure/services/MatchmakingService';
export * from './application/use-cases/GetOnlinePresenceUseCase';
export * from './application/use-cases/JoinQueueUseCase';
export * from './application/use-cases/LeaveQueueUseCase';
export * from './application/use-cases/CallSessionUseCases';

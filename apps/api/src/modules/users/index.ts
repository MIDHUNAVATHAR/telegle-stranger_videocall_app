import { Router } from 'express';
import { UserRepository } from './domain/repositories/UserRepository';
import { MongooseUserRepository } from './infrastructure/persistence/repositories/MongooseUserRepository';
import { RegisterUserUseCase } from './application/use-cases/RegisterUserUseCase';
import { GetUserByIdUseCase } from './application/use-cases/GetUserByIdUseCase';
import { UserController } from './presentation/http/controllers/UserController';
import { createUserRouter } from './presentation/http/routes/UserRoutes';

export interface UsersModule {
  router: Router;
  useCases: {
    registerUser: RegisterUserUseCase;
    getUserById: GetUserByIdUseCase;
  };
  repository: UserRepository;
}

export interface CreateUsersModuleOptions {
  repository?: UserRepository;
}

export const createUsersModule = (options: CreateUsersModuleOptions = {}): UsersModule => {
  const repository = options.repository ?? new MongooseUserRepository();
  const registerUser = new RegisterUserUseCase(repository);
  const getUserById = new GetUserByIdUseCase(repository);
  const controller = new UserController(registerUser, getUserById);
  const router = createUserRouter(controller);

  return {
    router,
    useCases: {
      registerUser,
      getUserById,
    },
    repository,
  };
};

export * from './domain/entities/User';
export * from './domain/repositories/UserRepository';
export * from './domain/errors/UserErrors';
export * from './application/dto/UserDTOs';
export * from './application/use-cases/RegisterUserUseCase';
export * from './application/use-cases/GetUserByIdUseCase';

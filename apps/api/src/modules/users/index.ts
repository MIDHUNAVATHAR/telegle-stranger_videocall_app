import { Router } from 'express';
import { UserRepository } from './domain/repositories/UserRepository';
import { MongooseUserRepository } from './infrastructure/persistence/repositories/MongooseUserRepository';
import { RegisterUserUseCase } from './application/use-cases/RegisterUserUseCase';
import { GetUserByIdUseCase } from './application/use-cases/GetUserByIdUseCase';
import { UpdateUserProfileUseCase } from './application/use-cases/UpdateUserProfileUseCase';
import { UserPreferencesUseCase } from './application/use-cases/UserPreferencesUseCase';
import { CloudinaryService } from './infrastructure/services/CloudinaryService';
import { UserController } from './presentation/http/controllers/UserController';
import { createUserRouter } from './presentation/http/routes/UserRoutes';

export interface UsersModule {
  router: Router;
  useCases: {
    registerUser: RegisterUserUseCase;
    getUserById: GetUserByIdUseCase;
    updateUserProfile: UpdateUserProfileUseCase;
    preferences: UserPreferencesUseCase;
  };
  repository: UserRepository;
}

export interface CreateUsersModuleOptions {
  repository?: UserRepository;
  preferencesUseCase?: UserPreferencesUseCase;
  cloudinaryService?: CloudinaryService;
}

export const createUsersModule = (options: CreateUsersModuleOptions = {}): UsersModule => {
  const repository = options.repository ?? new MongooseUserRepository();
  const registerUser = new RegisterUserUseCase(repository);
  const getUserById = new GetUserByIdUseCase(repository);
  const updateUserProfile = new UpdateUserProfileUseCase(repository);
  const preferences = options.preferencesUseCase ?? new UserPreferencesUseCase();
  const cloudinaryService = options.cloudinaryService ?? new CloudinaryService();

  const controller = new UserController(
    registerUser,
    getUserById,
    updateUserProfile,
    preferences,
    cloudinaryService,
    repository
  );
  const router = createUserRouter(controller);

  return {
    router,
    useCases: {
      registerUser,
      getUserById,
      updateUserProfile,
      preferences,
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
export * from './application/use-cases/UpdateUserProfileUseCase';
export * from './application/use-cases/UserPreferencesUseCase';
export * from './infrastructure/services/CloudinaryService';


import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserRepository } from '../mocks/InMemoryUserRepository';
import { RegisterUserUseCase } from '../../src/modules/users/application/use-cases/RegisterUserUseCase';
import { GetUserByIdUseCase } from '../../src/modules/users/application/use-cases/GetUserByIdUseCase';
import { UserAlreadyExistsError, UserNotFoundError } from '../../src/modules/users/domain/errors/UserErrors';

describe('User Application Use Cases', () => {
  let repository: InMemoryUserRepository;
  let registerUserUseCase: RegisterUserUseCase;
  let getUserByIdUseCase: GetUserByIdUseCase;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    registerUserUseCase = new RegisterUserUseCase(repository);
    getUserByIdUseCase = new GetUserByIdUseCase(repository);
  });

  describe('RegisterUserUseCase', () => {
    it('should register a new user successfully', async () => {
      const result = await registerUserUseCase.execute({
        username: 'alice',
        email: 'alice@example.com',
        bio: 'Hello world',
      });

      expect(result.id).toBeDefined();
      expect(result.username).toBe('alice');
      expect(result.email).toBe('alice@example.com');
      expect(result.karmaScore).toBe(100);
      expect(result.isActive).toBe(true);
    });

    it('should reject registration if email is already taken', async () => {
      await registerUserUseCase.execute({
        username: 'alice',
        email: 'alice@example.com',
      });

      await expect(
        registerUserUseCase.execute({
          username: 'bob',
          email: 'alice@example.com',
        })
      ).rejects.toThrow(UserAlreadyExistsError);
    });

    it('should reject registration if username is already taken', async () => {
      await registerUserUseCase.execute({
        username: 'alice',
        email: 'alice@example.com',
      });

      await expect(
        registerUserUseCase.execute({
          username: 'alice',
          email: 'other@example.com',
        })
      ).rejects.toThrow(UserAlreadyExistsError);
    });
  });

  describe('GetUserByIdUseCase', () => {
    it('should retrieve an existing user by ID', async () => {
      const created = await registerUserUseCase.execute({
        username: 'charlie',
        email: 'charlie@example.com',
      });

      const retrieved = await getUserByIdUseCase.execute(created.id);
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.username).toBe('charlie');
      expect(retrieved.email).toBe('charlie@example.com');
    });

    it('should throw UserNotFoundError if user does not exist', async () => {
      await expect(getUserByIdUseCase.execute('non-existent-id')).rejects.toThrow(
        UserNotFoundError
      );
    });
  });
});

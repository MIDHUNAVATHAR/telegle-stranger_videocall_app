import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { InMemoryUserRepository } from '../mocks/InMemoryUserRepository';

describe('User HTTP API Routes', () => {
  let repository: InMemoryUserRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    app = createApp({ userRepository: repository });
  });

  describe('POST /api/v1/users', () => {
    it('should register a new user and return 201 with user payload', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({
          username: 'player_one',
          email: 'player1@donkeyplay.com',
          bio: 'First player ready to game!',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.username).toBe('player_one');
      expect(response.body.data.email).toBe('player1@donkeyplay.com');
      expect(response.body.data.karmaScore).toBe(100);
    });

    it('should return 400 when request body fails validation', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({
          username: 'a', // Too short
          email: 'not-an-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.name).toBe('ValidationError');
    });

    it('should return 409 when email is already registered', async () => {
      await request(app)
        .post('/api/v1/users')
        .send({
          username: 'user_orig',
          email: 'duplicate@example.com',
        });

      const response = await request(app)
        .post('/api/v1/users')
        .send({
          username: 'user_second',
          email: 'duplicate@example.com',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.name).toBe('UserAlreadyExistsError');
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return 200 with user profile when user exists', async () => {
      const createRes = await request(app)
        .post('/api/v1/users')
        .send({
          username: 'player_two',
          email: 'player2@donkeyplay.com',
        });

      const userId = createRes.body.data.id;

      const getRes = await request(app).get(`/api/v1/users/${userId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.id).toBe(userId);
      expect(getRes.body.data.username).toBe('player_two');
    });

    it('should return 404 when user ID does not exist', async () => {
      const response = await request(app).get('/api/v1/users/non-existent-user-id');
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.name).toBe('UserNotFoundError');
    });
  });
});

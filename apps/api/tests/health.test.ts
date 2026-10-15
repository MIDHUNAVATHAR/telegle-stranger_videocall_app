import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Phase 1 Foundation: Health, Liveness, Readiness & Swagger Endpoints', () => {
  it('GET /health returns 200 with service metadata', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'donkey-play-api');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /api/v1/health returns 200 with service metadata', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('GET /health/liveness returns 200 with process alive status', async () => {
    const res = await request(app).get('/health/liveness');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'UP');
    expect(res.body).toHaveProperty('message', 'Process is alive');
  });

  it('GET /health/readiness returns dependency statuses for mongo and redis', async () => {
    const res = await request(app).get('/health/readiness');
    // In test environment, redis mock is UP and mongo may be DOWN if not connected, returning 503 or 200
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('services');
    expect(res.body.services).toHaveProperty('mongo');
    expect(res.body.services).toHaveProperty('redis');
    expect(res.body.services.redis.status).toBe('UP');
  });

  it('GET /api/docs-json returns parsed OpenAPI 3.1 specification JSON', async () => {
    const res = await request(app).get('/api/docs-json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('openapi');
    expect(res.body.info).toHaveProperty('title', 'Donkey Play API');
    expect(res.body.paths).toHaveProperty('/auth/otp/send');
  });

  it('GET non-existent route returns 404 with standard error envelope', async () => {
    const res = await request(app).get('/api/v1/non-existent-route');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        name: 'NotFoundError',
        message: 'Route GET /api/v1/non-existent-route not found',
        details: [],
      },
    });
  });
});

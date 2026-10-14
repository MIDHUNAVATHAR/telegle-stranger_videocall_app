import { describe, it, expect } from 'vitest';
import { User } from '../../src/modules/users/domain/entities/User';
import { ValidationError } from '../../src/common/errors/AppError';

describe('User Domain Entity', () => {
  it('should successfully create a valid User entity', () => {
    const user = User.create({
      username: 'donkey_fan',
      email: 'fan@donkeyplay.com',
      bio: 'Ready to chat!',
    });

    expect(user.id).toBeDefined();
    expect(user.username).toBe('donkey_fan');
    expect(user.email).toBe('fan@donkeyplay.com');
    expect(user.bio).toBe('Ready to chat!');
    expect(user.karmaScore).toBe(100);
    expect(user.isActive).toBe(true);
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('should reject usernames shorter than 3 characters', () => {
    expect(() => {
      User.create({
        username: 'ab',
        email: 'user@example.com',
      });
    }).toThrow(ValidationError);
  });

  it('should reject invalid email formats', () => {
    expect(() => {
      User.create({
        username: 'validuser',
        email: 'invalid-email',
      });
    }).toThrow(ValidationError);
  });

  it('should update user bio and timestamp', () => {
    const user = User.create({
      username: 'donkey_fan',
      email: 'fan@donkeyplay.com',
    });

    user.updateBio('Updated bio for stranger connect');
    expect(user.bio).toBe('Updated bio for stranger connect');
  });

  it('should adjust karma score correctly without dropping below zero', () => {
    const user = User.create({
      username: 'donkey_fan',
      email: 'fan@donkeyplay.com',
    });

    user.adjustKarma(25);
    expect(user.karmaScore).toBe(125);

    user.adjustKarma(-200);
    expect(user.karmaScore).toBe(0);
  });

  it('should deactivate user', () => {
    const user = User.create({
      username: 'donkey_fan',
      email: 'fan@donkeyplay.com',
    });

    user.deactivate();
    expect(user.isActive).toBe(false);
  });
});

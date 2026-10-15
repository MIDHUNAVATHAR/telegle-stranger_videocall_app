import { describe, it, expect, vi } from 'vitest';
import { profileApi } from './apis/profileApi';

describe('Frontend Profile Module', () => {
  it('exposes all profile API endpoints', () => {
    expect(typeof profileApi.getMyProfile).toBe('function');
    expect(typeof profileApi.updateProfile).toBe('function');
    expect(typeof profileApi.signAvatarUpload).toBe('function');
    expect(typeof profileApi.uploadAvatarToCloudinary).toBe('function');
    expect(typeof profileApi.updatePreferences).toBe('function');
    expect(typeof profileApi.getPublicProfile).toBe('function');
  });

  it('handles offline fallback gracefully during avatar upload', async () => {
    // Mock global fetch to simulate network error or offline mode
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    // Mock createObjectURL
    if (!global.URL.createObjectURL) {
      global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-avatar-preview');
    }

    const mockFile = new File(['mock content'], 'avatar.png', { type: 'image/png' });
    
    // signAvatarUpload mock
    vi.spyOn(profileApi, 'signAvatarUpload').mockResolvedValue({
      signature: 'mock_sig',
      timestamp: 1234567890,
      api_key: 'mock_key',
      cloud_name: 'mock_cloud',
      folder: 'donkey-play/avatars',
    });

    const result = await profileApi.uploadAvatarToCloudinary(mockFile);
    expect(result).toBeTruthy();

    global.fetch = originalFetch;
  });
});

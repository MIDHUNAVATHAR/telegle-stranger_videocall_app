import crypto from 'crypto';
import { env } from '../../../../config/env';

export interface CloudinarySignResult {
  signature: string;
  timestamp: number;
  api_key: string;
  apiKey: string;
  cloud_name: string;
  cloudName: string;
  folder: string;
  publicId?: string;
  eager: string;
}

export class CloudinaryService {
  constructor(
    private readonly cloudName: string = env.CLOUDINARY_CLOUD_NAME || 'donkey_play_demo',
    private readonly apiKey: string = env.CLOUDINARY_API_KEY || '123456789012345',
    private readonly apiSecret: string = env.CLOUDINARY_API_SECRET || 'mock_cloudinary_secret_123'
  ) {}

  public generateUploadSignature(userId: string): CloudinarySignResult {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'donkey-play/avatars';
    const eager = 'c_fill,w_500,h_500,g_face,q_auto,f_webp';

    // Cloudinary signature convention: alphabetically sorted key=value pairs joined with &, then appended with api_secret
    const paramsToSign = `eager=${eager}&folder=${folder}&public_id=${userId}&timestamp=${timestamp}${this.apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    return {
      signature,
      timestamp,
      api_key: this.apiKey,
      apiKey: this.apiKey,
      cloud_name: this.cloudName,
      cloudName: this.cloudName,
      folder,
      publicId: `avatar_${userId}`,
      eager,
    };
  }
}

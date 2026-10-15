import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateRequest } from '../../../../../common/middleware/validateRequest';
import {
  sendOtpSchema,
  verifyOtpSchema,
  googleAuthSchema,
} from '../validators/AuthValidators';
import { authMiddleware } from '../middleware/authMiddleware';

export const createAuthRouter = (controller: AuthController): Router => {
  const router = Router();

  // Passwordless Email OTP
  router.post('/otp/send', validateRequest(sendOtpSchema), controller.sendOtp);
  router.post('/otp/verify', validateRequest(verifyOtpSchema), controller.verifyOtp);

  // Google OAuth
  router.post('/google', validateRequest(googleAuthSchema), controller.googleAuth);

  // Token Lifecycle
  router.post('/refresh', controller.refreshToken);
  router.post('/logout', controller.logout);

  // Current Authenticated User Identity
  router.get('/me', authMiddleware, controller.getMe);

  return router;
};

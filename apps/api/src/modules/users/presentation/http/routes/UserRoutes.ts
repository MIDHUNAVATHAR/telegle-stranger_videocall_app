import { Router } from 'express';
import { validateRequest } from '../../../../../common/middleware/validateRequest';
import { UserController } from '../controllers/UserController';
import {
  createUserSchema,
  getUserByIdSchema,
  updateProfileSchema,
  updatePreferencesSchema,
} from '../validators/UserValidators';
import { authMiddleware } from '../../../../auth';

export const createUserRouter = (controller: UserController): Router => {
  const router = Router();

  // Current authenticated user profile endpoints
  router.get('/me', authMiddleware, controller.getMyProfile);
  router.patch('/me', authMiddleware, validateRequest(updateProfileSchema), controller.updateMyProfile);
  router.post('/me/avatar/sign', authMiddleware, controller.signAvatarUpload);
  router.patch('/me/preferences', authMiddleware, validateRequest(updatePreferencesSchema), controller.updateMyPreferences);

  // User registration (legacy / direct)
  router.post('/', validateRequest(createUserSchema), controller.registerUser);

  // Public profile lookup
  router.get('/:id', validateRequest(getUserByIdSchema), controller.getUserById);

  return router;
};

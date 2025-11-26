import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate, authorizeAdmin, authorizeClient } from '../middleware/auth';
import { validate, updateProfileSchema } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Client routes
router.put('/profile', validate(updateProfileSchema), UserController.updateProfile);
router.get('/profile/detailed', authorizeClient, UserController.getDetailedProfile);
router.delete('/profile', authorizeClient, UserController.deactivateAccount);

// Admin routes
router.get('/', authorizeAdmin, UserController.getAllClients);
router.put('/:id/reactivate', authorizeAdmin, UserController.reactivateClient);

export default router;
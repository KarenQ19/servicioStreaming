import { Router } from 'express';
import { authenticate, authorizeAdmin } from '../middleware/auth';
import { adminPagosController } from '../controllers/adminPagosController';

const router = Router();

router.use(authenticate, authorizeAdmin);

router.get('/', adminPagosController.listarPagos);

export default router;

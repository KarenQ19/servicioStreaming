import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, authorizeAdmin, authorizeClientOrAdmin } from '../middleware/auth';
import { paymentConfigController } from '../controllers/paymentConfigController';

const router = Router();

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const dest = path.join(__dirname, '../../uploads/qr');
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    cb(null, `admin-qr${path.extname(file.originalname || '.png')}`);
  }
});

const upload = multer({ storage });

router.get('/', authenticate, authorizeClientOrAdmin, paymentConfigController.getConfig);
router.put('/transferencia', authenticate, authorizeAdmin, paymentConfigController.updateTransferData);
router.post('/qr', authenticate, authorizeAdmin, upload.single('qrImage'), paymentConfigController.uploadQrImage);

export default router;

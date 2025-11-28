import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const CONFIG_DIR = path.join(__dirname, '../../uploads/config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'payment-settings.json');

type TransferData = {
  titular?: string;
  documento?: string;
  banco?: string;
  tipoCuenta?: string;
  numeroCuenta?: string;
  correo?: string;
};

type PaymentSettings = {
  qrImagePath?: string | null;
  transferencia?: TransferData;
};

const ensureConfigDir = async () => {
  if (!fs.existsSync(CONFIG_DIR)) {
    await fs.promises.mkdir(CONFIG_DIR, { recursive: true });
  }
};

export const loadPaymentSettings = async (): Promise<PaymentSettings> => {
  try {
    await ensureConfigDir();
    if (!fs.existsSync(CONFIG_FILE)) {
      return {};
    }
    const raw = await fs.promises.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as PaymentSettings;
  } catch (error) {
    console.error('Error leyendo configuración de pagos:', error);
    return {};
  }
};

const savePaymentSettings = async (settings: PaymentSettings): Promise<void> => {
  await ensureConfigDir();
  await fs.promises.writeFile(CONFIG_FILE, JSON.stringify(settings, null, 2), 'utf-8');
};

export const paymentConfigController = {
  getConfig: async (_req: Request, res: Response) => {
    const settings = await loadPaymentSettings();
    let qrImageBase64: string | null = null;

    if (settings.qrImagePath && fs.existsSync(settings.qrImagePath)) {
      const buffer = await fs.promises.readFile(settings.qrImagePath);
      qrImageBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
    }

    return res.json({
      success: true,
      data: {
        qrImagePath: settings.qrImagePath || null,
        qrImageBase64,
        transferencia: settings.transferencia || {}
      }
    });
  },

  updateTransferData: async (req: Request, res: Response) => {
    const body = req.body as TransferData;
    const settings = await loadPaymentSettings();
    settings.transferencia = {
      ...settings.transferencia,
      ...body
    };
    await savePaymentSettings(settings);
    return res.json({ success: true, data: settings, message: 'Datos de transferencia actualizados' });
  },

  uploadQrImage: async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se proporcionó imagen' });
    }

    const settings = await loadPaymentSettings();
    settings.qrImagePath = req.file.path;
    await savePaymentSettings(settings);

    const base64 = fs.readFileSync(req.file.path).toString('base64');

    return res.json({
      success: true,
      data: {
        qrImagePath: settings.qrImagePath,
        qrImageBase64: `data:${req.file.mimetype};base64,${base64}`
      },
      message: 'Imagen QR actualizada'
    });
  }
};

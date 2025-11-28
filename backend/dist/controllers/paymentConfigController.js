"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentConfigController = exports.loadPaymentSettings = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CONFIG_DIR = path_1.default.join(__dirname, '../../uploads/config');
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, 'payment-settings.json');
const ensureConfigDir = async () => {
    if (!fs_1.default.existsSync(CONFIG_DIR)) {
        await fs_1.default.promises.mkdir(CONFIG_DIR, { recursive: true });
    }
};
const loadPaymentSettings = async () => {
    try {
        await ensureConfigDir();
        if (!fs_1.default.existsSync(CONFIG_FILE)) {
            return {};
        }
        const raw = await fs_1.default.promises.readFile(CONFIG_FILE, 'utf-8');
        return JSON.parse(raw);
    }
    catch (error) {
        console.error('Error leyendo configuración de pagos:', error);
        return {};
    }
};
exports.loadPaymentSettings = loadPaymentSettings;
const savePaymentSettings = async (settings) => {
    await ensureConfigDir();
    await fs_1.default.promises.writeFile(CONFIG_FILE, JSON.stringify(settings, null, 2), 'utf-8');
};
exports.paymentConfigController = {
    getConfig: async (_req, res) => {
        const settings = await (0, exports.loadPaymentSettings)();
        let qrImageBase64 = null;
        if (settings.qrImagePath && fs_1.default.existsSync(settings.qrImagePath)) {
            const buffer = await fs_1.default.promises.readFile(settings.qrImagePath);
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
    updateTransferData: async (req, res) => {
        const body = req.body;
        const settings = await (0, exports.loadPaymentSettings)();
        settings.transferencia = {
            ...settings.transferencia,
            ...body
        };
        await savePaymentSettings(settings);
        return res.json({ success: true, data: settings, message: 'Datos de transferencia actualizados' });
    },
    uploadQrImage: async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se proporcionó imagen' });
        }
        const settings = await (0, exports.loadPaymentSettings)();
        settings.qrImagePath = req.file.path;
        await savePaymentSettings(settings);
        const base64 = fs_1.default.readFileSync(req.file.path).toString('base64');
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
//# sourceMappingURL=paymentConfigController.js.map
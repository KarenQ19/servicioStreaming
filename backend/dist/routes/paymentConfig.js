"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const paymentConfigController_1 = require("../controllers/paymentConfigController");
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: async (_req, _file, cb) => {
        const dest = path_1.default.join(__dirname, '../../uploads/qr');
        if (!fs_1.default.existsSync(dest)) {
            fs_1.default.mkdirSync(dest, { recursive: true });
        }
        cb(null, dest);
    },
    filename: (_req, file, cb) => {
        cb(null, `admin-qr${path_1.default.extname(file.originalname || '.png')}`);
    }
});
const upload = (0, multer_1.default)({ storage });
router.get('/', auth_1.authenticate, auth_1.authorizeClientOrAdmin, paymentConfigController_1.paymentConfigController.getConfig);
router.put('/transferencia', auth_1.authenticate, auth_1.authorizeAdmin, paymentConfigController_1.paymentConfigController.updateTransferData);
router.post('/qr', auth_1.authenticate, auth_1.authorizeAdmin, upload.single('qrImage'), paymentConfigController_1.paymentConfigController.uploadQrImage);
exports.default = router;
//# sourceMappingURL=paymentConfig.js.map
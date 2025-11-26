"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadOCRMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class UploadOCRMiddleware {
    constructor() {
        this.upload = this.configurarMulter();
    }
    configurarMulter() {
        const uploadDir = path_1.default.join(__dirname, '../../temp/ocr');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        const storage = multer_1.default.diskStorage({
            destination: (req, file, cb) => {
                cb(null, uploadDir);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const ext = path_1.default.extname(file.originalname);
                const name = path_1.default.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
                cb(null, `${name}_${uniqueSuffix}${ext}`);
            }
        });
        const fileFilter = (req, file, cb) => {
            const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff|webp|pdf/;
            const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
            const mimetype = allowedTypes.test(file.mimetype);
            if (mimetype && extname) {
                return cb(null, true);
            }
            else {
                cb(new Error('Solo se permiten archivos de imagen o PDF (JPEG, PNG, GIF, BMP, TIFF, WebP, PDF)'));
            }
        };
        const limits = {
            fileSize: 10 * 1024 * 1024,
            files: 1
        };
        return (0, multer_1.default)({
            storage: storage,
            fileFilter: fileFilter,
            limits: limits
        });
    }
    subirComprobante() {
        return (req, res, next) => {
            const upload = this.upload.single('comprobante');
            upload(req, res, (err) => {
                if (err instanceof multer_1.default.MulterError) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return res.status(400).json({
                            exito: false,
                            error: 'El archivo es demasiado grande. Máximo 10MB permitido.'
                        });
                    }
                    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                        return res.status(400).json({
                            exito: false,
                            error: 'Solo se permite un archivo por validación.'
                        });
                    }
                    return res.status(400).json({
                        exito: false,
                        error: `Error al subir archivo: ${err.message}`
                    });
                }
                else if (err) {
                    return res.status(400).json({
                        exito: false,
                        error: err.message
                    });
                }
                if (!req.file) {
                    return res.status(400).json({
                        exito: false,
                        error: 'No se proporcionó archivo de comprobante'
                    });
                }
                console.log(`✅ Archivo subido exitosamente:`);
                console.log(`   📁 Nombre: ${req.file.originalname}`);
                console.log(`   📊 Tamaño: ${(req.file.size / 1024).toFixed(2)} KB`);
                console.log(`   🎯 Tipo: ${req.file.mimetype}`);
                console.log(`   💾 Ruta temporal: ${req.file.path}`);
                next();
            });
        };
    }
    limpiarArchivosTemporales() {
        return async (req, res, next) => {
            const originalSend = res.send;
            const originalJson = res.json;
            const limpiarArchivo = async (filePath) => {
                try {
                    if (filePath && fs_1.default.existsSync(filePath)) {
                        await fs_1.default.promises.unlink(filePath);
                        console.log(`🗑️ Archivo temporal eliminado: ${path_1.default.basename(filePath)}`);
                    }
                }
                catch (error) {
                    console.error(`⚠️ Error eliminando archivo temporal: ${error.message}`);
                }
            };
            const procesarRespuesta = async (data) => {
                if (req.file && req.file.path) {
                    await limpiarArchivo(req.file.path);
                }
                return data;
            };
            res.send = function (data) {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    procesarRespuesta(data).then(() => {
                        originalSend.call(this, data);
                    });
                }
                else {
                    originalSend.call(this, data);
                }
            };
            res.json = function (data) {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    procesarRespuesta(data).then(() => {
                        originalJson.call(this, data);
                    });
                }
                else {
                    originalJson.call(this, data);
                }
            };
            next();
        };
    }
    static async limpiarArchivosAntiguos() {
        const tempDir = path_1.default.join(__dirname, '../../temp/ocr');
        try {
            if (!fs_1.default.existsSync(tempDir))
                return;
            const files = await fs_1.default.promises.readdir(tempDir);
            const now = Date.now();
            const maxAge = 60 * 60 * 1000;
            let cleanedCount = 0;
            for (const file of files) {
                const filePath = path_1.default.join(tempDir, file);
                try {
                    const stats = await fs_1.default.promises.stat(filePath);
                    const fileAge = now - stats.mtime.getTime();
                    if (fileAge > maxAge) {
                        await fs_1.default.promises.unlink(filePath);
                        cleanedCount++;
                    }
                }
                catch (error) {
                    console.error(`⚠️ Error procesando archivo ${file}: ${error.message}`);
                }
            }
            if (cleanedCount > 0) {
                console.log(`🧹 Limpieza completada: ${cleanedCount} archivos temporales eliminados`);
            }
        }
        catch (error) {
            console.error(`⚠️ Error durante limpieza de archivos temporales: ${error.message}`);
        }
    }
}
exports.UploadOCRMiddleware = UploadOCRMiddleware;
//# sourceMappingURL=uploadOCR.js.map
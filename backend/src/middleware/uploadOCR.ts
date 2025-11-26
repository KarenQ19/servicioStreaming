import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Configuración de multer para subida de imágenes de comprobantes OCR
 */
export class UploadOCRMiddleware {
  private upload: multer.Multer;

  constructor() {
    this.upload = this.configurarMulter();
  }

  /**
   * Configura multer con validaciones y límites
   */
  private configurarMulter(): multer.Multer {
    // Crear directorio temporal si no existe
    const uploadDir = path.join(__dirname, '../../temp/ocr');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        // Generar nombre único con timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `${name}_${uniqueSuffix}${ext}`);
      }
    });

    const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      // Validar tipos de archivo permitidos
      const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff|webp|pdf/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Solo se permiten archivos de imagen o PDF (JPEG, PNG, GIF, BMP, TIFF, WebP, PDF)'));
      }
    };

    const limits = {
      fileSize: 10 * 1024 * 1024, // 10MB máximo
      files: 1 // Solo un archivo por request
    };

    return multer({
      storage: storage,
      fileFilter: fileFilter,
      limits: limits
    });
  }

  /**
   * Middleware para subir imagen de comprobante
   */
  subirComprobante() {
    return (req: any, res: any, next: any) => {
      const upload = this.upload.single('comprobante');
      
      upload(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
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
        } else if (err) {
          return res.status(400).json({
            exito: false,
            error: err.message
          });
        }

        // Verificar que se subió archivo
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

  /**
   * Middleware para limpiar archivos temporales después del procesamiento
   */
  limpiarArchivosTemporales() {
    return async (req: any, res: any, next: any) => {
      // Capturar la respuesta original
      const originalSend = res.send;
      const originalJson = res.json;

      const limpiarArchivo = async (filePath: string) => {
        try {
          if (filePath && fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            console.log(`🗑️ Archivo temporal eliminado: ${path.basename(filePath)}`);
          }
        } catch (error: any) {
          console.error(`⚠️ Error eliminando archivo temporal: ${error.message}`);
        }
      };

      // Interceptar respuesta exitosa
      const procesarRespuesta = async (data: any) => {
        if (req.file && req.file.path) {
          await limpiarArchivo(req.file.path);
        }
        return data;
      };

      // Sobreescribir métodos de respuesta
      res.send = function(data: any) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          procesarRespuesta(data).then(() => {
            originalSend.call(this, data);
          });
        } else {
          originalSend.call(this, data);
        }
      };

      res.json = function(data: any) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          procesarRespuesta(data).then(() => {
            originalJson.call(this, data);
          });
        } else {
          originalJson.call(this, data);
        }
      };

      next();
    };
  }

  /**
   * Función para limpiar archivos temporales antiguos (más de 1 hora)
   */
  static async limpiarArchivosAntiguos(): Promise<void> {
    const tempDir = path.join(__dirname, '../../temp/ocr');
    
    try {
      if (!fs.existsSync(tempDir)) return;

      const files = await fs.promises.readdir(tempDir);
      const now = Date.now();
      const maxAge = 60 * 60 * 1000; // 1 hora en milisegundos

      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        try {
          const stats = await fs.promises.stat(filePath);
          const fileAge = now - stats.mtime.getTime();

          if (fileAge > maxAge) {
            await fs.promises.unlink(filePath);
            cleanedCount++;
          }
        } catch (error: any) {
          console.error(`⚠️ Error procesando archivo ${file}: ${error.message}`);
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Limpieza completada: ${cleanedCount} archivos temporales eliminados`);
      }
    } catch (error: any) {
      console.error(`⚠️ Error durante limpieza de archivos temporales: ${error.message}`);
    }
  }
}

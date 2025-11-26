import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, AlertCircle, Camera, Image as ImageIcon } from 'lucide-react';
import { validacionOCRService } from '../../services/validacionOCRService';
import './ValidacionOCR.css';

interface ValidacionOCRProps {
  pagoId: string;
  monto: number;
  onValidacionCompletada: (resultado: {
    exito: boolean;
    mensaje: string;
    porcentajeCoincidencia?: number;
    datosExtraidos?: any;
    coincidencias?: any;
  }) => void;
}

interface ResultadoValidacion {
  esValido: boolean;
  porcentajeCoincidencia: number;
  datosExtraidos: {
    monto?: string;
    fecha?: string;
    referencia?: string;
    transaccion?: string;
    banco?: string;
  };
  coincidencias: {
    monto: boolean;
    fecha: boolean;
    referencia: boolean;
    transaccion: boolean;
  };
  mensaje: string;
}

type EstadoComponent = 'upload' | 'preview' | 'resultado';

/**
 * Componente de validación OCR con flujos separados y render único
 */
const ValidacionOCR: React.FC<ValidacionOCRProps> = ({ pagoId, onValidacionCompletada }) => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [resultado, setResultado] = useState<ResultadoValidacion | null>(null);
  const [error, setError] = useState<string>('');
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const estadoActual: EstadoComponent = useMemo(() => {
    if (!archivo) return 'upload';
    if (resultado) return 'resultado';
    return 'preview';
  }, [archivo, resultado]);

  const limpiarIntervalo = () => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
  };

  useEffect(() => limpiarIntervalo, []);

  const validarArchivo = (arch: File): boolean => {
    const tiposPermitidos = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/webp',
      'application/pdf'
    ];

    if (!tiposPermitidos.includes(arch.type)) {
      setError('Por favor selecciona una imagen o PDF válido (JPEG, PNG, GIF, BMP, TIFF, WebP, PDF)');
      return false;
    }

    const tamanoMaximo = 10 * 1024 * 1024;
    if (arch.size > tamanoMaximo) {
      setError('El archivo no debe superar los 10MB');
      return false;
    }

    return true;
  };

  const procesarArchivoSeleccionado = useCallback((arch: File) => {
    if (!validarArchivo(arch)) return;
    setError('');
    setResultado(null);
    setArchivo(arch);

    if (arch.type === 'application/pdf') {
      setVistaPrevia(null);
      return;
    }

    const lector = new FileReader();
    lector.onload = (e) => {
      const res = e.target?.result as string;
      setVistaPrevia(res || null);
    };
    lector.readAsDataURL(arch);
  }, []);

  const manejarCambioArchivo = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const arch = evento.target.files?.[0];
    if (arch) procesarArchivoSeleccionado(arch);
  };

  const manejarSoltarArchivo = (evento: React.DragEvent<HTMLDivElement>) => {
    evento.preventDefault();
    evento.stopPropagation();
    const arch = evento.dataTransfer.files?.[0];
    if (arch) procesarArchivoSeleccionado(arch);
  };

  const manejarArrastrarSobre = (evento: React.DragEvent<HTMLDivElement>) => {
    evento.preventDefault();
    evento.stopPropagation();
  };

  const procesarImagen = async () => {
    if (!archivo) return;
    setProcesando(true);
    setProgreso(0);
    setError('');

    try {
      const intervalo = setInterval(() => {
        setProgreso((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 200);
      intervaloRef.current = intervalo;

      const res = await validacionOCRService.validarComprobante(pagoId, archivo);

      limpiarIntervalo();
      setProgreso(100);
      setResultado(res);

      onValidacionCompletada({
        exito: res.esValido,
        mensaje: res.mensaje,
        porcentajeCoincidencia: res.porcentajeCoincidencia,
        datosExtraidos: res.datosExtraidos,
        coincidencias: res.coincidencias
      });
    } catch (err: any) {
      const mensaje =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Error al procesar la imagen';
      setError(mensaje);
      onValidacionCompletada({ exito: false, mensaje });
    } finally {
      setProcesando(false);
      setTimeout(() => setProgreso(0), 1000);
    }
  };

  const limpiar = () => {
    limpiarIntervalo();
    setArchivo(null);
    setVistaPrevia(null);
    setError('');
    setResultado(null);
    setProgreso(0);
  };

  // Render único con ramas condicionales
  return (
    <div className="validacion-ocr-container">
      <div className="validacion-content">
        {estadoActual === 'upload' && (
          <div className="upload-section">
            <div
              className="upload-area"
              onDrop={manejarSoltarArchivo}
              onDragOver={manejarArrastrarSobre}
            >
              <div className="upload-icon">
                <ImageIcon size={48} />
              </div>
              <h3>Sube tu comprobante de pago</h3>
              <p className="upload-text">
                Arrastra y suelta una imagen aquí o haz clic para seleccionar
              </p>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={manejarCambioArchivo}
                className="file-input"
                id="file-input-upload"
              />
              <label htmlFor="file-input-upload" className="upload-button">
                <Camera size={20} />
                Seleccionar archivo
              </label>
              <p className="upload-hint">
                Formatos: JPEG, PNG, GIF, BMP, TIFF, WebP o PDF (max 10MB)
              </p>
            </div>
            {error && (
              <div className="error-message">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>
        )}

        {estadoActual === 'preview' && (
          <div className="preview-section">
            <div className="preview-header">
              <h3>Vista previa del comprobante</h3>
              <button onClick={limpiar} className="clear-button">
                <XCircle size={20} />
                Cambiar imagen
              </button>
            </div>

            <div className="preview-content">
              {archivo?.type === 'application/pdf' ? (
                <div className="pdf-preview">
                  <FileText size={48} />
                  <p className="text-sm">Archivo PDF cargado</p>
                </div>
              ) : vistaPrevia ? (
                <img
                  src={vistaPrevia}
                  alt="Vista previa del comprobante"
                  className="preview-image"
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                />
              ) : (
                <div className="pdf-preview">
                  <FileText size={48} />
                  <p className="text-sm">Archivo listo para enviar</p>
                </div>
              )}

              {archivo && (
                <div className="preview-info">
                  <p className="file-name">{archivo.name}</p>
                  <p className="file-size">
                    {(archivo.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={procesarImagen}
              disabled={procesando}
              className="process-button"
            >
              {procesando && <div className="spinner"></div>}
              {procesando ? 'Procesando...' : (
                <>
                  <FileText size={20} />
                  Validar comprobante
                </>
              )}
            </button>

            {procesando && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progreso}%` }}
                  ></div>
                </div>
                <span className="progress-text">{progreso}%</span>
              </div>
            )}
          </div>
        )}

        {estadoActual === 'resultado' && resultado && (
          <div className={`result-section ${resultado.esValido ? 'success' : 'error'}`}>
            <div className="result-header">
              {resultado.esValido ? (
                <CheckCircle className="result-icon" />
              ) : (
                <XCircle className="result-icon" />
              )}
              <h3>{resultado.esValido ? 'Validación exitosa!' : 'Validación fallida'}</h3>
            </div>

            <div className="result-content">
              <div className="confidence-score">
                <span className="score-label">Porcentaje de coincidencia:</span>
                <span
                  className={`score-value ${
                    resultado.porcentajeCoincidencia >= 80
                      ? 'high'
                      : resultado.porcentajeCoincidencia >= 60
                      ? 'medium'
                      : 'low'
                  }`}
                >
                  {resultado.porcentajeCoincidencia}%
                </span>
              </div>

              {resultado.datosExtraidos && (
                <div className="extracted-data">
                  <h4>Datos extraídos:</h4>
                  <div className="data-grid">
                    {resultado.datosExtraidos.monto && (
                      <div className="data-item">
                        <span className="data-label">Monto:</span>
                        <span className="data-value">
                          {resultado.datosExtraidos.monto}
                        </span>
                      </div>
                    )}
                    {resultado.datosExtraidos.fecha && (
                      <div className="data-item">
                        <span className="data-label">Fecha:</span>
                        <span className="data-value">
                          {resultado.datosExtraidos.fecha}
                        </span>
                      </div>
                    )}
                    {resultado.datosExtraidos.referencia && (
                      <div className="data-item">
                        <span className="data-label">Referencia:</span>
                        <span className="data-value">
                          {resultado.datosExtraidos.referencia}
                        </span>
                      </div>
                    )}
                    {resultado.datosExtraidos.transaccion && (
                      <div className="data-item">
                        <span className="data-label">Transacción:</span>
                        <span className="data-value">
                          {resultado.datosExtraidos.transaccion}
                        </span>
                      </div>
                    )}
                    {resultado.datosExtraidos.banco && (
                      <div className="data-item">
                        <span className="data-label">Banco:</span>
                        <span className="data-value">
                          {resultado.datosExtraidos.banco}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {resultado.coincidencias && (
                <div className="match-results">
                  <h4>Coincidencias:</h4>
                  <div className="match-grid">
                    {(['monto', 'fecha', 'referencia', 'transaccion'] as const).map((campo) => (
                      <div
                        key={campo}
                        className={`match-item ${
                          resultado.coincidencias[campo] ? 'matched' : 'unmatched'
                        }`}
                      >
                        <span className="match-label">
                          {campo === 'monto'
                            ? 'Monto'
                            : campo === 'fecha'
                            ? 'Fecha'
                            : campo === 'referencia'
                            ? 'Referencia'
                            : 'Transacción'}
                        </span>
                        {resultado.coincidencias[campo] ? (
                          <CheckCircle className="match-icon matched" />
                        ) : (
                          <XCircle className="match-icon unmatched" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="result-message">{resultado.mensaje}</p>
            </div>

            {!resultado.esValido && (
              <div className="validation-tips">
                <h4>Consejos para una mejor validación:</h4>
                <ul>
                  <li>Asegúrate de que la imagen esté bien iluminada</li>
                  <li>Verifica que el texto del comprobante sea legible</li>
                  <li>Evita sombras o reflejos en la imagen</li>
                  <li>Captura toda la información del comprobante</li>
                  <li>Verifica que el monto y la referencia coincidan con tu pago</li>
                </ul>
              </div>
            )}

            <div className="result-actions" style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <button onClick={limpiar} className="clear-button" style={{ flex: 1 }}>
                Intentar de nuevo
              </button>
            </div>
          </div>
        )}

        {error && estadoActual !== 'resultado' && (
          <div className="error-message" style={{ marginTop: '12px' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidacionOCR;

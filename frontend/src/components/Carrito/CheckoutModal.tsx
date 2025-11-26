import { useState, useEffect } from 'react';
import { X, CreditCard, CheckCircle, AlertCircle, DollarSign, Loader2, QrCode, Upload } from 'lucide-react';
import { useCarrito } from '../../context/CarritoContext';
import { suscripcionService } from '../../services/suscripcionService';
import { pagoService, type MetodoPago, type QRCode } from '../../services/pagoService';
import ValidacionOCR from '../pagos/ValidacionOCR';
import './CheckoutModal.css';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CarritoItem {
  id: string;
  servicio: {
    id: string;
    nombre: string;
    precio: number;
  };
  cantidad: number;
}

type PasoCheckout = 'checkout' | 'procesando' | 'qr' | 'transferencia-info' | 'validacion-ocr' | 'completado' | 'error';

export default function CheckoutModal({ isOpen, onClose, onSuccess }: CheckoutModalProps) {
  const { state, obtenerCarrito } = useCarrito();
  const { carrito, resumen } = state;
  
  const [paso, setPaso] = useState<PasoCheckout>('checkout');
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState<string>('');
  const [metodosDisponibles, setMetodosDisponibles] = useState<MetodoPago[]>([]);
  const [metodoPagoPreferido, setMetodoPagoPreferido] = useState<MetodoPago | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para QR
  const [qrActual, setQrActual] = useState<QRCode | null>(null);
  const [tiempoRestante, setTiempoRestante] = useState<number>(0);
  const [intervalId, setIntervalId] = useState<number | null>(null);
  
  // Estados para validación OCR
  const [pagoActual, setPagoActual] = useState<any>(null);
  
  const [datosFacturacion, setDatosFacturacion] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: ''
  });

  const metodoSeleccionado = metodosDisponibles.find(m => m.id === metodoPagoSeleccionado);
  const pagoParaValidacion = pagoActual || (qrActual?.pagoId ? { id: qrActual.pagoId, monto: resumen?.total ? Number(resumen.total) : 0 } : null);

  const obtenerDatosTransferencia = () => {
    const cfg = (metodoSeleccionado?.configuracion || {}) as Record<string, any>;
    return {
      titular: cfg?.titular || import.meta.env.VITE_TRANSFER_TITULAR || 'Titular de la cuenta',
      documento: cfg?.documento || import.meta.env.VITE_TRANSFER_DOCUMENTO || 'Carnet de identidad',
      banco: cfg?.banco || import.meta.env.VITE_TRANSFER_BANCO || 'Banco',
      tipoCuenta: cfg?.tipoCuenta || import.meta.env.VITE_TRANSFER_TIPO || 'Cuenta corriente',
      numeroCuenta: cfg?.numeroCuenta || import.meta.env.VITE_TRANSFER_CUENTA || '00000000',
      correo: cfg?.correo || import.meta.env.VITE_TRANSFER_CORREO || ''
    };
  };
  const datosTransferencia = obtenerDatosTransferencia();

  useEffect(() => {
    if (isOpen) {
      if (metodosDisponibles.length === 0) {
        cargarMetodosPago();
      }
      resetearFormulario();
    }
  }, [isOpen]);

  // Limpiar intervalo al desmontar o cambiar de paso
  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  // Limpiar intervalo cuando se cambia de paso
  useEffect(() => {
    if (paso !== 'qr' && intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  }, [paso, intervalId]);

  const resetearFormulario = () => {
    setPaso('checkout');
    setMetodoPagoSeleccionado('');
    setProcesando(false);
    setError('');
    setQrActual(null);
    setTiempoRestante(0);
    setPagoActual(null);
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setDatosFacturacion({
      nombre: '',
      email: '',
      telefono: '',
      direccion: ''
    });
    // No limpiar metodosDisponibles para evitar recargas innecesarias
  };

  const cargarMetodosPago = async () => {
    try {
      const metodos = await pagoService.obtenerMetodosDisponibles();
      
      // Asegurar que metodos sea un array
      if (!Array.isArray(metodos)) {
        console.error('La respuesta de métodos de pago no es un array:', metodos);
        setMetodosDisponibles([]);
        setError('Error al cargar métodos de pago');
        return;
      }
      
      setMetodosDisponibles(metodos);
      
      // Buscar método preferido
      const preferido = metodos.find((m: MetodoPago & { preferido?: boolean; esPreferido?: boolean }) => 
        m.preferido || m.esPreferido
      );
      
      if (preferido) {
        setMetodoPagoPreferido(preferido);
        setMetodoPagoSeleccionado(preferido.id);
      } else if (metodos.length > 0) {
        // Si no hay preferido, seleccionar el primero disponible
        setMetodoPagoSeleccionado(metodos[0].id);
      }
    } catch (error) {
      console.error('Error al cargar métodos de pago:', error);
      setMetodosDisponibles([]);
      setError('Error al cargar métodos de pago');
    }
  };

  const validarDatos = () => {
    if (!datosFacturacion.nombre.trim()) {
      setError('El nombre es requerido');
      return false;
    }
    if (!datosFacturacion.email.trim()) {
      setError('El email es requerido');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(datosFacturacion.email)) {
      setError('El email no es válido');
      return false;
    }
    return true;
  };

  const procesarSuscripcion = () => {
    setError('');
    
    // Validar datos
    if (!validarDatos()) {
      return;
    }
    
    // Validar método de pago
    if (!metodoPagoSeleccionado) {
      setError('Selecciona un método de pago');
      return;
    }
    
    // Procesar directamente
    procesarPago();
  };

  const procesarPago = async () => {
    if (!carrito || !carrito.items || carrito.items.length === 0) {
      setError('Tu carrito está vacío. Agrega servicios antes de pagar.');
      setPaso('checkout');
      return;
    }

    try {
      setProcesando(true);
      setPaso('procesando');

      if (!metodoPagoSeleccionado) {
        setError('Selecciona un metodo de pago');
        setPaso('checkout');
        return;
      }

      if (metodoSeleccionado?.tipo === 'QR') {
        await procesarPagoQR(metodoSeleccionado);
      } else if (metodoSeleccionado?.tipo === 'TRANSFERENCIA') {
        await procesarPagoConOCR(metodoSeleccionado);
      } else {
        await suscripcionService.crearSuscripcionDesdeCarrito({
          metodoPagoId: metodoPagoSeleccionado
        });

        await obtenerCarrito();
        setPaso('completado');

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 3000);
      }

    } catch (error: any) {
      console.error('Error al procesar pago:', error);
      const apiMessage = error?.response?.data?.message || error?.message;
      setError(apiMessage || 'Error al procesar el pago');
      setPaso('error');
    } finally {
      setProcesando(false);
    }
  };

  const procesarPagoQR = async (_metodoPago?: MetodoPago) => {
    try {
      const resultado = await pagoService.procesarPago({
        metodoPagoId: metodoPagoSeleccionado,
        monto: resumen?.total ? Number(resumen.total) : 0,
        descripcion: 'Pago de suscripciones',
        datosFacturacion,
        generarQR: true,
        carritoId: carrito?.id
      });

      if (resultado.pago) {
        setPagoActual(resultado.pago);
      } else if (resultado.qr?.pagoId) {
        setPagoActual({
          id: resultado.qr.pagoId,
          monto: resumen?.total ? Number(resumen.total) : 0
        } as any);
      }
      if (resultado.qr) {
        setQrActual(resultado.qr);

        const ahora = Date.now();
        const expiracionServer = resultado.qr.expiresAt ? new Date(resultado.qr.expiresAt).getTime() : 0;
        const expiracionForzada = ahora + 3 * 60 * 1000;
        const tiempoExpiracion = expiracionServer ? Math.min(expiracionServer, expiracionForzada) : expiracionForzada;
        const tiempoRestanteMs = tiempoExpiracion - ahora;

        if (tiempoRestanteMs > 0) {
          setTiempoRestante(Math.floor(tiempoRestanteMs / 1000));

          const id = setInterval(() => {
            const tiempoActual = Date.now();
            const restante = Math.floor((tiempoExpiracion - tiempoActual) / 1000);

            if (restante <= 0) {
              setTiempoRestante(0);
              clearInterval(id);
              setIntervalId(null);
              setError('El codigo QR ha expirado. Por favor, intenta nuevamente.');
            } else {
              setTiempoRestante(restante);
              if (restante % 5 === 0 && resultado.qr) {
                verificarEstadoQR(resultado.qr.id);
              }
            }
          }, 1000);

          setIntervalId(id as unknown as number);
        }
      }

      if (!resultado.qr) {
        setError('No se pudo generar el codigo QR');
        setPaso('error');
        return;
      }

      setPaso('qr');
    } catch (error) {
      console.error('Error al procesar pago QR:', error);
      throw error;
    }
  };

  const verificarEstadoQR = async (qrId: string) => {
    try {
      const estado = await pagoService.consultarEstadoQR(qrId);

      if (estado.estado === 'USADO') {
        if (intervalId) {
          clearInterval(intervalId);
          setIntervalId(null);
        }
        setTiempoRestante(0);
        setPaso('validacion-ocr');
      } else if (estado.estado === 'EXPIRADO') {
        setError('El codigo QR ha expirado. Genera uno nuevo para continuar.');
        setPaso('error');
      }
    } catch (error) {
      console.error('Error al verificar estado QR:', error);
    }
  };

  const procesarPagoConOCR = async (_metodoPago?: MetodoPago) => {
    try {
      const resultado = await pagoService.procesarPago({
        metodoPagoId: metodoPagoSeleccionado,
        monto: resumen?.total ? Number(resumen.total) : 0,
        descripcion: 'Pago de suscripciones',
        datosFacturacion,
        carritoId: carrito?.id
      });

      if (resultado.pago) {
        setPagoActual(resultado.pago);
        setPaso('transferencia-info');
      } else if (resultado.qr?.pagoId) {
        setPagoActual({
          id: resultado.qr.pagoId,
          monto: resumen?.total ? Number(resumen.total) : 0
        } as any);
        setPaso('transferencia-info');
      } else {
        throw new Error('No se pudo crear el pago');
      }
    } catch (error) {
      console.error('Error al procesar pago con OCR:', error);
      throw error;
    }
  };

  const manejarValidacionOCRCompletada = (resultado: any) => {
    const esValido = resultado?.exito ?? resultado?.validacion?.esValido;
    if (esValido) {
      setPaso('completado');
      obtenerCarrito();

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    } else {
      setError(resultado?.mensaje || 'La validacion del comprobante fallo. Por favor, intenta nuevamente.');
      setPaso('error');
    }
  };

  const formatearTiempo = (segundos: number): string => {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
  };

  const cerrarModal = (e?: React.MouseEvent) => {
    // Prevenir cierre si se hace clic en el contenido del modal
    if (e && e.target !== e.currentTarget) {
      return;
    }
    
    if (paso === 'procesando') {
      // No permitir cerrar durante el procesamiento
      return;
    }
    
    resetearFormulario();
    onClose();
  };

  const formatearPrecio = (precio: number) => {
    return pagoService.formatearPrecio(precio);
  };

  const obtenerIconoMetodoPago = (tipo: string) => {
    switch (tipo) {
      case 'TARJETA_CREDITO':
      case 'TARJETA_DEBITO':
        return <CreditCard size={20} />;
      case 'TRANSFERENCIA':
        return <DollarSign size={20} />;
      case 'PAYPAL':
        return <span className="text-lg"></span>;
      case 'WEBPAY':
        return <span className="text-lg"></span>;
      default:
        return <CreditCard size={20} />;
    }
  };

  if (!isOpen || !carrito) return null;

  const tituloPaso =
    paso === 'checkout' ? 'Completar Suscripción' :
    paso === 'procesando' ? 'Procesando Pago...' :
    paso === 'qr' ? 'Pago con QR' :
    paso === 'transferencia-info' ? 'Datos para transferencia' :
    paso === 'validacion-ocr' ? 'Validar Comprobante' :
    paso === 'completado' ? '¡Compra Exitosa!' :
    'Error en el Pago';

  return (
    <div className="checkout-overlay" onClick={cerrarModal}>
      <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="checkout-header">
          <h2>
            {paso === 'checkout' && 'Completar Suscripción'}
            {paso === 'procesando' && 'Procesando Pago...'}
            {paso === 'qr' && 'Pago con QR'}
            {paso === 'transferencia-info' && 'Datos para transferencia'}
            {paso === 'validacion-ocr' && 'Validar Comprobante'}
            {paso === 'completado' && '¡Compra Exitosa!'}
            {paso === 'error' && 'Error en el Pago'}
          </h2>
          <button 
            onClick={() => cerrarModal()} 
            className="close-button"
            disabled={paso === 'procesando'}
          >
            <X size={24} />
          </button>
        </div>

        {/* Indicador de progreso simplificado */}
        <div className="progress-indicator">
          <div className={`progress-step ${['checkout', 'procesando', 'completado'].includes(paso) ? 'active' : ''}`}>1</div>
          <div className={`progress-step ${['procesando', 'completado'].includes(paso) ? 'active' : ''}`}>2</div>
          <div className={`progress-step ${['completado'].includes(paso) ? 'active' : ''}`}>3</div>
        </div>

        <div className="checkout-content">
          {/* Error */}
          {error && (
            <div className="error-message">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Paso 1: Checkout unificado */}
          {paso === 'checkout' && (
            <div className="checkout-step">
              {/* Resumen del pedido */}
              <div className="order-summary-compact">
                <h3>Tu pedido</h3>
                <div className="items-list-compact">
                  {carrito.items.map((item: CarritoItem) => (
                    <div key={item.servicio.id} className="checkout-item-compact">
                      <span className="item-name">{item.servicio.nombre}</span>
                      <span className="item-price">{formatearPrecio(item.servicio.precio * item.cantidad)}</span>
                    </div>
                  ))}
                </div>
                <div className="total-compact">
                  <strong>Total: {formatearPrecio(parseFloat(resumen?.total || '0'))}</strong>
                </div>
              </div>

              {/* Datos de facturación */}
              <div className="billing-section">
                <h3>Datos de facturación</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="nombre">Nombre completo *</label>
                    <input
                      type="text"
                      id="nombre"
                      value={datosFacturacion.nombre}
                      onChange={(e) => setDatosFacturacion(prev => ({ ...prev, nombre: e.target.value }))}
                      className="form-input"
                      placeholder="Tu nombre completo"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                      type="email"
                      id="email"
                      value={datosFacturacion.email}
                      onChange={(e) => setDatosFacturacion(prev => ({ ...prev, email: e.target.value }))}
                      className="form-input"
                      placeholder="tu@email.com"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="telefono">Teléfono</label>
                    <input
                      type="tel"
                      id="telefono"
                      value={datosFacturacion.telefono}
                      onChange={(e) => setDatosFacturacion(prev => ({ ...prev, telefono: e.target.value }))}
                      className="form-input"
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="direccion">Dirección</label>
                    <input
                      type="text"
                      id="direccion"
                      value={datosFacturacion.direccion}
                      onChange={(e) => setDatosFacturacion(prev => ({ ...prev, direccion: e.target.value }))}
                      className="form-input"
                      placeholder="Tu dirección"
                    />
                  </div>
                </div>
              </div>

              {/* Método de pago */}
              <div className="payment-section">
                <h3>Método de pago</h3>
                {metodoPagoPreferido && (
                  <div className="preferred-method">
                    <span className="preferred-label">Método preferido:</span>
                    <span className="preferred-name">{metodoPagoPreferido.nombre}</span>
                  </div>
                )}
                <div className="payment-methods">
                  {metodosDisponibles.map((metodo) => (
                    <label key={metodo.id} className="payment-option">
                      <input
                        type="radio"
                        name="metodoPago"
                        value={metodo.id}
                        checked={metodoPagoSeleccionado === metodo.id}
                        onChange={(e) => setMetodoPagoSeleccionado(e.target.value)}
                      />
                      <div className="payment-info">
                        {obtenerIconoMetodoPago(metodo.tipo)}
                        <div className="payment-details">
                          <span className="payment-name">{metodo.nombre}</span>
                          <span className="payment-description">{metodo.descripcion}</span>
                        </div>
                        {metodo.id === metodoPagoPreferido?.id && (
                          <span className="preferred-badge">Preferido</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Paso 2: Procesando */}
          {paso === 'procesando' && (
            <div className="checkout-step processing">
              <div className="processing-content">
                <Loader2 size={48} className="spinner" />
                <h3>Procesando tu pago...</h3>
                <p>Por favor espera mientras procesamos tu transacción</p>
              </div>
            </div>
          )}

          {/* Paso 3: QR */}
          {paso === 'qr' && (
          <div className="qr-paso">
            <div className="qr-header">
              <QrCode className="qr-icon" />
              <h3>Escanea el codigo QR</h3>
              <p>Usa tu aplicacion de pagos movil para escanear el codigo. Tienes 3 minutos.</p>
            </div>
            
            {qrActual && (
              <div className="qr-container">
                <div className="qr-code">
                   <img 
                     src={`data:image/png;base64,${qrActual.imagenBase64}`} 
                     alt="Codigo QR para pago" 
                     className="qr-image"
                   />
                 </div>
                 
                 <div className="qr-info">
                   <div className="qr-amount">
                     <span className="amount-label">Monto a pagar:</span>
                     <span className="amount-value">${resumen?.total ? Number(resumen.total).toFixed(2) : '0.00'}</span>
                   </div>
                  
                  <div className="qr-timer">
                    <span className="timer-label">Tiempo restante:</span>
                    <span className="timer-value">{formatearTiempo(tiempoRestante || 0)}</span>
                  </div>
                  
                  <div className="qr-status">
                    <div className="status-indicator">
                      <div className="pulse-dot"></div>
                      <span>{tiempoRestante > 0 ? 'Esperando pago...' : 'Si ya pagaste, valida tu comprobante.'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="qr-actions">
              <button 
                type="button" 
                onClick={() => setPaso('checkout')}
                className="btn-secondary"
              >
                Volver
              </button>
              <button 
                type="button" 
                onClick={() => verificarEstadoQR(qrActual?.id || '')}
                className="btn-secondary"
                disabled={!qrActual}
              >
                Verificar pago
              </button>
              <button
                type="button"
                onClick={() => setPaso('validacion-ocr')}
                className="btn-primary"
                disabled={!pagoParaValidacion}
              >
                Subir comprobante
              </button>
            </div>
            <p className="text-sm text-gray-600 text-center mt-3">
              Al escanear el QR sube el comprobante para validar tu pago.
            </p>
          </div>
        )}

        {paso === 'transferencia-info' && pagoParaValidacion && (
          <div className="validacion-ocr-paso">
            <div className="validacion-header">
              <Upload className="validacion-icon" />
              <h3>Datos para transferencia</h3>
              <p>Realiza la transferencia con estos datos y continua para subir el comprobante.</p>
            </div>
            <div className="transferencia-detalle">
              <div className="detalle-row">
                <span>Nombre del titular</span>
                <strong>{datosTransferencia.titular}</strong>
              </div>
              <div className="detalle-row">
                <span>Carnet/Documento</span>
                <strong>{datosTransferencia.documento}</strong>
              </div>
              <div className="detalle-row">
                <span>Banco</span>
                <strong>{datosTransferencia.banco}</strong>
              </div>
              <div className="detalle-row">
                <span>Tipo de cuenta</span>
                <strong>{datosTransferencia.tipoCuenta}</strong>
              </div>
              <div className="detalle-row">
                <span>Numero de cuenta</span>
                <strong>{datosTransferencia.numeroCuenta}</strong>
              </div>
              {datosTransferencia.correo && (
                <div className="detalle-row">
                  <span>Correo para notificar</span>
                  <strong>{datosTransferencia.correo}</strong>
                </div>
              )}
            </div>

            <div className="validacion-actions">
              <button 
                type="button" 
                onClick={() => setPaso('checkout')}
                className="btn-secondary"
              >
                Cambiar metodo
              </button>
              <button 
                type="button" 
                onClick={() => setPaso('validacion-ocr')}
                className="btn-primary"
              >
                Continuar para subir comprobante
              </button>
            </div>
          </div>
        )}

        {/* Paso 4: Validacion OCR */}
        {paso === 'validacion-ocr' && pagoParaValidacion && (
          <div className="validacion-ocr-paso">
            <div className="validacion-header">
              <Upload className="validacion-icon" />
              <h3>Validar comprobante de pago</h3>
              <p>Sube una imagen o PDF de tu comprobante para validar el pago</p>
            </div>
            
            <ValidacionOCR
              pagoId={pagoParaValidacion.id}
              monto={pagoParaValidacion.monto}
              onValidacionCompletada={manejarValidacionOCRCompletada}
            />
            
            <div className="validacion-actions">
              <button 
                type="button" 
                onClick={() => setPaso('checkout')}
                className="btn-secondary"
              >
                Volver
              </button>
            </div>
          </div>
        )}

        {paso === 'completado' && (
            <div className="checkout-step success">
              <div className="success-content">
                <CheckCircle size={48} className="success-icon" />
                <h3>¡Pago completado exitosamente!</h3>
                <p>Tus suscripciones han sido activadas</p>
                <p className="auto-close-message">Esta ventana se cerrará automáticamente en unos segundos...</p>
              </div>
            </div>
          )}

          {/* Error */}
          {paso === 'error' && (
            <div className="checkout-step error">
              <div className="error-content">
                <AlertCircle size={48} className="error-icon" />
                <h3>Error en el procesamiento</h3>
                <p>{error}</p>
                <button 
                  onClick={() => setPaso('checkout')}
                  className="retry-button"
                >
                  Intentar nuevamente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        {paso === 'checkout' && (
          <div className="checkout-footer">
            <button
              onClick={() => cerrarModal()}
              className="btn-secondary"
              disabled={procesando}
            >
              Cancelar
            </button>
   
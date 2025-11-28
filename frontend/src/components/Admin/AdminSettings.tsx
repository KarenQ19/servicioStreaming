import { useState, useEffect } from 'react';
import { 
  Save, 
  RefreshCw, 
  Shield, 
  Bell, 
  Database, 
  Globe,
  Lock,
  Eye,
  EyeOff,
  CreditCard
} from 'lucide-react';
import { adminService, type PaymentConfig, type TransferData } from '../../services/adminService';

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  adminEmail: string;
  supportEmail: string;
  maxUsersPerService: number;
  sessionTimeout: number;
  enableNotifications: boolean;
  enableRegistration: boolean;
  requireEmailVerification: boolean;
  maintenanceMode: boolean;
}

const AdminSettings = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    siteName: 'StreamingPlatform',
    siteDescription: 'Plataforma de servicios de streaming',
    adminEmail: 'admin@streaming.com',
    supportEmail: 'support@streaming.com',
    maxUsersPerService: 1000,
    sessionTimeout: 30,
    enableNotifications: true,
    enableRegistration: true,
    requireEmailVerification: true,
    maintenanceMode: false
  });

  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({});
  const [transferForm, setTransferForm] = useState<TransferData>({});
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  useEffect(() => {
    const cargarConfigPagos = async () => {
      try {
        const cfg = await adminService.obtenerConfiguracionPagos();
        setPaymentConfig(cfg);
        setTransferForm(cfg.transferencia || {});
      } catch (error) {
        console.error('Error cargando configuración de pagos:', error);
      }
    };
    cargarConfigPagos();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Implementar guardado de configuración
      console.log('Guardando configuración:', settings);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular guardado
      alert('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error guardando configuración:', error);
      alert('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (key: keyof SystemSettings, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleTransferChange = (key: keyof TransferData, value: string) => {
    setTransferForm(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveTransfer = async () => {
    setIsSavingPayment(true);
    try {
      const cfg = await adminService.actualizarTransferencia(transferForm);
      setPaymentConfig(cfg);
      alert('Datos de transferencia guardados');
    } catch (error) {
      console.error('Error guardando transferencia:', error);
      alert('Error al guardar datos de transferencia');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleQrUpload = async (file?: File) => {
    if (!file) return;
    setIsSavingPayment(true);
    try {
      const cfg = await adminService.subirQr(file);
      setPaymentConfig(cfg);
      alert('QR actualizado');
    } catch (error) {
      console.error('Error subiendo QR:', error);
      alert('Error al subir QR');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'payments', label: 'Pagos', icon: CreditCard },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'database', label: 'Base de Datos', icon: Database },
    { id: 'api', label: 'API', icon: Lock }
  ];

  return (
    <div className="admin-settings space-y-4">
      {/* Header */}
      <div className="settings-header bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="header-left">
          <h2 className="text-xl font-semibold text-gray-900">Configuración del Sistema</h2>
          <p className="text-sm text-gray-600">Administra la configuración general de la plataforma</p>
        </div>
        <div className="header-actions flex gap-2">
          <button 
            className="btn-secondary flex items-center gap-2"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={16} />
            Restablecer
          </button>
          <button 
            className="btn-primary flex items-center gap-2"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save size={16} />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* Tabs */}
        <div className="settings-tabs flex flex-wrap border-b border-gray-200">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="settings-content p-6 space-y-6">
        {activeTab === 'general' && (
          <div className="settings-section card">
            <h3 className="section-title">Configuración General</h3>
            <p className="section-subtitle">Datos básicos de la plataforma</p>
            <div className="settings-grid">
              <div className="setting-item">
                <label>Nombre del Sitio</label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => handleInputChange('siteName', e.target.value)}
                  placeholder="Nombre de la plataforma"
                />
              </div>

              <div className="setting-item col-span-2">
                <label>Descripción</label>
                <textarea
                  value={settings.siteDescription}
                  onChange={(e) => handleInputChange('siteDescription', e.target.value)}
                  placeholder="Descripción de la plataforma"
                  rows={3}
                />
              </div>

              <div className="setting-item">
                <label>Email del Administrador</label>
                <input
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                  placeholder="admin@ejemplo.com"
                />
              </div>

              <div className="setting-item">
                <label>Email de Soporte</label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                  placeholder="soporte@ejemplo.com"
                />
              </div>

              <div className="setting-item">
                <label>Máximo de Usuarios por Servicio</label>
                <input
                  type="number"
                  value={settings.maxUsersPerService}
                  onChange={(e) => handleInputChange('maxUsersPerService', parseInt(e.target.value))}
                  min="1"
                />
              </div>

              <div className="setting-item">
                <label>Tiempo de Sesión (minutos)</label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                  min="5"
                  max="1440"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="settings-section card">
            <h3 className="section-title">Pagos: QR y Transferencia</h3>
            <p className="section-subtitle">Configura la imagen QR y los datos de transferencia que verá el cliente.</p>
            <div className="settings-grid">
              <div className="setting-item col-span-2">
                <label>Imagen QR (visible para el cliente)</label>
                <div className="flex items-start gap-4">
                  {paymentConfig.qrImageBase64 && (
                    <img
                      src={paymentConfig.qrImageBase64}
                      alt="QR actual"
                      className="w-32 h-32 object-contain rounded border"
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={(e) => handleQrUpload(e.target.files?.[0] || undefined)}
                      disabled={isSavingPayment}
                    />
                    <small className="text-gray-500">Sube un PNG/JPG. Esta imagen se mostrará al cliente para pagos QR.</small>
                  </div>
                </div>
              </div>

              <div className="setting-item">
                <label>Nombre del titular</label>
                <input
                  type="text"
                  value={transferForm.titular || ''}
                  onChange={(e) => handleTransferChange('titular', e.target.value)}
                  placeholder="Titular de la cuenta"
                />
              </div>
              <div className="setting-item">
                <label>Documento</label>
                <input
                  type="text"
                  value={transferForm.documento || ''}
                  onChange={(e) => handleTransferChange('documento', e.target.value)}
                  placeholder="CI/RUT/Documento"
                />
              </div>
              <div className="setting-item">
                <label>Banco</label>
                <input
                  type="text"
                  value={transferForm.banco || ''}
                  onChange={(e) => handleTransferChange('banco', e.target.value)}
                  placeholder="Banco"
                />
              </div>
              <div className="setting-item">
                <label>Tipo de cuenta</label>
                <input
                  type="text"
                  value={transferForm.tipoCuenta || ''}
                  onChange={(e) => handleTransferChange('tipoCuenta', e.target.value)}
                  placeholder="Cuenta corriente / ahorro"
                />
              </div>
              <div className="setting-item">
                <label>Número de cuenta</label>
                <input
                  type="text"
                  value={transferForm.numeroCuenta || ''}
                  onChange={(e) => handleTransferChange('numeroCuenta', e.target.value)}
                  placeholder="000000000"
                />
              </div>
              <div className="setting-item">
                <label>Correo para notificación</label>
                <input
                  type="email"
                  value={transferForm.correo || ''}
                  onChange={(e) => handleTransferChange('correo', e.target.value)}
                  placeholder="correo@banco.com"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                className="btn-primary"
                onClick={handleSaveTransfer}
                disabled={isSavingPayment}
              >
                {isSavingPayment ? 'Guardando...' : 'Guardar configuración de pagos'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="settings-section">
            <h3>Configuración de Seguridad</h3>
            <div className="settings-grid">
              <div className="setting-item checkbox-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.enableRegistration}
                    onChange={(e) => handleInputChange('enableRegistration', e.target.checked)}
                  />
                  <span>Permitir registro de nuevos usuarios</span>
                </label>
              </div>

              <div className="setting-item checkbox-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.requireEmailVerification}
                    onChange={(e) => handleInputChange('requireEmailVerification', e.target.checked)}
                  />
                  <span>Requerir verificación de email</span>
                </label>
              </div>

              <div className="setting-item checkbox-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
                  />
                  <span>Modo de mantenimiento</span>
                </label>
                <small>Cuando está activo, solo los administradores pueden acceder</small>
              </div>

              <div className="setting-item">
                <label>Política de Contraseñas</label>
                <div className="password-policy">
                  <div className="policy-item">
                    <input type="checkbox" defaultChecked />
                    <span>Mínimo 8 caracteres</span>
                  </div>
                  <div className="policy-item">
                    <input type="checkbox" defaultChecked />
                    <span>Al menos una mayúscula</span>
                  </div>
                  <div className="policy-item">
                    <input type="checkbox" defaultChecked />
                    <span>Al menos un número</span>
                  </div>
                  <div className="policy-item">
                    <input type="checkbox" />
                    <span>Al menos un carácter especial</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="settings-section">
            <h3>Configuración de Notificaciones</h3>
            <div className="settings-grid">
              <div className="setting-item checkbox-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.enableNotifications}
                    onChange={(e) => handleInputChange('enableNotifications', e.target.checked)}
                  />
                  <span>Habilitar notificaciones del sistema</span>
                </label>
              </div>

              <div className="notification-types">
                <h4>Tipos de Notificaciones</h4>
                <div className="notification-item">
                  <label className="checkbox-label">
                    <input type="checkbox" defaultChecked />
                    <span>Nuevos registros de usuarios</span>
                  </label>
                </div>
                <div className="notification-item">
                  <label className="checkbox-label">
                    <input type="checkbox" defaultChecked />
                    <span>Nuevas suscripciones</span>
                  </label>
                </div>
                <div className="notification-item">
                  <label className="checkbox-label">
                    <input type="checkbox" defaultChecked />
                    <span>Pagos procesados</span>
                  </label>
                </div>
                <div className="notification-item">
                  <label className="checkbox-label">
                    <input type="checkbox" />
                    <span>Errores del sistema</span>
                  </label>
                </div>
                <div className="notification-item">
                  <label className="checkbox-label">
                    <input type="checkbox" />
                    <span>Actualizaciones de servicios</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="settings-section">
            <h3>Configuración de Base de Datos</h3>
            <div className="database-info">
              <div className="info-card">
                <h4>Estado de la Base de Datos</h4>
                <div className="status-indicator">
                  <span className="status-dot active"></span>
                  <span>Conectado</span>
                </div>
                <div className="db-stats">
                  <div className="stat-item">
                    <span className="stat-label">Usuarios:</span>
                    <span className="stat-value">2,456</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Servicios:</span>
                    <span className="stat-value">15</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Transacciones:</span>
                    <span className="stat-value">12,847</span>
                  </div>
                </div>
              </div>

              <div className="database-actions">
                <button className="btn-secondary">
                  <Database size={16} />
                  Crear Respaldo
                </button>
                <button className="btn-secondary">
                  <RefreshCw size={16} />
                  Optimizar Base de Datos
                </button>
                <button className="btn-danger">
                  <Database size={16} />
                  Limpiar Logs Antiguos
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="settings-section">
            <h3>Configuración de API</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <label>Clave API</label>
                <div className="api-key-container">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value="sk_live_1234567890abcdef"
                    readOnly
                    className="api-key-input"
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <small>Esta clave se usa para autenticar las solicitudes a la API</small>
              </div>

              <div className="setting-item">
                <label>Límite de Solicitudes por Hora</label>
                <input
                  type="number"
                  defaultValue={1000}
                  min="100"
                  max="10000"
                />
                <small>Número máximo de solicitudes por hora por cliente</small>
              </div>

              <div className="api-endpoints">
                <h4>Endpoints Disponibles</h4>
                <div className="endpoint-list">
                  <div className="endpoint-item">
                    <span className="method get">GET</span>
                    <span className="path">/api/v1/servicios</span>
                    <span className="description">Obtener lista de servicios</span>
                  </div>
                  <div className="endpoint-item">
                    <span className="method post">POST</span>
                    <span className="path">/api/v1/usuarios</span>
                    <span className="description">Crear nuevo usuario</span>
                  </div>
                  <div className="endpoint-item">
                    <span className="method get">GET</span>
                    <span className="path">/api/v1/reportes</span>
                    <span className="description">Obtener reportes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default AdminSettings;

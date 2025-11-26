"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metodoPagoController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.metodoPagoController = {
    seleccionar: async (req, res) => {
        try {
            const { metodoPagoId } = req.body;
            const clienteId = req.user?.id;
            if (!clienteId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            const metodoPago = await prisma.metodoPago.findFirst({
                where: {
                    id: metodoPagoId,
                    disponible: true
                }
            });
            if (!metodoPago) {
                return res.status(404).json({
                    success: false,
                    message: 'Método de pago no encontrado o no disponible'
                });
            }
            const cliente = await prisma.cliente.findUnique({
                where: { id: clienteId }
            });
            if (!cliente) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente no encontrado'
                });
            }
            return res.json({
                success: true,
                data: {
                    cliente: {
                        id: cliente.id,
                        nombre: cliente.nombre,
                        email: cliente.email
                    },
                    metodoPagoSeleccionado: metodoPago
                },
                message: 'Método de pago seleccionado exitosamente'
            });
        }
        catch (error) {
            console.error('Error al seleccionar método de pago:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    obtenerMetodosDisponibles: async (req, res) => {
        try {
            const clienteId = req.user?.id;
            const metodosPago = await prisma.metodoPago.findMany({
                where: { disponible: true },
                orderBy: [
                    { tipo: 'asc' },
                    { nombre: 'asc' }
                ]
            });
            let metodoPagoPreferido = null;
            if (clienteId) {
                const cliente = await prisma.cliente.findUnique({
                    where: { id: clienteId }
                });
                metodoPagoPreferido = null;
            }
            const metodosPorTipo = metodosPago.reduce((acc, metodo) => {
                if (!acc[metodo.tipo]) {
                    acc[metodo.tipo] = [];
                }
                acc[metodo.tipo].push({
                    ...metodo,
                    esPreferido: metodoPagoPreferido?.id === metodo.id
                });
                return acc;
            }, {});
            const estadisticas = {
                totalMetodos: metodosPago.length,
                tiposDisponibles: Object.keys(metodosPorTipo),
                metodosPopulares: metodosPago
                    .filter((m) => ['TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA'].includes(m.tipo))
                    .slice(0, 3)
            };
            return res.json({
                success: true,
                data: {
                    metodosPago,
                    metodosPorTipo,
                    metodoPagoPreferido,
                    estadisticas
                }
            });
        }
        catch (error) {
            console.error('Error al obtener métodos de pago:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    validarMetodo: async (req, res) => {
        try {
            const { id } = req.params;
            const clienteId = req.user?.id;
            const metodoPago = await prisma.metodoPago.findUnique({
                where: { id }
            });
            if (!metodoPago) {
                return res.status(404).json({
                    success: false,
                    message: 'Método de pago no encontrado'
                });
            }
            const validaciones = {
                existe: true,
                estaDisponible: metodoPago.disponible,
                tipoValido: ['TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA', 'EFECTIVO', 'BILLETERA_DIGITAL'].includes(metodoPago.tipo),
                tieneDescripcion: !!metodoPago.descripcion,
                esPreferido: false
            };
            if (clienteId) {
                const cliente = await prisma.cliente.findUnique({
                    where: { id: clienteId }
                });
                validaciones.esPreferido = false;
            }
            const esValido = validaciones.existe &&
                validaciones.estaDisponible &&
                validaciones.tipoValido;
            let informacionAdicional = {};
            switch (metodoPago.tipo) {
                case 'TARJETA_CREDITO':
                case 'TARJETA_DEBITO':
                    informacionAdicional = {
                        requiereValidacion: true,
                        camposRequeridos: ['numero', 'cvv', 'fechaExpiracion', 'nombreTitular'],
                        procesamientoInstantaneo: true
                    };
                    break;
                case 'TRANSFERENCIA':
                    informacionAdicional = {
                        requiereValidacion: false,
                        tiempoProcessamiento: '1-3 días hábiles',
                        procesamientoInstantaneo: false
                    };
                    break;
                case 'QR':
                    informacionAdicional = {
                        requiereValidacion: true,
                        procesamientoInstantaneo: true,
                        soportaQR: true
                    };
                    break;
                case 'EFECTIVO':
                    informacionAdicional = {
                        requiereValidacion: false,
                        procesamientoInstantaneo: false,
                        requierePresenciaFisica: true
                    };
                    break;
            }
            return res.json({
                success: true,
                data: {
                    metodoPago,
                    validaciones,
                    esValido,
                    informacionAdicional,
                    recomendaciones: esValido ? [] : [
                        !validaciones.estaDisponible ? 'Método de pago no disponible temporalmente' : null,
                        !validaciones.tipoValido ? 'Tipo de método de pago no soportado' : null
                    ].filter(Boolean)
                }
            });
        }
        catch (error) {
            console.error('Error al validar método de pago:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    obtenerMetodoPreferido: async (req, res) => {
        try {
            const clienteId = req.user?.id;
            if (!clienteId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            const cliente = await prisma.cliente.findUnique({
                where: { id: clienteId }
            });
            if (!cliente) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente no encontrado'
                });
            }
            return res.json({
                success: true,
                data: {
                    metodoPagoPreferido: null,
                    tieneMetodoPreferido: false
                }
            });
        }
        catch (error) {
            console.error('Error al obtener método preferido:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    removerMetodoPreferido: async (req, res) => {
        try {
            const clienteId = req.user?.id;
            if (!clienteId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            return res.json({
                success: true,
                message: 'Método de pago preferido removido exitosamente'
            });
        }
        catch (error) {
            console.error('Error al remover método preferido:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
};
//# sourceMappingURL=metodoPagoController.js.map
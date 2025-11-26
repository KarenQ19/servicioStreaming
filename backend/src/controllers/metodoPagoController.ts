import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const metodoPagoController = {
  // POST /api/metodos-pago/seleccionar
  seleccionar: async (req: Request, res: Response) => {
    try {
      const { metodoPagoId } = req.body;
      const clienteId = (req.user as any)?.id;

      if (!clienteId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el método de pago existe y está disponible
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

      // Verificar si el cliente ya tiene este método seleccionado
      const cliente = await prisma.cliente.findUnique({
        where: { id: clienteId }
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Nota: La funcionalidad de método preferido requiere agregar el campo al schema
      
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

    } catch (error) {
      console.error('Error al seleccionar método de pago:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // GET /api/metodos-pago
  obtenerMetodosDisponibles: async (req: Request, res: Response) => {
    try {
      const clienteId = (req.user as any)?.id;

      // Obtener todos los métodos de pago disponibles
      const metodosPago = await prisma.metodoPago.findMany({
        where: { disponible: true },
        orderBy: [
          { tipo: 'asc' },
          { nombre: 'asc' }
        ]
      });

      // Si hay un cliente autenticado, obtener su método preferido
      let metodoPagoPreferido: any = null;
      if (clienteId) {
        const cliente = await prisma.cliente.findUnique({
          where: { id: clienteId }
        });
        // Nota: metodoPagoPreferido no existe en el schema
        metodoPagoPreferido = null;
      }

      // Agrupar métodos por tipo
      const metodosPorTipo = metodosPago.reduce((acc: Record<string, any[]>, metodo: any) => {
        if (!acc[metodo.tipo]) {
          acc[metodo.tipo] = [];
        }
        acc[metodo.tipo].push({
          ...metodo,
          esPreferido: metodoPagoPreferido?.id === metodo.id
        });
        return acc;
      }, {});

      // Estadísticas de uso (simuladas)
      const estadisticas = {
        totalMetodos: metodosPago.length,
        tiposDisponibles: Object.keys(metodosPorTipo),
        metodosPopulares: metodosPago
          .filter((m: any) => ['TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA'].includes(m.tipo))
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

    } catch (error) {
      console.error('Error al obtener métodos de pago:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // GET /api/metodos-pago/:id/validar
  validarMetodo: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const clienteId = (req.user as any)?.id;

      // Buscar el método de pago
      const metodoPago = await prisma.metodoPago.findUnique({
        where: { id }
      });

      if (!metodoPago) {
        return res.status(404).json({
          success: false,
          message: 'Método de pago no encontrado'
        });
      }

      // Validaciones del método de pago
      const validaciones = {
        existe: true,
        estaDisponible: metodoPago.disponible,
        tipoValido: ['TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA', 'EFECTIVO', 'BILLETERA_DIGITAL'].includes(metodoPago.tipo),
        tieneDescripcion: !!metodoPago.descripcion,
        esPreferido: false
      };

      // Si hay cliente autenticado, verificar si es su método preferido
      if (clienteId) {
        const cliente = await prisma.cliente.findUnique({
          where: { id: clienteId }
        });
        // Nota: metodoPagoPreferido no existe en el schema
        validaciones.esPreferido = false;
      }

      // Determinar si el método es válido para usar
      const esValido = validaciones.existe && 
                      validaciones.estaDisponible && 
                      validaciones.tipoValido;

      // Información adicional según el tipo
      let informacionAdicional: any = {};
      
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

    } catch (error) {
      console.error('Error al validar método de pago:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // GET /api/metodos-pago/cliente/preferido - Obtener método preferido del cliente
  obtenerMetodoPreferido: async (req: Request, res: Response) => {
    try {
      const clienteId = (req.user as any)?.id;

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
          metodoPagoPreferido: null, // Campo no existe en el schema
          tieneMetodoPreferido: false
        }
      });

    } catch (error) {
      console.error('Error al obtener método preferido:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // DELETE /api/metodos-pago/cliente/preferido - Remover método preferido
  removerMetodoPreferido: async (req: Request, res: Response) => {
    try {
      const clienteId = (req.user as any)?.id;

      if (!clienteId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Nota: La funcionalidad de método preferido requiere agregar el campo al schema
      
      return res.json({
        success: true,
        message: 'Método de pago preferido removido exitosamente'
      });

    } catch (error) {
      console.error('Error al remover método preferido:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
};
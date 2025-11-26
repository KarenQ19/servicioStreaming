const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function consultarBaseDatos() {
  try {
    console.log('🔍 Consultando información de la base de datos...\n');

    // Consultar usuarios
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        createdAt: true
      }
    });
    console.log('👥 USUARIOS:');
    console.table(usuarios);

    // Consultar servicios
    const servicios = await prisma.servicio.findMany({
      select: {
        id: true,
        nombre: true,
        categoria: true,
        precio: true,
        disponible: true,
        administrador: {
          select: {
            nombre: true,
            email: true
          }
        },
        _count: {
          select: {
            suscripciones: true,
            carritoItems: true
          }
        }
      }
    });
    console.log('\n🎬 SERVICIOS:');
    console.table(servicios.map(s => ({
      id: s.id,
      nombre: s.nombre,
      categoria: s.categoria,
      precio: s.precio,
      disponible: s.disponible,
      admin: s.administrador.nombre,
      suscripciones: s._count.suscripciones,
      enCarritos: s._count.carritoItems
    })));

    // Consultar suscripciones
    const suscripciones = await prisma.suscripcion.findMany({
      select: {
        id: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
        cliente: {
          select: {
            nombre: true,
            email: true
          }
        },
        servicio: {
          select: {
            nombre: true,
            precio: true
          }
        }
      }
    });
    console.log('\n📋 SUSCRIPCIONES:');
    console.table(suscripciones.map(s => ({
      id: s.id,
      estado: s.estado,
      cliente: s.cliente.nombre,
      servicio: s.servicio.nombre,
      precio: s.servicio.precio,
      inicio: s.fechaInicio?.toISOString().split('T')[0],
      fin: s.fechaFin?.toISOString().split('T')[0]
    })));

    // Consultar carritos
    const carritos = await prisma.carrito.findMany({
      select: {
        id: true,
        cliente: {
          select: {
            nombre: true,
            email: true
          }
        },
        items: {
          select: {
            id: true,
            cantidad: true,
            servicio: {
              select: {
                nombre: true,
                precio: true
              }
            }
          }
        }
      }
    });
    console.log('\n🛒 CARRITOS:');
    carritos.forEach(carrito => {
      console.log(`\nCarrito de ${carrito.cliente.nombre}:`);
      if (carrito.items.length > 0) {
        console.table(carrito.items.map(item => ({
          servicio: item.servicio.nombre,
          cantidad: item.cantidad,
          precio: item.servicio.precio
        })));
      } else {
        console.log('  - Carrito vacío');
      }
    });

    // Consultar credenciales
    const credenciales = await prisma.credencial.findMany({
      select: {
        id: true,
        usuario: true,
        password: true,
        activa: true,
        servicio: {
          select: {
            nombre: true
          }
        },
        suscripcion: {
          select: {
            cliente: {
              select: {
                nombre: true
              }
            }
          }
        }
      }
    });
    console.log('\n🔐 CREDENCIALES:');
    console.table(credenciales.map(c => ({
      id: c.id,
      servicio: c.servicio.nombre,
      usuario: c.usuario,
      password: c.password,
      activa: c.activa,
      asignada_a: c.suscripcion?.cliente?.nombre || 'No asignada'
    })));

    console.log('\n✅ Consulta completada');

  } catch (error) {
    console.error('❌ Error al consultar la base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

consultarBaseDatos();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestCredentials() {
  try {
    console.log('🔑 Creando credenciales de prueba para Netflix Premium y Spotify Premium...\n');

    // 1. BUSCAR LOS SERVICIOS ESPECÍFICOS
    const netflixService = await prisma.servicio.findFirst({
      where: { nombre: 'Netflix Premium' }
    });

    const spotifyService = await prisma.servicio.findFirst({
      where: { nombre: 'Spotify Premium' }
    });

    if (!netflixService) {
      console.log('❌ No se encontró el servicio Netflix Premium');
      return;
    }

    if (!spotifyService) {
      console.log('❌ No se encontró el servicio Spotify Premium');
      return;
    }

    console.log(`✅ Netflix Premium encontrado: ${netflixService.id}`);
    console.log(`✅ Spotify Premium encontrado: ${spotifyService.id}`);

    // 2. CREAR CREDENCIALES PARA NETFLIX PREMIUM
    console.log('\n🎬 Creando credenciales para Netflix Premium...');
    
    const netflixCredentials = [
      { usuario: 'netflix_test1@example.com', password: 'netflix123' },
      { usuario: 'netflix_test2@example.com', password: 'netflix456' },
      { usuario: 'netflix_test3@example.com', password: 'netflix789' }
    ];

    for (const cred of netflixCredentials) {
      const existingCred = await prisma.credenciales.findFirst({
        where: {
          servicioId: netflixService.id,
          usuario: cred.usuario
        }
      });

      if (!existingCred) {
        await prisma.credenciales.create({
          data: {
            servicioId: netflixService.id,
            usuario: cred.usuario,
            password: cred.password,
            activas: true,
            asignadas: false
          }
        });
        console.log(`  ✅ Creada: ${cred.usuario}`);
      } else {
        console.log(`  ⚠️ Ya existe: ${cred.usuario}`);
      }
    }

    // 3. CREAR CREDENCIALES PARA SPOTIFY PREMIUM
    console.log('\n🎵 Creando credenciales para Spotify Premium...');
    
    const spotifyCredentials = [
      { usuario: 'spotify_test1@example.com', password: 'spotify123' },
      { usuario: 'spotify_test2@example.com', password: 'spotify456' },
      { usuario: 'spotify_test3@example.com', password: 'spotify789' }
    ];

    for (const cred of spotifyCredentials) {
      const existingCred = await prisma.credenciales.findFirst({
        where: {
          servicioId: spotifyService.id,
          usuario: cred.usuario
        }
      });

      if (!existingCred) {
        await prisma.credenciales.create({
          data: {
            servicioId: spotifyService.id,
            usuario: cred.usuario,
            password: cred.password,
            activas: true,
            asignadas: false
          }
        });
        console.log(`  ✅ Creada: ${cred.usuario}`);
      } else {
        console.log(`  ⚠️ Ya existe: ${cred.usuario}`);
      }
    }

    // 4. VERIFICAR CREDENCIALES CREADAS
    console.log('\n📊 Verificando credenciales disponibles...');
    
    const netflixAvailable = await prisma.credenciales.count({
      where: {
        servicioId: netflixService.id,
        asignadas: false,
        activas: true
      }
    });

    const spotifyAvailable = await prisma.credenciales.count({
      where: {
        servicioId: spotifyService.id,
        asignadas: false,
        activas: true
      }
    });

    console.log(`🎬 Netflix Premium - Credenciales disponibles: ${netflixAvailable}`);
    console.log(`🎵 Spotify Premium - Credenciales disponibles: ${spotifyAvailable}`);

    if (netflixAvailable > 0 && spotifyAvailable > 0) {
      console.log('\n✅ ¡Credenciales creadas exitosamente! Ahora puedes ejecutar la prueba completa.');
    } else {
      console.log('\n⚠️ Algunas credenciales no se pudieron crear o ya estaban asignadas.');
    }

  } catch (error) {
    console.error('❌ Error creando credenciales:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestCredentials();
# Script para inicializar la base de datos PostgreSQL en Windows
# Uso: .\init-database.ps1

Write-Host "🚀 Inicializador de Base de Datos - Streaming Service" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Variables
$PostgresUser = "postgres"
$NewDbName = "streaming_service_db"
$NewDbUser = "streaming_user"
$NewDbPassword = "streaming_pass_123"

Write-Host "📋 Este script creará:" -ForegroundColor Yellow
Write-Host "   • Base de datos: $NewDbName"
Write-Host "   • Usuario: $NewDbUser"
Write-Host "   • Contraseña: $NewDbPassword"
Write-Host ""
Write-Host "⚠️  IMPORTANTE: Asegúrate de que PostgreSQL 18 está instalado y en ejecución" -ForegroundColor Red
Write-Host ""

$proceed = Read-Host "¿Deseas continuar? (S/N)"
if ($proceed -ne "S" -and $proceed -ne "s") {
    Write-Host "❌ Operación cancelada" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "🔐 Ingresa la contraseña del usuario postgres de PostgreSQL:" -ForegroundColor Green
$postgresPassword = Read-Host -AsSecureString
$postgresPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($postgresPassword))

# SQL para crear BD y usuario
$sqlCommands = @"
CREATE DATABASE $NewDbName;
CREATE USER $NewDbUser WITH PASSWORD '$NewDbPassword';
ALTER ROLE $NewDbUser SET client_encoding TO 'utf8';
ALTER ROLE $NewDbUser SET default_transaction_isolation TO 'read committed';
ALTER ROLE $NewDbUser SET default_transaction_deferrable TO on;
ALTER ROLE $NewDbUser SET default_time_zone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE $NewDbName TO $NewDbUser;
\c $NewDbName
GRANT SCHEMA public TO $NewDbUser;
"@

# Ejecutar comandos SQL
Write-Host ""
Write-Host "⏳ Ejecutando comandos SQL..." -ForegroundColor Cyan

$env:PGPASSWORD = $postgresPasswordPlain
$result = psql -U $PostgresUser -h localhost -d postgres -c $sqlCommands

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Base de datos creada exitosamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error al crear la base de datos" -ForegroundColor Red
    Write-Host $result
    exit 1
}

# Limpiar variable de contraseña
Remove-Item Env:\PGPASSWORD

Write-Host ""
Write-Host "✅ Configuración completada" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Datos de conexión:" -ForegroundColor Yellow
Write-Host "   Host: localhost"
Write-Host "   Puerto: 5432"
Write-Host "   Base de datos: $NewDbName"
Write-Host "   Usuario: $NewDbUser"
Write-Host "   Contraseña: $NewDbPassword"
Write-Host ""
Write-Host "🔗 Cadena de conexión para .env:" -ForegroundColor Yellow
Write-Host "   DATABASE_URL=postgresql://$NewDbUser`:$NewDbPassword@localhost:5432/$NewDbName"
Write-Host ""
Write-Host "📚 Siguientes pasos:" -ForegroundColor Cyan
Write-Host "   1. Actualiza backend/.env con la cadena de conexión"
Write-Host "   2. Ejecuta: cd backend && npx prisma migrate dev"
Write-Host "   3. Ejecuta: npx prisma db seed"
Write-Host "   4. Ejecuta: npm run dev (en otra terminal)"
Write-Host ""

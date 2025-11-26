import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Grid, List, Star, Users, DollarSign } from 'lucide-react';
import { catalogoService, type Servicio, type CategoriaInfo } from '../services/catalogoService';
import { getServicioLogo } from '../utils/serviceLogos';

export default function Catalogo() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [categorias, setCategorias] = useState<CategoriaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [soloDisponibles, setSoloDisponibles] = useState(true);
  const [ordenarPor, setOrdenarPor] = useState<'popularidad' | 'precio' | 'nombre' | 'novedad'>('popularidad');
  const [vistaGrid, setVistaGrid] = useState(true);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 12;

  // Cargar categorías al montar el componente
  useEffect(() => {
    const cargarCategorias = async () => {
      try {
        const response = await catalogoService.obtenerCategorias();
        if (response.success) {
          setCategorias(response.data.categorias);
        }
      } catch (error) {
        console.error('Error al cargar categorías:', error);
      }
    };

    cargarCategorias();
  }, []);

  // Cargar servicios cuando cambien los filtros
  useEffect(() => {
    cargarServicios();
  }, [currentPage, selectedCategoria, soloDisponibles, ordenarPor]);

  const cargarServicios = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      
      if (searchQuery.trim()) {
        // Si hay búsqueda, usar la API de búsqueda
        response = await catalogoService.cliente.buscarServicios({
          q: searchQuery,
          categoria: selectedCategoria || undefined,
          precioMin: precioMin ? Number(precioMin) : undefined,
          precioMax: precioMax ? Number(precioMax) : undefined,
          page: currentPage,
          limit: itemsPerPage,
        });
      } else {
        // Si no hay búsqueda, usar la API de consulta con filtros
        response = await catalogoService.cliente.consultarServicios({
          page: currentPage,
          limit: itemsPerPage,
          categoria: selectedCategoria || undefined,
          ordenarPor,
        });
      }

      if (response.success) {
        setServicios(response.data.servicios);
        setTotalPages(response.data.pagination.totalPages);
        setTotalItems(response.data.pagination.totalItems);
      } else {
        setError('Error al cargar los servicios');
      }
    } catch (error) {
      console.error('Error al cargar servicios:', error);
      setError('Error al cargar los servicios');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    cargarServicios();
  };

  const handleFiltroAvanzado = async () => {
    try {
      setLoading(true);
      setCurrentPage(1);
      
      const response = await catalogoService.cliente.filtrarServicios({
        categoria: selectedCategoria || undefined,
        precioMin: precioMin ? Number(precioMin) : undefined,
        precioMax: precioMax ? Number(precioMax) : undefined,
        ordenarPor: ordenarPor === 'popularidad' ? 'popularidad' : ordenarPor,
        page: 1,
        limit: itemsPerPage,
      });

      if (response.success) {
        setServicios(response.data.servicios);
        setTotalPages(response.data.pagination.totalPages);
        setTotalItems(response.data.pagination.totalItems);
      }
    } catch (error) {
      console.error('Error al filtrar servicios:', error);
      setError('Error al filtrar los servicios');
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setSearchQuery('');
    setSelectedCategoria('');
    setPrecioMin('');
    setPrecioMax('');
    setSoloDisponibles(true);
    setOrdenarPor('popularidad');
    setCurrentPage(1);
  };

  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(precio);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Catálogo de Servicios</h1>
          <p className="text-gray-600">Descubre y suscríbete a los mejores servicios de streaming</p>
        </div>

        {/* Barra de búsqueda */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Buscar servicios
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, descripción..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Buscar
            </button>
          </form>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar con filtros */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
                <button
                  onClick={limpiarFiltros}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Limpiar
                </button>
              </div>

              {/* Categoría */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría
                </label>
                <select
                  value={selectedCategoria}
                  onChange={(e) => setSelectedCategoria(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option key="categoria-todas" value="">Todas las categorías</option>
                  {categorias
                    .filter(categoria => categoria.categoria && categoria.categoria.trim() !== '')
                    .map((categoria) => (
                    <option key={`categoria-${categoria.categoria}`} value={categoria.categoria}>
                      {categoria.categoria} ({categoria.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Rango de precios */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rango de precios
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={precioMin}
                    onChange={(e) => setPrecioMin(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={precioMax}
                    onChange={(e) => setPrecioMax(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Disponibilidad */}
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={soloDisponibles}
                    onChange={(e) => setSoloDisponibles(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Solo disponibles</span>
                </label>
              </div>

              {/* Ordenar por */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ordenar por
                </label>
                <select
                  value={ordenarPor}
                  onChange={(e) => setOrdenarPor(e.target.value as 'popularidad' | 'precio' | 'nombre' | 'novedad')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option key="orden-popularidad" value="popularidad">Popularidad</option>
                  <option key="orden-precio" value="precio">Precio</option>
                  <option key="orden-nombre" value="nombre">Nombre</option>
                  <option key="orden-novedad" value="novedad">Más recientes</option>
                </select>
              </div>

              <button
                onClick={handleFiltroAvanzado}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Aplicar filtros
              </button>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="flex-1">
            {/* Controles de vista y resultados */}
            <div className="flex justify-between items-center mb-6">
              <div className="text-sm text-gray-600">
                {loading ? 'Cargando...' : `${totalItems} servicios encontrados`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVistaGrid(true)}
                  className={`p-2 rounded-md ${vistaGrid ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setVistaGrid(false)}
                  className={`p-2 rounded-md ${!vistaGrid ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {/* Grid/Lista de servicios */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : servicios.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No se encontraron servicios</p>
                <p className="text-gray-400 mt-2">Intenta ajustar los filtros de búsqueda</p>
              </div>
            ) : (
              <div className={vistaGrid ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {servicios.map((servicio) => (
                  <div
                    key={servicio.id}
                    className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${
                      vistaGrid ? 'p-6' : 'p-4 flex items-center gap-4'
                    }`}
                  >
                    {vistaGrid ? (
                      // Vista de grid
                      <>
                        <div className="flex justify-between items-start mb-3">
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {servicio.categoria}
                          </span>
                          <span className={`inline-block text-xs px-2 py-1 rounded-full ${
                            servicio.disponible 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {servicio.disponible ? 'Disponible' : 'No disponible'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <img
                            src={getServicioLogo(
                              servicio.nombre,
                              servicio.imagen || (servicio as any).logo || (servicio as any).logo_url,
                              servicio.logoUrl
                            )}
                            alt={servicio.nombre}
                            className="w-12 h-12 rounded-md object-contain border border-gray-100 bg-gray-50"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = getServicioLogo(servicio.nombre);
                            }}
                          />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {servicio.nombre}
                          </h3>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {servicio.descripcion}
                        </p>
                        
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{servicio._count?.suscripciones || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4" />
                              <span>4.5</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            <span className="text-xl font-bold text-green-600">
                              {formatearPrecio(servicio.precio)}
                            </span>
                            <span className="text-sm text-gray-500">/mes</span>
                          </div>
                          
                          <Link
                            to={`/servicio/${servicio.id}`}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                          >
                            Ver detalles
                          </Link>
                        </div>
                      </>
                    ) : (
                      // Vista de lista
                      <>
                        <div className="flex-1 flex items-start gap-3">
                          <img
                            src={getServicioLogo(
                              servicio.nombre,
                              servicio.imagen || (servicio as any).logo || (servicio as any).logo_url,
                              servicio.logoUrl
                            )}
                            alt={servicio.nombre}
                            className="w-14 h-14 rounded-md object-contain border border-gray-100 bg-gray-50"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = getServicioLogo(servicio.nombre);
                            }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {servicio.nombre}
                              </h3>
                              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                {servicio.categoria}
                              </span>
                              <span className={`inline-block text-xs px-2 py-1 rounded-full ${
                                servicio.disponible 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {servicio.disponible ? 'Disponible' : 'No disponible'}
                              </span>
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-2">
                              {servicio.descripcion}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{servicio._count?.suscripciones || 0} suscriptores</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4" />
                                <span>4.5</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-5 w-5 text-green-600" />
                              <span className="text-xl font-bold text-green-600">
                                {formatearPrecio(servicio.precio)}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">/mes</span>
                          </div>
                          
                          <Link
                            to={`/servicio/${servicio.id}`}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                          >
                            Ver detalles
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 border rounded-md ${
                        currentPage === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ExcelImporter from '@/components/ExcelImporter'
import PhotoImporter from '@/components/PhotoImporter'

export default function ImportPage() {
  const router = useRouter()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin"
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importar Excel</h1>
          <p className="text-slate-500 text-sm mt-0.5">Actualiza tu inventario con el archivo semanal del proveedor</p>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">¿Cómo funciona la importación?</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Se leen las columnas: <strong>Numero de Parte, Descripción, Precio, Condición, Estado</strong></li>
              <li>Si la laptop ya existe (mismo No. de Parte), solo se actualiza precio y datos</li>
              <li><strong>Las fotos NO se sobreescriben</strong> al importar de nuevo</li>
              <li>Las laptops que ya no estén en el Excel <strong>no se borran</strong> automáticamente</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Importador */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <ExcelImporter onImportComplete={() => setTimeout(() => router.push('/admin'), 2000)} />
      </div>

      {/* Columnas esperadas */}
      <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-sm font-semibold text-slate-700 mb-3">Nombres de columna aceptados:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ['No. Parte', 'numero de parte, numero_parte, sku, no parte, part number'],
            ['Descripción', 'descripcion, descripción, description, detalle'],
            ['Precio', 'precio, price, costo, precio unitario'],
            ['Condición', 'condicion, condición, condition'],
            ['Estado', 'estado, status, disponibilidad'],
          ].map(([campo, variantes]) => (
            <div key={campo} className="col-span-2 sm:col-span-1 bg-slate-50 rounded-xl p-3">
              <p className="font-semibold text-slate-700 mb-1">{campo}</p>
              <p className="text-slate-400 font-mono">{variantes}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Importación masiva de fotos ── */}
      <div className="mt-10">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">Importar fotos masivamente</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Sube un CSV o Excel con los links de las fotos para cada equipo.
          </p>
        </div>

        {/* Instrucciones fotos */}
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-purple-800">
              <p className="font-semibold mb-1">¿Cómo funciona?</p>
              <ul className="list-disc list-inside space-y-1 text-purple-700">
                <li>El archivo debe tener una columna con el código (<strong>numero_parte</strong> o <strong>codigo</strong>) y hasta 3 columnas de URLs de foto</li>
                <li>Solo se actualizan los slots que tengan URL — las fotos ya existentes <strong>no se borran</strong></li>
                <li>Las imágenes se descargan automáticamente y se suben al almacenamiento de la tienda</li>
                <li>Formatos de imagen aceptados: JPG, PNG, WebP, GIF (máx. 10 MB por imagen)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Formato del archivo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
          <p className="text-sm font-semibold text-slate-700 mb-3">Formato del archivo (ejemplo):</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-slate-50">
                  {['numero_parte', 'foto_1', 'foto_2', 'foto_3'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-slate-600 border border-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2 border border-slate-100 text-slate-500">W01875</td>
                  <td className="px-3 py-2 border border-slate-100 text-blue-500">https://…/img1.jpg</td>
                  <td className="px-3 py-2 border border-slate-100 text-blue-500">https://…/img2.jpg</td>
                  <td className="px-3 py-2 border border-slate-100 text-slate-300">—</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-3 py-2 border border-slate-100 text-slate-500">W02341</td>
                  <td className="px-3 py-2 border border-slate-100 text-blue-500">https://…/img3.png</td>
                  <td className="px-3 py-2 border border-slate-100 text-slate-300">—</td>
                  <td className="px-3 py-2 border border-slate-100 text-slate-300">—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {[
              ['Código',  'numero_parte, codigo, code, part'],
              ['Foto 1',  'foto_1, url_1, image_1, photo_1'],
              ['Foto 2',  'foto_2, url_2, image_2, photo_2'],
              ['Foto 3',  'foto_3, url_3, image_3, photo_3'],
            ].map(([campo, variantes]) => (
              <div key={campo} className="bg-slate-50 rounded-xl p-3">
                <p className="font-semibold text-slate-700 mb-0.5">{campo}</p>
                <p className="text-slate-400 font-mono">{variantes}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Importador de fotos */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <PhotoImporter />
        </div>
      </div>
    </div>
  )
}

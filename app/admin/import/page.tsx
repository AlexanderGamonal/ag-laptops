'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ExcelImporter from '@/components/ExcelImporter'

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
    </div>
  )
}

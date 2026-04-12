import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'AG Solutions & Services — Laptops en Lima, Perú'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'AG Solutions & Services'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e3a5f 100%)',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Círculos decorativos de fondo */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          }}
        />

        {/* Badge superior */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              background: 'rgba(59,130,246,0.2)',
              border: '1px solid rgba(59,130,246,0.35)',
              borderRadius: 999,
              padding: '6px 18px',
              color: '#93c5fd',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Lima, Perú · Stock disponible
          </div>
        </div>

        {/* Nombre de la tienda */}
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            maxWidth: 800,
          }}
        >
          {storeName}
        </div>

        {/* Línea separadora */}
        <div
          style={{
            width: 64,
            height: 4,
            background: '#3b82f6',
            borderRadius: 2,
            marginTop: 28,
            marginBottom: 28,
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            color: '#94a3b8',
            lineHeight: 1.4,
            maxWidth: 700,
          }}
        >
          Laptops nuevas y reacondicionadas con precio final con IGV.
        </div>

        {/* Pills de atributos */}
        <div
          style={{
            display: 'flex',
            gap: 14,
            marginTop: 'auto',
          }}
        >
          {['Garantía técnica', 'Envíos a todo el Perú', 'Asesoría por WhatsApp'].map((text) => (
            <div
              key={text}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 999,
                padding: '10px 22px',
                color: 'rgba(255,255,255,0.8)',
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              {text}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  )
}

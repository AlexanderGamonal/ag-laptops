"use client";

export default function StorefrontHero({ laptopsCount }: { laptopsCount: number }) {
  return (
    <section className="grid lg:grid-cols-[1.3fr_0.7fr] gap-5 mb-6">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-900 text-white rounded-[28px] p-7 md:p-9 shadow-xl">
        <p className="text-sm font-medium text-blue-200 tracking-[0.18em] uppercase">
          Laptops nuevas y reacondicionadas — Lima, Perú
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-blue-100">
          Stock disponible · Precio con IGV incluido
        </p>
        <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight max-w-2xl">
          Encuentra tu laptop sin perder tiempo ni pagar de más.
        </h1>
        <p className="mt-4 text-slate-200 max-w-2xl text-sm md:text-base leading-7">
          Filtra por marca, procesador y precio. Cada ficha tiene fotos reales,
          especificaciones y un botón de WhatsApp para que cierres tu compra
          sin vueltas.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <TrustPill>Garantía técnica incluida</TrustPill>
          <TrustPill>Envíos a todo el Perú</TrustPill>
          <TrustPill>Asesoría gratis por WhatsApp</TrustPill>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 lg:grid-cols-1 gap-4">
        <MetricCard
          label="Equipos disponibles"
          value={String(laptopsCount)}
          helper="Actualizados cada semana con el stock del proveedor"
        />
        <MetricCard
          label="Respuesta en WhatsApp"
          value="< 2h"
          helper="Lunes a sábado en horario comercial"
        />
        <MetricCard
          label="Precio final garantizado"
          value="IGV inc."
          helper="Sin cobros extra al momento de pagar"
        />
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

function TrustPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/90">
      {children}
    </span>
  );
}

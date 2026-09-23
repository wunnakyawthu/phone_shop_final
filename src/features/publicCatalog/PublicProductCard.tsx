import { Link } from 'react-router-dom'
import type { PublicCatalogDevice } from './publicCatalogApi'

function money(value: number) {
  return `${new Intl.NumberFormat('en-US').format(value)} MMK`
}

export function PublicProductCard({ device }: { device: PublicCatalogDevice }) {
  return (
    <Link
      to={`/products/${device.publicId}`}
      className="group relative overflow-hidden rounded-[1.6rem] bg-white shadow-[0_8px_28px_rgba(0,0,0,.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,.11)] sm:rounded-[1.9rem]"
    >
      <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(145deg,#f8fafc,#eef2ff)]">
        {device.photoUrls[0] ? (
          <img
            src={device.photoUrls[0]}
            alt={device.publicTitle}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.055]"
          />
        ) : (
          <div className="grid h-full place-items-center">
            <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-400 shadow-sm">
              No photo
            </span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full border border-white/50 bg-white/88 px-3 py-1.5 text-[10px] font-semibold capitalize text-slate-700 shadow-sm backdrop-blur">
          {device.deviceState}
        </span>
        <span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-slate-950/88 text-white shadow-lg backdrop-blur transition group-hover:translate-x-0.5">
          →
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
          {device.brandName}
        </p>
        <h2 className="mt-2 line-clamp-2 text-xl font-semibold tracking-[-0.02em] text-[#1d1d1f]">
          {device.modelName}
        </h2>

        <div className="mt-3 flex min-h-5 flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
          {device.storageCapacityGb !== null && (
            <span>{device.storageCapacityGb} GB</span>
          )}
          {device.storageCapacityGb !== null && device.color && (
            <span className="text-slate-300">•</span>
          )}
          {device.color && <span>{device.color}</span>}
          {device.batteryHealthPercent !== null && (
            <>
              <span className="text-slate-300">•</span>
              <span>Battery {device.batteryHealthPercent}%</span>
            </>
          )}
          {device.ramText && <span>{device.ramText} RAM</span>}
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Selling price
          </p>
          <p className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#1d1d1f]">
            {money(device.salePriceMmk)}
          </p>
        </div>
      </div>
    </Link>
  )
}

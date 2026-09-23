import { BackLink } from '../../../components/navigation/BackLink'
import ComputerPurchaseForm from './ComputerPurchaseForm'

export default function ComputerPurchasePage() {
  return (
    <div className="space-y-6">
      <div className="management-page-hero">
        <div>
          <BackLink to="/app/computers">Back to computers</BackLink>
          <p className="management-eyebrow mt-5">Computer workspace</p>
          <h1 className="management-title">New Computer Purchase</h1>
          <p className="management-subtitle">
            Receive new or used computers into inventory and publish them to the customer
            catalog.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Public by default
        </span>
      </div>

      <ComputerPurchaseForm />
    </div>
  )
}

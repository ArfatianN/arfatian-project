import { getOrderStatusText, getOrderStatusColor } from '@/lib/utils'

export default function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getOrderStatusColor(status)}`}>
      {getOrderStatusText(status)}
    </span>
  )
}
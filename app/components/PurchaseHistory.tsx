'use client'
import { useState } from 'react'
import RefundModal from './RefundModal'

export type PurchaseItem = {
  id: string
  amount: number
  created_at: string
  label: string
  refundable: boolean
}

type Props = {
  items: PurchaseItem[]
  hasExistingRefund: boolean
}

export default function PurchaseHistory({ items, hasExistingRefund }: Props) {
  const [modalPayment, setModalPayment] = useState<PurchaseItem | null>(null)
  const [refundedIds, setRefundedIds] = useState<Set<string>>(new Set())

  if (items.length === 0) return (
    <p className="text-sm" style={{ color: '#3F342D66' }}>購入履歴はありません</p>
  )

  const alreadyUsedRefund = hasExistingRefund || refundedIds.size > 0

  return (
    <>
      <div className="space-y-3">
        {items.map(item => {
          const isRefunded = refundedIds.has(item.id)
          const date = new Date(item.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
          const canRefund = item.refundable && !alreadyUsedRefund && !isRefunded

          return (
            <div key={item.id} className="rounded-xl px-4 py-3" style={{ backgroundColor: '#FFF2E8' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#3F342D' }}>{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#3F342D66' }}>{date}</p>
                </div>
                <p className="text-sm font-bold shrink-0" style={{ color: '#3F342D' }}>
                  ¥{item.amount.toLocaleString()}
                </p>
              </div>

              {isRefunded ? (
                <p className="text-xs mt-2" style={{ color: '#4CAF50' }}>返金済み</p>
              ) : canRefund ? (
                <button
                  onClick={() => setModalPayment(item)}
                  className="mt-2 text-xs px-3 py-1 rounded-full border"
                  style={{ borderColor: '#FAA66B', color: '#FAA66B' }}
                >
                  返金申請（7日以内）
                </button>
              ) : item.refundable && alreadyUsedRefund ? (
                <p className="text-xs mt-2" style={{ color: '#3F342D66' }}>返金済みのため申請不可</p>
              ) : null}
            </div>
          )
        })}
      </div>

      {modalPayment && (
        <RefundModal
          paymentId={modalPayment.id}
          amount={modalPayment.amount}
          label={modalPayment.label}
          onClose={() => setModalPayment(null)}
          onSuccess={() => {
            setRefundedIds(prev => new Set(prev).add(modalPayment.id))
            setModalPayment(null)
          }}
        />
      )}
    </>
  )
}

'use client'
import { useState } from 'react'

type Props = {
  paymentId: string
  amount: number
  label: string
  onClose: () => void
  onSuccess: () => void
}

const REFUND_REASONS = [
  '期待と内容が違った',
  '内容が合わなかった',
  '診断精度への不満',
  '誤購入',
  'その他',
]

const CONTINUE_OPTIONS = ['はい、使い続けたい', 'わからない', 'いいえ、使わないと思う']
const RECOMMEND_OPTIONS = ['すすめる', 'わからない', 'すすめない']

export default function RefundModal({ paymentId, amount, label, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'form' | 'confirm' | 'done'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [answers, setAnswers] = useState({
    reason: '',
    overall_satisfaction: 0,
    accuracy_rating: 0,
    pre_purchase_expectation: '',
    expectation_gap: '',
    least_useful_part: '',
    improvement_suggestions: '',
    will_continue: '',
    competitor_comparison: '',
    top_priority_improvement: '',
    would_recommend: '',
    other_feedback: '',
  })

  const set = (key: keyof typeof answers, value: string | number) =>
    setAnswers(prev => ({ ...prev, [key]: value }))

  const isFormValid =
    answers.reason &&
    answers.overall_satisfaction > 0 &&
    answers.accuracy_rating > 0 &&
    answers.pre_purchase_expectation.trim() &&
    answers.expectation_gap.trim() &&
    answers.least_useful_part.trim() &&
    answers.improvement_suggestions.trim() &&
    answers.will_continue &&
    answers.top_priority_improvement.trim() &&
    answers.would_recommend

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId, answers }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'already_refunded') {
          setError('すでに返金済みです。')
        } else if (data.error === 'refund_period_expired') {
          setError('返金期間（7日間）が過ぎています。')
        } else {
          setError('返金処理に失敗しました。しばらく経ってから再度お試しください。')
        }
        setStep('form')
        return
      }
      setStep('done')
      onSuccess()
    } catch {
      setError('通信エラーが発生しました。')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="text-2xl transition-transform active:scale-90"
          style={{ color: n <= value ? '#FAA66B' : '#E5DDD8' }}
        >
          ★
        </button>
      ))}
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl overflow-y-auto"
        style={{ backgroundColor: '#FFF9F5', maxHeight: '90vh' }}
      >
        {step === 'done' ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="text-4xl mb-4">✓</div>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#3F342D' }}>返金申請を受け付けました</h2>
            <p className="text-sm mb-6" style={{ color: '#3F342D99' }}>
              返金処理が完了しました。通常3〜5営業日でご返金されます。
            </p>
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-2xl text-sm font-medium text-white"
              style={{ backgroundColor: '#FAA66B' }}
            >
              閉じる
            </button>
          </div>
        ) : step === 'confirm' ? (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setStep('form')} className="text-sm" style={{ color: '#FAA66B' }}>← 戻る</button>
              <h2 className="text-base font-bold" style={{ color: '#3F342D' }}>返金内容の確認</h2>
              <div className="w-10" />
            </div>
            <div className="rounded-2xl p-4 mb-6" style={{ backgroundColor: '#FFF2E8' }}>
              <p className="text-xs mb-1" style={{ color: '#FAA66B' }}>返金対象</p>
              <p className="text-sm font-medium" style={{ color: '#3F342D' }}>{label}</p>
              <p className="text-lg font-bold mt-1" style={{ color: '#3F342D' }}>¥{amount.toLocaleString()}</p>
            </div>
            <p className="text-xs mb-6" style={{ color: '#3F342D99' }}>
              返金申請後はキャンセルできません。内容をご確認の上、申請してください。
            </p>
            {error && (
              <p className="text-xs text-red-500 mb-4">{error}</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 rounded-2xl text-sm font-bold text-white"
              style={{ backgroundColor: loading ? '#FAA66B88' : '#FAA66B' }}
            >
              {loading ? '処理中...' : '返金を申請する'}
            </button>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <button onClick={onClose} className="text-sm" style={{ color: '#3F342D66' }}>✕</button>
              <h2 className="text-base font-bold" style={{ color: '#3F342D' }}>返金アンケート</h2>
              <div className="w-6" />
            </div>
            <p className="text-xs mb-6" style={{ color: '#3F342D99' }}>
              より良いサービス改善のため、ご回答をお願いします（全問必須）。
            </p>

            <div className="space-y-6">
              {/* Q1 */}
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: '#3F342D' }}>1. 返金理由を教えてください</p>
                <div className="flex flex-wrap gap-2">
                  {REFUND_REASONS.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => set('reason', r)}
                      className="px-3 py-1.5 rounded-full text-xs border transition-colors"
                      style={{
                        borderColor: answers.reason === r ? '#FAA66B' : '#E5DDD8',
                        backgroundColor: answers.reason === r ? '#FFF2E8' : 'white',
                        color: answers.reason === r ? '#FAA66B' : '#3F342D',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q2 */}
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: '#3F342D' }}>2. 総合満足度（1〜5）</p>
                <StarRating value={answers.overall_satisfaction} onChange={v => set('overall_satisfaction', v)} />
              </div>

              {/* Q3 */}
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: '#3F342D' }}>3. 診断内容の正確さ（1〜5）</p>
                <StarRating value={answers.accuracy_rating} onChange={v => set('accuracy_rating', v)} />
              </div>

              {/* Q4 */}
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: '#3F342D' }}>4. 購入前にどんな期待をしていましたか？</p>
                <textarea
                  value={answers.pre_purchase_expectation}
                  onChange={e => set('pre_purchase_expectation', e.target.value)}
                  rows={3}
                  placeholder="例：自分の強みや弱みを具体的に知れると思っていた"
                  className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
                  style={{ border: '1px solid #E5DDD8', backgroundColor: 'white', color: '#3F342D' }}
                />
              </div>

              {/* Q5 */}
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: '#3F342D' }}>5. 期待と現実のギャップを教えてください</p>
                <textarea
                  value={answers.expectation_gap}
                  onChange={e => set('expectation_gap', e.target.value)}
                  rows={3}
                  placeholder="例：内容が漠然としていて具体的なアドバイスが少なかった"
                  className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
                  style={{ border: '1px solid #E5DDD8', backgroundColor: 'white', color: '#3F342D' }}
                />
              </div>

              {/* Q6 */}
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: '#3F342D' }}>6. 最も役立たなかった部分はどこですか？</p>
                <textarea
                  value={answers.least_useful_part}
                  onChange={e => set('least_useful_part', e.target.value)}
                  rows={3}
                  placeholder="例：スピリチュアル診断の項目"
                  className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
                  style={{ border: '1px solid #E5DDD8', backgroundColor: 'white', color: '#3F342D' }}
                />
              </div>

              {/* Q7 */}
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: '#3F342D' }}>7. 改善してほしい点を教えてください</p>
                <textarea
                  value={answers.improvement_suggestions}
                  onChange={e => set('improvement_suggestions', e.target.value)}
                  rows={3}
                  placeholder="例：診断結果をより具体的な行動提案にしてほしい"
                  className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
                  style={{ border: '1px solid #E5DDD8', backgroundColor: 'white', color: '#3F342D' }}
                />
              </div>

              {/* Q8 */}
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: '#3F342D' }}>8. 今後も CocoHare を使い続けますか？</p>
                <div className="flex flex-col gap-2">
                  {CONTINUE_OPTIONS.map(o => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => set('will_continue', o)}
                      className="px-4 py-2.5 rounded-xl text-sm text-left border transition-colors"
                      style={{
                        borderColor: answers.will_continue === o ? '#FAA66B' : '#E5DDD8',
                        backgroundColor: answers.will_continue === o ? '#FFF2E8' : 'white',
                        color: answers.will_continue === o ? '#FAA66B' : '#3F342D',
                      }}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q9 */}
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: '#3F342D' }}>9. 他の類似サービスと比べてどうでしたか？（任意）</p>
                <textarea
                  value={answers.competitor_comparison}
                  onChange={e => set('competitor_comparison', e.target.value)}
                  rows={2}
                  placeholder="例：〇〇と比べると..."
                  className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
                  style={{ border: '1px solid #E5DDD8', backgroundColor: 'white', color: '#3F342D' }}
                />
              </div>

              {/* Q10 */}
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: '#3F342D' }}>10. 最優先で改善してほしいことは何ですか？</p>
                <textarea
                  value={answers.top_priority_improvement}
                  onChange={e => set('top_priority_improvement', e.target.value)}
                  rows={2}
                  placeholder="例：診断の質問数が多すぎる"
                  className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
                  style={{ border: '1px solid #E5DDD8', backgroundColor: 'white', color: '#3F342D' }}
                />
              </div>

              {/* Q11 */}
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: '#3F342D' }}>11. 友人・知人に CocoHare をすすめますか？</p>
                <div className="flex gap-2">
                  {RECOMMEND_OPTIONS.map(o => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => set('would_recommend', o)}
                      className="flex-1 py-2 rounded-xl text-xs border transition-colors"
                      style={{
                        borderColor: answers.would_recommend === o ? '#FAA66B' : '#E5DDD8',
                        backgroundColor: answers.would_recommend === o ? '#FFF2E8' : 'white',
                        color: answers.would_recommend === o ? '#FAA66B' : '#3F342D',
                      }}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q12 */}
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: '#3F342D' }}>12. その他、ご意見があればお聞かせください（任意）</p>
                <textarea
                  value={answers.other_feedback}
                  onChange={e => set('other_feedback', e.target.value)}
                  rows={3}
                  placeholder="自由にご記入ください"
                  className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
                  style={{ border: '1px solid #E5DDD8', backgroundColor: 'white', color: '#3F342D' }}
                />
              </div>
            </div>

            <div className="mt-8 pb-8">
              {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
              <button
                onClick={() => isFormValid && setStep('confirm')}
                disabled={!isFormValid}
                className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-opacity"
                style={{ backgroundColor: isFormValid ? '#FAA66B' : '#E5DDD8' }}
              >
                確認画面へ
              </button>
              {!isFormValid && (
                <p className="text-xs text-center mt-2" style={{ color: '#3F342D66' }}>
                  ※ 任意以外の項目をすべて回答してください
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

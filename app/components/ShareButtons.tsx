'use client'

import { useState, useEffect } from 'react'

export default function ShareButtons({ typeName, diagnosisId }: { typeName: string; diagnosisId: string }) {
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState(`/diagnosis/free/result/${diagnosisId}`)

  useEffect(() => {
    setUrl(`${window.location.origin}/diagnosis/free/result/${diagnosisId}`)
  }, [diagnosisId])
  const shareText = `私の性格タイプは「${typeName}」でした。\nあなたはどのタイプ？\n#CocoHare #ここはれ #性格診断`

  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareText + '\n' + url)}`
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <a
        href={lineUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-medium text-white"
        style={{ backgroundColor: '#06C755' }}
      >
        LINEでシェアする
      </a>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-medium text-white"
        style={{ backgroundColor: '#000000' }}
      >
        X（Twitter）でシェアする
      </a>
      <button
        onClick={handleCopy}
        className="w-full py-3 rounded-xl text-sm font-medium border transition"
        style={{
          borderColor: copied ? '#4CAF50' : '#E5DDD8',
          color: copied ? '#4CAF50' : '#3F342D99',
        }}
      >
        {copied ? 'コピーしました！' : 'リンクをコピーする'}
      </button>
    </div>
  )
}

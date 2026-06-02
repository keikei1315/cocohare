import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isTakePlan } from '@/lib/plan'

const genAI = new GoogleGenerativeAI((process.env.GEMINI_API_KEY ?? '').replace(/^﻿/, ''))


const POTORI_MOOD_THEMES = [
  'パン', 'トースト', 'ふとん', '枕', 'プリン', 'ヨーグルト', 'みそ汁', 'おにぎり', 'バナナ', 'りんご',
  'いちご', '豆腐', '納豆', 'ラーメン', 'アイス', 'クッキー', 'チョコ', 'スープ', 'コーヒー', 'お茶',
  '麦茶', 'タオル', '歯ブラシ', 'コップ', 'ハンガー', '靴下', '消しゴム', '消しゴムのカス', '鉛筆',
  'ハサミ', 'のり', 'セロテープ', '定規', '付箋', '輪ゴム', '画鋲', 'クリップ', 'ガムテープ', '自転車',
  '傘', 'サンダル', '時計', '電球', '信号機', 'スマホ', 'イヤホン', '充電器', 'リモコン', 'ポスト',
  '踏切', '横断歩道', '公園のベンチ', '自動販売機', '窓ガラス', '鏡', '流し台', '洗濯機', '掃除機',
  'ほうき', '雑巾', 'たんぽぽ', '雲', '夕焼け', '月', '星', '雨粒', '風', '葉っぱ', '石ころ', '水たまり',
  '猫', '犬', 'カラス', 'すずめ', 'かたつむり', 'カエル', '蚊', 'てんとう虫', 'きのこ', '草', '苔',
  '桜の花びら', 'あさがお', 'ひまわり', '階段', 'エレベーター', '排水溝', 'ソファ', 'カーテン',
  '冷蔵庫', 'やかん', 'フライパン', '鍋', '箸', 'スプーン', 'ふりかけ', '乾電池', '新聞紙', 'ダンボール',
]

const VALID_LEVELS = ['良かった', '普通', 'しんどかったけど頑張った', '悪かった']
const MOOD_SCORE: Record<string, number> = {
  '良かった': 5,
  '普通': 3,
  'しんどかったけど頑張った': 2,
  '悪かった': 1,
}
const MOOD_QUESTION = '今日もお疲れ様でした🌙\n今日の気分はどうでしたか？'
const UPDATE_MESSAGE = '気分を更新して記録しておくね。'

export async function POST(request: NextRequest) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isTakePlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

  const { mood_level, date } = await request.json()
  if (!mood_level || !VALID_LEVELS.includes(mood_level)) {
    return NextResponse.json({ error: 'Invalid mood_level' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const todayJST = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]
  // date が渡された場合はその日付、なければ今日
  const targetDate: string = date ?? todayJST
  const isToday = targetDate === todayJST

  const { data: existing } = await adminClient
    .from('diary_entries')
    .select('id, mood_level')
    .eq('user_id', user.id)
    .eq('diary_date', targetDate)
    .maybeSingle()

  const isUpdate = !!existing?.mood_level

  // diary_entries を保存 or 更新
  if (existing) {
    await adminClient.from('diary_entries').update({ mood_level }).eq('id', existing.id)
  } else {
    await adminClient.from('diary_entries').insert({
      user_id: user.id,
      diary_date: targetDate,
      mood_level,
      content: '',
      positive_entries: [],
    })
  }

  // mood_records にも数値スコアで保存（レポート集計用）
  await adminClient.from('mood_records').insert({
    user_id: user.id,
    mood_score: MOOD_SCORE[mood_level],
    emotion_labels: [],
    note: '',
  })

  // 更新の場合は固定メッセージ（今日のみチャット履歴に保存）
  if (isUpdate) {
    if (isToday) {
      await adminClient.from('counseling_messages').insert([
        { user_id: user.id, role: 'user', content: `今日の気分を「${mood_level}」に変更`, mode: 'counseling' },
        { user_id: user.id, role: 'assistant', content: UPDATE_MESSAGE, mode: 'counseling' },
      ])
    }
    return NextResponse.json({ message: UPDATE_MESSAGE, isUpdate: true })
  }

  // 初回記録：性格タイプ取得
  const { data: diagnoses } = await adminClient
    .from('diagnoses').select('id, type').eq('user_id', user.id).order('created_at', { ascending: false })
  const freeDiag = diagnoses?.find((d: { type: string }) => d.type === 'free')
  let typeName = ''
  if (freeDiag) {
    const { data: rep } = await adminClient.from('reports').select('content').eq('diagnosis_id', freeDiag.id).eq('type', 'free').maybeSingle()
    typeName = (rep?.content as { typeName?: string })?.typeName ?? ''
  }

  const randomTheme = POTORI_MOOD_THEMES[Math.floor(Math.random() * POTORI_MOOD_THEMES.length)]

  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })
  const result = await model.generateContent(`あなたはCocoHareのAIカウンセラー「ぽとり」です。
ぽとりはポジティブで、哲学的で、詩的で、意味不明で、ぶっとんでて笑える、優しいカウンセラーのような鳥の存在です。

今日のテーマ：「${randomTheme}」
記録された気分：「${mood_level}」
${typeName ? `ユーザーの性格タイプ：${typeName}` : ''}

今日のテーマ「${randomTheme}」を絡めながら、気分に寄り添うぽとりらしいメッセージを送ってください。

ルール：
- 今日のテーマ「${randomTheme}」をどこかに自然に使うこと
- 気分を受け止めつつ、哲学的・詩的・ちょっと意味不明なぽとりらしい言葉でくるむ
- 150トークン以内・1段落30トークン以内・1〜3段落
- タメ口で自然に
- 「あなた」「きみ」などの二人称は絶対に使わない
- 一人称は「ぽとり」（私・僕・AI は禁止）
- 絵文字は0〜1個（🍀✨🌿😌など、やわらかいもの）
- 説教・アドバイス・「記録しました」などのシステム的な言葉は不要
- 深いようで深くない、笑えるようで温かい、ぽとりらしい返答で
- 日本語のみ`)

  const aiMessage = result.response.text().trim() || '今日もお疲れ様でした。'

  // 初回：今日の場合のみチャット履歴に保存（質問・回答・返答の3件）
  // mode: 'mood_check' を質問メッセージにつけることで履歴から識別可能にする
  if (isToday) {
    await adminClient.from('counseling_messages').insert([
      { user_id: user.id, role: 'assistant', content: MOOD_QUESTION, mode: 'mood_check' },
      { user_id: user.id, role: 'user', content: `今日の気分：${mood_level}`, mode: 'counseling' },
      { user_id: user.id, role: 'assistant', content: aiMessage, mode: 'counseling' },
    ])
  }

  return NextResponse.json({ message: aiMessage, isUpdate: false })
}

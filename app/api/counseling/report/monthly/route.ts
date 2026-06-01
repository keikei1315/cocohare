import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isMatsuPlan } from '@/lib/plan'
import { anthropic, extractJSON } from '@/lib/anthropic'

const MOOD_SCORE: Record<string, number> = {
  '良かった': 5,
  '普通': 3,
  'しんどかったけど頑張った': 2,
  '悪かった': 1,
}

function getMonthPeriod(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getMonthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

export async function GET(request: Request) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isMatsuPlan(user.user_metadata)) return NextResponse.json({ error: 'subscription_required' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const adminClient = createAdminClient()
    const period = searchParams.get('period') ?? getMonthPeriod()
    const readOnly = searchParams.get('period') !== null

    const { data: cached } = await adminClient
      .from('counseling_reports')
      .select('content')
      .eq('user_id', user.id)
      .eq('type', 'monthly')
      .eq('period', period)
      .maybeSingle()

    if (cached) return NextResponse.json({ report: cached.content, period, cached: true })
    if (readOnly) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    const { start, end } = getMonthBounds()

    const [{ data: conversations }, { data: diaries }, { data: weeklyReports }] = await Promise.all([
      adminClient.from('counseling_messages')
        .select('content, created_at')
        .eq('user_id', user.id)
        .eq('role', 'user')
        .neq('mode', 'mood_check')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true })
        .limit(50),
      adminClient.from('diary_entries')
        .select('diary_date, mood_level')
        .eq('user_id', user.id)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true }),
      adminClient.from('counseling_reports')
        .select('content, period')
        .eq('user_id', user.id)
        .eq('type', 'weekly')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true }),
    ])

    const { data: diagnoses } = await adminClient
      .from('diagnoses').select('id, type').eq('user_id', user.id).order('created_at', { ascending: false })
    const freeDiag = diagnoses?.find(d => d.type === 'free')
    let typeName = ''
    if (freeDiag) {
      const { data: rep } = await adminClient.from('reports').select('content').eq('diagnosis_id', freeDiag.id).eq('type', 'free').maybeSingle()
      typeName = (rep?.content as { typeName?: string })?.typeName ?? ''
    }

    const moodCounts: Record<string, number> = { '良かった': 0, '普通': 0, 'しんどかったけど頑張った': 0, '悪かった': 0 }
    const moodData: { date: string; score: number; label: string }[] = []
    diaries?.forEach(d => {
      if (d.mood_level && d.mood_level in moodCounts) {
        moodCounts[d.mood_level]++
        if (d.diary_date) {
          moodData.push({ date: d.diary_date, score: MOOD_SCORE[d.mood_level] ?? 3, label: d.mood_level })
        }
      }
    })
    moodData.sort((a, b) => a.date.localeCompare(b.date))

    if (!conversations?.length && !moodData.length) {
      return NextResponse.json({ error: 'Not enough data' }, { status: 422 })
    }

    const countsStr = Object.entries(moodCounts).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}日`).join('、') || 'なし'
    const convText = conversations?.length
      ? conversations.map(m => `・${m.content}`).join('\n')
      : '（今月の会話記録なし）'
    const weekSummaries = weeklyReports?.length
      ? weeklyReports.map(r => {
          const content = r.content as { summary?: string }
          return `${r.period}: ${content?.summary ?? ''}`
        }).join('\n')
      : 'なし'

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `あなたはメンタルヘルス領域の月次分析レポート作成者です。
会話・気分記録・通常日記・ポジティブ日記・週次レポートを統合し、
出来事の要約ではなく「反応の型」「深層心理」「回復の再現条件」を短く記述してください。

${typeName ? `ユーザーの性格タイプ：${typeName}` : ''}
気分の集計: ${countsStr}
今月の会話発言数: ${conversations?.length ?? 0}件

今月の発言:
${convText}

今月の週次レポートサマリー:
${weekSummaries}

【目的】
レポート読了後に、本人が
1) 自分の反応パターンを言語化できる
2) 気分低下の増幅点を特定できる
3) 翌月の実行行動を1日単位で再現できる
状態にする

【共通ルール】
- 出力はJSONのみ
- 医療診断・病名推定・断定は禁止
- 引用の羅列禁止（要約して記述）
- 各項目は指定文字数を厳守
- 「外的要因」と「内的要因」を必ず分ける
- 単発より反復を優先（3日以上の反復傾向を重視）
- 不確実な推測は避け、根拠が弱い場合は「仮説」と明記
- 精神論・一般論を避け、実行場面が見える表現で書く

【分析フレーム（内部処理用・出力しない）】
- 反応連鎖: 外的きっかけ → 自動的な意味づけ → 感情/身体反応 → 行動 → 短期結果/長期結果
- 価値観抽出: 「守りたいもの」「失いたくないもの」「譲れない基準」
- 欲求抽出: 安心・承認・境界・回復・自律・有能感・つながり
- 回復条件: 何が効いたか + なぜ効いたか（機序）をセットで記述
- 再現化: 翌月行動はIf-Then形式で実行可能にする

【項目定義】
1) summary（120字以内）
- 月全体の"心の動きの核"を1文で要約
- 反復した反応軸 + 全体傾向のみ

2) mood_pattern（3件、各60〜90字）
- 気分変動の中核パターン
- 繰り返す場面 + 反応の型

3) reaction_loops（2件、各90〜130字）
- 代表的な反応連鎖を記述
- 「外的きっかけ→内的解釈→感情/身体→行動→結果」の順で簡潔に

4) core_values（3件、各60〜90字）
- 本人が守りたい価値観・譲れない基準
- 「何を大事にしているか + なぜ重要か」

5) hidden_needs（3件、各60〜90字）
- 言葉の裏にある心理的欲求
- 「欲求 + 日常での表れ方」

6) core_beliefs_hypothesis（3件、各45〜75字）
- 繰り返し現れる自己ルール/前提（仮説）
- 例: 「○○でないと不安」「○○なら安全」

7) mood_down_trigger（3件、各60〜90字）
- 低下要因を「外的トリガー + 内的増幅因子」で記述
- きっかけだけで終わらない

8) mood_up_trigger（3件、各60〜90字）
- 回復要因を「安心条件 + 回復機序」で記述
- 「良かった」で終わらない

9) protective_assets（3件、各60〜90字）
- 既に持っている回復資源・守りの行動
- 本人が再利用できる形で記述

10) early_warning_signs（3件、各35〜60字）
- 気分低下前に出る早期サイン
- 観測可能なサイン（思考/身体/行動）

11) next_month_theme（80字以内）
- 翌月の重点テーマを1本化（一本軸）

12) next_actions（3件、各45〜70字）
- 極小アクション（いつ/どこで/何を）
- 実行場面がわかる行動のみ

13) if_then_plans（3件、各50〜80字）
- If-Then形式で再発予防/回復促進
- 例: 「もしXなら、Yを3分だけ行う」

14) uncertainty_guard（70字以内）
- 根拠が薄い点・解釈の限界を1文で明示

【自己検査してから出力】
- 文字数制約を1つでも超えていたら短く修正してから最終JSONを出力
- 空文字・空配列は禁止
- 「mood_down_trigger」は必ず外的要因と内的要因の両方を含める
- 「if_then_plans」は必ず「もし〜なら、〜する」を含める
- JSON以外を出力しない

JSONのみ返してください:
{"summary":"","mood_pattern":["","",""],"reaction_loops":["",""],"core_values":["","",""],"hidden_needs":["","",""],"core_beliefs_hypothesis":["","",""],"mood_down_trigger":["","",""],"mood_up_trigger":["","",""],"protective_assets":["","",""],"early_warning_signs":["","",""],"next_month_theme":"","next_actions":["","",""],"if_then_plans":["","",""],"uncertainty_guard":""}`,
      }],
    })

    const aiContent = JSON.parse(extractJSON(completion.content[0].type === 'text' ? completion.content[0].text : ''))
    const reportContent = { ...aiContent, moodData }

    await adminClient.from('counseling_reports').upsert(
      { user_id: user.id, type: 'monthly', period, content: reportContent },
      { onConflict: 'user_id,type,period' }
    )

    await adminClient.from('counseling_messages').insert({
      user_id: user.id,
      role: 'assistant',
      content: `先月の月間レポートができました🌸\n[月間レポートを見る](/counseling/diary/reports/monthly/${period})`,
      mode: 'counseling',
    })

    return NextResponse.json({ report: reportContent, period, cached: false })
  } catch (err) {
    console.error('[monthly-report error]', err)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

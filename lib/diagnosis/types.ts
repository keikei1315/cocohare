import type { Axis1Trait, Axis2Trait } from './free-questions'

export type PersonalityType = `${Axis1Trait}${Axis2Trait}`

export interface TypeDefinition {
  code: PersonalityType
  name: string
  axis1Name: string
  axis2Name: string
  tagline: string
}

export const AXIS1_NAMES: Record<Axis1Trait, string> = {
  A: '共感性',
  B: '誠実さ',
  C: '感受性',
  D: '思慮深さ',
}

export const AXIS2_NAMES: Record<Axis2Trait, string> = {
  '1': '思いやり',
  '2': '向上心',
  '3': '繊細さ',
  '4': '洞察力',
}

export const PERSONALITY_TYPES: Record<PersonalityType, TypeDefinition> = {
  A1: { code: 'A1', name: 'やさしく照らすひと', axis1Name: '共感性', axis2Name: '思いやり', tagline: '人の気持ちに寄り添い、そっと光を灯す存在' },
  A2: { code: 'A2', name: '共に歩むひと', axis1Name: '共感性', axis2Name: '向上心', tagline: '人の気持ちを受け止めながら、一緒に前を向く力をもつ' },
  A3: { code: 'A3', name: '静かに感じるひと', axis1Name: '共感性', axis2Name: '繊細さ', tagline: '言葉にならない気持ちも感じ取り、深くつながれる' },
  A4: { code: 'A4', name: '心を読むひと', axis1Name: '共感性', axis2Name: '洞察力', tagline: '相手の表情の奥にある感情を、瞬時に読み取れる' },
  B1: { code: 'B1', name: '信頼を育てるひと', axis1Name: '誠実さ', axis2Name: '思いやり', tagline: '誠実さと優しさで、周囲から自然と頼られる存在' },
  B2: { code: 'B2', name: 'ひたむきに進むひと', axis1Name: '誠実さ', axis2Name: '向上心', tagline: '自分の信念を大切にしながら、まっすぐに成長し続ける' },
  B3: { code: 'B3', name: '丁寧に生きるひと', axis1Name: '誠実さ', axis2Name: '繊細さ', tagline: '細部まで気を配りながら、誠実に物事と向き合う' },
  B4: { code: 'B4', name: '静かな洞察者', axis1Name: '誠実さ', axis2Name: '洞察力', tagline: '言葉少なでも、本質を鋭く捉える力をもつ' },
  C1: { code: 'C1', name: 'そっと寄り添うひと', axis1Name: '感受性', axis2Name: '思いやり', tagline: '感じる力と優しさで、誰かのそばに自然といられる' },
  C2: { code: 'C2', name: '感性の開拓者', axis1Name: '感受性', axis2Name: '向上心', tagline: '豊かな感受性を原動力に、新しいことを切り拓いていく' },
  C3: { code: 'C3', name: '繊細な感性をもつひと', axis1Name: '感受性', axis2Name: '繊細さ', tagline: '世界の細やかな美しさや感情を、誰よりも深く受け取る' },
  C4: { code: 'C4', name: '世界の奥行きを感じるひと', axis1Name: '感受性', axis2Name: '洞察力', tagline: '感じることと考えることが一体になった、深い知性の持ち主' },
  D1: { code: 'D1', name: '思いやりの設計者', axis1Name: '思慮深さ', axis2Name: '思いやり', tagline: '全体を見渡しながら、一人ひとりを大切にできる' },
  D2: { code: 'D2', name: '戦略的に優しいひと', axis1Name: '思慮深さ', axis2Name: '向上心', tagline: '論理と情熱を兼ね備え、周囲を巻き込んで前に進む' },
  D3: { code: 'D3', name: '静かな観察者', axis1Name: '思慮深さ', axis2Name: '繊細さ', tagline: '深く考えながら感じ、見逃されがちな真実を捉える' },
  D4: { code: 'D4', name: '深く生きるひと', axis1Name: '思慮深さ', axis2Name: '洞察力', tagline: '思考と洞察の深さで、物事の本質に到達する' },
}

export interface Axis1Scores {
  A: number
  B: number
  C: number
  D: number
}

export interface Axis2Scores {
  '1': number
  '2': number
  '3': number
  '4': number
}

export function calculateType(answers: string[]): {
  axis1: Axis1Trait
  axis2: Axis2Trait
  axis1Scores: Axis1Scores
  axis2Scores: Axis2Scores
  typeCode: PersonalityType
  typeDef: TypeDefinition
} {
  const axis1Scores: Axis1Scores = { A: 0, B: 0, C: 0, D: 0 }
  const axis2Scores: Axis2Scores = { '1': 0, '2': 0, '3': 0, '4': 0 }

  for (const trait of answers) {
    if (trait === 'A' || trait === 'B' || trait === 'C' || trait === 'D') {
      axis1Scores[trait]++
    } else if (trait === '1' || trait === '2' || trait === '3' || trait === '4') {
      axis2Scores[trait]++
    }
  }

  const axis1 = (Object.entries(axis1Scores).sort(([, a], [, b]) => b - a)[0][0]) as Axis1Trait
  const axis2 = (Object.entries(axis2Scores).sort(([, a], [, b]) => b - a)[0][0]) as Axis2Trait
  const typeCode: PersonalityType = `${axis1}${axis2}`

  return {
    axis1,
    axis2,
    axis1Scores,
    axis2Scores,
    typeCode,
    typeDef: PERSONALITY_TYPES[typeCode],
  }
}

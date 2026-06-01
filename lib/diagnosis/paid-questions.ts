export interface PaidQuestion {
  id: number
  section: number
  sectionName: string
  text: string
}

export const PAID_QUESTIONS: PaidQuestion[] = [
  // SECTION 3: 消耗パターン
  { id: 21, section: 3, sectionName: '消耗パターン', text: '頼まれたことを断ったあと、罪悪感や後悔が長く残ることがある。' },
  { id: 22, section: 3, sectionName: '消耗パターン', text: '人と長時間一緒にいると、楽しくても終わったあとにどっと疲れる。' },
  { id: 23, section: 3, sectionName: '消耗パターン', text: '周りの期待に応えようとするうちに、自分が何をしたいか分からなくなることがある。' },
  { id: 24, section: 3, sectionName: '消耗パターン', text: '予定外のことが起きたり、急な変更があると、必要以上に消耗する。' },

  // SECTION 4: 回復パターン
  { id: 25, section: 4, sectionName: '回復パターン', text: '一人でぼーっとする時間があると、不思議と気持ちがリセットされる。' },
  { id: 26, section: 4, sectionName: '回復パターン', text: '好きなことに没頭している時間が、一番心が軽くなる。' },
  { id: 27, section: 4, sectionName: '回復パターン', text: '誰かに「話を聞いてもらえた」と感じると、それだけで楽になれる。' },
  { id: 28, section: 4, sectionName: '回復パターン', text: '自然の中や静かな場所にいると、じわじわと元気が戻ってくる。' },

  // SECTION 5: 人間関係スタイル
  { id: 29, section: 5, sectionName: '人間関係スタイル', text: '仲良くなるまでに時間がかかるが、一度心を開くと深く関われる。' },
  { id: 30, section: 5, sectionName: '人間関係スタイル', text: '相手が怒っていたり不機嫌だと、自分のせいかもと思いやすい。' },
  { id: 31, section: 5, sectionName: '人間関係スタイル', text: '本当に信頼できる人は少ないが、その人との関係はとても大切にする。' },
  { id: 32, section: 5, sectionName: '人間関係スタイル', text: '人間関係でのトラブルや衝突を、できるだけ避けようとする。' },

  // SECTION 6: 自己基準
  { id: 33, section: 6, sectionName: '自己基準', text: 'うまくいったことより、失敗したことや至らなかった点の方が頭に残りやすい。' },
  { id: 34, section: 6, sectionName: '自己基準', text: '「これでいいのかな」「もっとできたはず」と自分を責めることがよくある。' },
  { id: 35, section: 6, sectionName: '自己基準', text: '人から褒められても、素直に受け取れないことがある。' },
  { id: 36, section: 6, sectionName: '自己基準', text: '何かをするとき、「ちゃんとやらなきゃ」というプレッシャーを自分にかけやすい。' },

  // SECTION 7: 感情の処理スタイル
  { id: 37, section: 7, sectionName: '感情の処理スタイル', text: '感情が高ぶったとき、すぐに表に出すより、一人で整理してから話したいと思う。' },
  { id: 38, section: 7, sectionName: '感情の処理スタイル', text: 'つらいことがあっても「大丈夫」と言ってしまい、後からどっと来ることがある。' },
  { id: 39, section: 7, sectionName: '感情の処理スタイル', text: '自分の気持ちをうまく言葉にできなくて、もどかしくなることがある。' },
  { id: 40, section: 7, sectionName: '感情の処理スタイル', text: '感情を抑えているうちに、自分でも何を感じているか分からなくなることがある。' },
]

export const PAID_OPTIONS = [
  { label: 'とてもあてはまる',    value: 4 },
  { label: 'ややあてはまる',      value: 3 },
  { label: 'あまりあてはまらない', value: 2 },
  { label: 'あてはまらない',      value: 1 },
]

export type SectionScores = {
  section3: number  // 消耗パターン (Q21-24)
  section4: number  // 回復パターン (Q25-28)
  section5: number  // 人間関係スタイル (Q29-32)
  section6: number  // 自己基準 (Q33-36)
  section7: number  // 感情の処理スタイル (Q37-40)
}

export function calculateSectionScores(answers: number[]): SectionScores {
  return {
    section3: answers.slice(0, 4).reduce((a, b) => a + b, 0),
    section4: answers.slice(4, 8).reduce((a, b) => a + b, 0),
    section5: answers.slice(8, 12).reduce((a, b) => a + b, 0),
    section6: answers.slice(12, 16).reduce((a, b) => a + b, 0),
    section7: answers.slice(16, 20).reduce((a, b) => a + b, 0),
  }
}

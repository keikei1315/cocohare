export type Axis1Trait = 'A' | 'B' | 'C' | 'D'
export type Axis2Trait = '1' | '2' | '3' | '4'
export type AnyTrait = Axis1Trait | Axis2Trait

export interface QuestionOption {
  text: string
  trait: AnyTrait
}

export interface Question {
  id: number
  section: 1 | 2
  text: string
  options: QuestionOption[]
}

export const FREE_QUESTIONS: Question[] = [
  // SECTION 1: A共感性 / B誠実さ / C感受性 / D思慮深さ
  {
    id: 1,
    section: 1,
    text: '誰かが落ち込んでいるとき、あなたが自然にすることは？',
    options: [
      { text: '気持ちに寄り添いながら、じっくり話を聞く', trait: 'A' },
      { text: '状況を一緒に整理して、解決策を考える', trait: 'D' },
      { text: 'その場の空気や感情をそのまま感じ取る', trait: 'C' },
      { text: 'できることで助けながら、そばにいてあげる', trait: 'B' },
    ],
  },
  {
    id: 2,
    section: 1,
    text: '人から相談を受けたとき、まず何をしますか？',
    options: [
      { text: '自分が知っていることを正直にシェアする', trait: 'B' },
      { text: '言葉の裏にある気持ちを感じながら聞く', trait: 'C' },
      { text: '相手の感情に共感しながら、話をとことん聞く', trait: 'A' },
      { text: '問題の構造を整理してから意見を言う', trait: 'D' },
    ],
  },
  {
    id: 3,
    section: 1,
    text: '大切な決断をするとき、何を一番の軸にしますか？',
    options: [
      { text: '心が「これだ」と感じるかどうか', trait: 'C' },
      { text: '長期的に見て筋が通っているかどうか', trait: 'D' },
      { text: '自分の信念や価値観に正直かどうか', trait: 'B' },
      { text: '関わる人たちが幸せになれるかどうか', trait: 'A' },
    ],
  },
  {
    id: 4,
    section: 1,
    text: '友人グループで意見が割れたとき、あなたはどうしますか？',
    options: [
      { text: 'それぞれの意見の背景を考えて論点を整理する', trait: 'D' },
      { text: '自分が正しいと思うことを率直に伝える', trait: 'B' },
      { text: '場の雰囲気を感じながら、自然な流れに任せる', trait: 'C' },
      { text: 'みんなの気持ちを汲んで、落としどころを探す', trait: 'A' },
    ],
  },
  {
    id: 5,
    section: 1,
    text: '仕事でミスをした同僚に声をかけるとしたら？',
    options: [
      { text: '相手の様子を感じながら、タイミングを見て声をかける', trait: 'C' },
      { text: '「何が原因だったか一緒に整理しよう」と考える', trait: 'D' },
      { text: '「大丈夫？一人で抱え込まないでね」と気持ちに寄り添う', trait: 'A' },
      { text: '「次はこうすれば防げると思う」と具体的に伝える', trait: 'B' },
    ],
  },
  {
    id: 6,
    section: 1,
    text: '初めて会う人に対して、最初に気にするのは？',
    options: [
      { text: 'その人の考え方や価値観', trait: 'D' },
      { text: 'その人が今どんな気持ちでいるか', trait: 'A' },
      { text: '礼儀や約束を大切にできる人かどうか', trait: 'B' },
      { text: 'なんとなくの印象や空気感', trait: 'C' },
    ],
  },
  {
    id: 7,
    section: 1,
    text: '自分が誰かを傷つけてしまったと気づいたとき、あなたは？',
    options: [
      { text: '何がいけなかったかを冷静に振り返って整理する', trait: 'D' },
      { text: 'すぐに相手の気持ちを確認しに行く', trait: 'A' },
      { text: '自分の中でじっくり感情を処理してから向き合う', trait: 'C' },
      { text: 'きちんと謝罪して、二度と繰り返さないよう自分を律する', trait: 'B' },
    ],
  },
  {
    id: 8,
    section: 1,
    text: 'チームで新しいことに取り組むとき、どんな役割になりやすいですか？',
    options: [
      { text: '責任を持ってやり遂げる役', trait: 'B' },
      { text: 'データや背景を踏まえて方向性を示す役', trait: 'D' },
      { text: 'メンバーの気持ちを引き出す問いかけをする役', trait: 'A' },
      { text: '感覚やインスピレーションでアイデアを出す役', trait: 'C' },
    ],
  },
  {
    id: 9,
    section: 1,
    text: '休日、一番心が休まる過ごし方は？',
    options: [
      { text: 'やりたいことを計画通りにやり遂げる時間', trait: 'B' },
      { text: '気になっていたことを深く調べたり考えたりする時間', trait: 'D' },
      { text: '感覚を大切にして、ただゆっくり過ごす時間', trait: 'C' },
      { text: '大切な人と会って、ゆっくり話す時間', trait: 'A' },
    ],
  },
  {
    id: 10,
    section: 1,
    text: '自分の意見と違う人と話すとき、どんな姿勢になりますか？',
    options: [
      { text: 'お互いの意見を整理して、共通点を探す', trait: 'D' },
      { text: '言葉より「感じ」で相手の真意を読もうとする', trait: 'C' },
      { text: '自分の考えを正直に伝えながら、相手の話もちゃんと聞く', trait: 'B' },
      { text: 'まず相手の立場や気持ちを理解しようとする', trait: 'A' },
    ],
  },
  {
    id: 11,
    section: 1,
    text: 'プロジェクトがうまくいかなくなったとき、あなたは？',
    options: [
      { text: '問題の根本原因を分析して解決策を考える', trait: 'D' },
      { text: 'チームの雰囲気の変化に真っ先に気づいて伝える', trait: 'C' },
      { text: 'チームのみんなの気持ちを優先して話し合いの場を作る', trait: 'A' },
      { text: '責任の所在を明確にして、誠実に対応する', trait: 'B' },
    ],
  },
  {
    id: 12,
    section: 1,
    text: '長く続く人間関係で、あなたが大切にしていることは？',
    options: [
      { text: '嘘をつかず、約束を守ること', trait: 'B' },
      { text: '相手の気持ちをいつもわかろうとすること', trait: 'A' },
      { text: '深いところまで理解し合えること', trait: 'D' },
      { text: 'お互いの感情や変化に敏感でいること', trait: 'C' },
    ],
  },

  // SECTION 2: 1思いやり / 2向上心 / 3繊細さ / 4洞察力
  {
    id: 13,
    section: 2,
    text: '身近な人が何か頑張っているとき、あなたは自然に？',
    options: [
      { text: '「なぜ頑張れるのかな」と内面に興味を持つ', trait: '4' },
      { text: '「何か手伝えることはある？」と声をかける', trait: '1' },
      { text: 'その人の感情の細かい変化に気づく', trait: '3' },
      { text: '「自分も頑張ろう」と刺激を受ける', trait: '2' },
    ],
  },
  {
    id: 14,
    section: 2,
    text: '自分の成長を感じるのは、どんなシーンが多いですか？',
    options: [
      { text: '昨日の自分より少し上手になったとき', trait: '2' },
      { text: '物事の本質に気づいたとき', trait: '4' },
      { text: '誰かの役に立てたとき', trait: '1' },
      { text: '繊細な感覚が誰かの心に刺さったとき', trait: '3' },
    ],
  },
  {
    id: 15,
    section: 2,
    text: 'ストレスを感じやすいのはどんな状況ですか？',
    options: [
      { text: '自分の成長が止まっていると感じるとき', trait: '2' },
      { text: '誰かが悲しんでいるのに何もできないとき', trait: '1' },
      { text: '物事の表面しか語られない会話が続くとき', trait: '4' },
      { text: '空気が重たい場所に長くいなければならないとき', trait: '3' },
    ],
  },
  {
    id: 16,
    section: 2,
    text: '自分が誇りに思う瞬間はどんなとき？',
    options: [
      { text: '誰も気づいていないことに気づいたとき', trait: '4' },
      { text: '微妙なニュアンスや美しさを感じ取れたとき', trait: '3' },
      { text: '高い目標を達成したとき', trait: '2' },
      { text: '誰かの笑顔を引き出せたとき', trait: '1' },
    ],
  },
  {
    id: 17,
    section: 2,
    text: '新しいことを学ぶとき、何が一番のモチベーションですか？',
    options: [
      { text: '新しい感覚や表現に出会えるから', trait: '3' },
      { text: '世界の見え方が変わる発見があるから', trait: '4' },
      { text: '自分がもっと成長できるから', trait: '2' },
      { text: '誰かの役に立てる知識やスキルになるから', trait: '1' },
    ],
  },
  {
    id: 18,
    section: 2,
    text: '誰かと深い関係を築くとき、最初のきっかけになりやすいのは？',
    options: [
      { text: '同じ目標や志を持っていると気づいたとき', trait: '2' },
      { text: '相手の深い部分に触れる話ができたとき', trait: '4' },
      { text: '相手が大変そうで、自然と寄り添ったとき', trait: '1' },
      { text: '言葉より雰囲気でわかり合えた感覚があったとき', trait: '3' },
    ],
  },
  {
    id: 19,
    section: 2,
    text: '一日の終わりに「いい日だった」と思うのはどんなとき？',
    options: [
      { text: '目標に向けて前進できた日', trait: '2' },
      { text: '誰かに優しくできた日', trait: '1' },
      { text: '深く考え、何か気づきがあった日', trait: '4' },
      { text: '心が動く瞬間があった日', trait: '3' },
    ],
  },
  {
    id: 20,
    section: 2,
    text: '職場や学校での人間関係で、あなたが大切にするのは？',
    options: [
      { text: '表面だけでなく本質で分かり合えること', trait: '4' },
      { text: 'お互いに切磋琢磨できる関係', trait: '2' },
      { text: '困っている人がいたら助けること', trait: '1' },
      { text: '言葉にならない空気感も大切にすること', trait: '3' },
    ],
  },
]

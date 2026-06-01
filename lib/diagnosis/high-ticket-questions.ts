export type StrengthDomain = '関係力' | '思考力' | '実行力' | '表現力'

export interface StrengthTalent {
  name: string
  description: string
  questions: [string, string, string]
}

export interface StrengthDomainDef {
  domain: StrengthDomain
  talents: StrengthTalent[]
}

export const STRENGTH_DOMAINS: StrengthDomainDef[] = [
  {
    domain: '関係力',
    talents: [
      {
        name: '共感する力',
        description: '誰かの感情や内面を、言葉なしに感じ取る力',
        questions: [
          '誰かの話を聞くとき、言葉より先に相手の気持ちが伝わってくる感覚がある。',
          '相手が感情を抑えているとき、それに自然と気づいてしまうことがよくある。',
          '誰かが何を感じているか、その場の空気や表情から直感的に分かることが多い。',
        ],
      },
      {
        name: '支える力',
        description: '人の成長や回復を、そばで見守り助ける力',
        questions: [
          '誰かが困っているとき、何かしてあげたいという気持ちが自然と湧いてくる。',
          '人が少しずつ成長していく姿を近くで見守ることに、大きな喜びを感じる。',
          '相手のペースに合わせて、じっくりと関わることが苦にならない。',
        ],
      },
      {
        name: '伝える力',
        description: '自分の考えや気持ちを、相手に届く言葉にする力',
        questions: [
          '複雑なことでも、相手に合わせた言葉で分かりやすく説明できる。',
          '自分の考えや気持ちを言葉にすることが得意だと感じる。',
          '話した後に「よく分かった」「すっきりした」と言ってもらえることが多い。',
        ],
      },
      {
        name: '場をつくる力',
        description: '人が集まる空間を、安心・心地よい場にする力',
        questions: [
          'その場の雰囲気が良くなるよう、自然と気を配っていることが多い。',
          '自分がいることで、場が和んだり話しやすくなると感じることがある。',
          '人が集まる場を企画したり、みんなが楽しめるよう工夫することが得意だと思う。',
        ],
      },
      {
        name: '人をつなげる力',
        description: '人と人の縁を結び、新しい関係を生み出す力',
        questions: [
          '「この人とあの人は合いそう」と直感的に感じ、紹介したくなることがある。',
          '人と人の間に立って、橋渡し役になることが多い。',
          '自分の縁や人脈が誰かの役に立つことに、喜びを感じる。',
        ],
      },
    ],
  },
  {
    domain: '思考力',
    talents: [
      {
        name: '深める力',
        description: '一つのことをとことん掘り下げ、本当の意味を探る力',
        questions: [
          '一つのことを徹底的に掘り下げないと、気が済まない性格だと思う。',
          '表面的な理解では満足できず、根本まで理解したくなる。',
          '深く知れば知るほど、そのことへの興味がさらに増していく。',
        ],
      },
      {
        name: '見通す力',
        description: '今の状況から、この先の展開を予測・想像する力',
        questions: [
          '今の状況から、この先どうなるかを予測することが比較的得意だと思う。',
          '物事を決める前に、将来的な影響や展開を考えることが多い。',
          '「そういうことになると思っていた」と感じる場面がよくある。',
        ],
      },
      {
        name: '問いかける力',
        description: '当たり前を疑い、本質に近づく問いを立てる力',
        questions: [
          '当たり前とされていることに「本当にそうなのか？」と疑問を持つことが多い。',
          '物事の前提を問い直すことで、新しい視点を見つけることがある。',
          '「なぜ？」を繰り返すことで、本質に近づいていく感覚がある。',
        ],
      },
      {
        name: '本質を掴む力',
        description: '複雑な状況の中から、最も大切なことを見抜く力',
        questions: [
          '複雑な状況でも、何が一番大事かをシンプルに整理できる。',
          '核心を一言で言い表せたとき、すっきりとした満足感がある。',
          '細かい部分より、全体の中で何が重要かに自然と目が向く。',
        ],
      },
      {
        name: '統合する力',
        description: 'バラバラな情報・アイデアを結びつけ、新しい意味を生み出す力',
        questions: [
          '一見関係ないような情報やアイデアの間に、つながりを見つけることがある。',
          '異なる視点や知識を組み合わせて考えることが好きだ。',
          'バラバラな要素をまとめて、新しい何かを生み出すことが得意だと思う。',
        ],
      },
    ],
  },
  {
    domain: '実行力',
    talents: [
      {
        name: 'やり遂げる力',
        description: '始めたことを最後まで完了させる、粘り強さと責任感',
        questions: [
          '始めたことは最後まで完了させないと気が済まない。',
          '困難があっても、諦めずに続けることが多い。',
          '完成させることへのこだわりが強い方だと思う。',
        ],
      },
      {
        name: '整える力',
        description: '複雑な状況を整理し、秩序と仕組みをつくる力',
        questions: [
          '複雑な状況を整理して、秩序をつくることが得意だと思う。',
          '計画を立てて、順序よく物事を進めることに安心感を感じる。',
          'バラバラになっているものを整理することで、力を発揮できる。',
        ],
      },
      {
        name: '動かす力',
        description: '方向性を示し、周りの人を巻き込んで前進させる力',
        questions: [
          '「やろう」と声をかけると、周りが自然と動いてくれることが多い。',
          '方向性を示したり、率先して行動することが得意だと思う。',
          'グループやチームをまとめる役割になることが多い。',
        ],
      },
      {
        name: '積み上げる力',
        description: 'コツコツと継続し、地道な積み重ねで大きな成果を出す力',
        questions: [
          '少しずつでも続けることで、大きな成果を出してきたと感じる。',
          '急に大きな結果を求めるより、地道に積み重ねることが自分には合っている。',
          '継続することを大切にしており、習慣を守ることが比較的得意だ。',
        ],
      },
      {
        name: '立て直す力',
        description: 'うまくいかないときでも、回復して前に進める力',
        questions: [
          'うまくいかなかったとき、落ち込みながらも立ち直ることができる。',
          '失敗から学んで、次に活かすことが得意だと思う。',
          '問題が起きたとき、解決策を見つけることに集中できる。',
        ],
      },
    ],
  },
  {
    domain: '表現力',
    talents: [
      {
        name: '生み出す力',
        description: 'ゼロから新しいアイデアや価値を創り出す力',
        questions: [
          'まだ世にないものや、新しいアイデアを考えることが好きだ。',
          '既存のやり方に縛られず、ゼロから何かを作り上げることにわくわくする。',
          'アイデアが次々と浮かんでくることがある。',
        ],
      },
      {
        name: '感じ取る力',
        description: '美しさ・違和感・心地よさを敏感に察知する力',
        questions: [
          '美しいもの・心地よいもの・違和感があるものに、敏感に気づく。',
          '空間や環境が自分の感情や思考に影響することをよく感じる。',
          '人が言葉にできないような感覚やニュアンスを、感じ取ることができる。',
        ],
      },
      {
        name: '物語る力',
        description: '体験や想いを、人の心に届くストーリーにして伝える力',
        questions: [
          '自分の体験や考えを、ストーリーとして語ることが得意だと思う。',
          '事実や情報を、人の心に届く言葉やエピソードに変えることができる。',
          '話や文章に、感情や温度感を乗せることが比較的得意だ。',
        ],
      },
      {
        name: '彩る力',
        description: '見せ方・表現の仕方にこだわり、物事を美しく整える力',
        questions: [
          '見た目・デザイン・表現の仕方にこだわりがある。',
          '何かを伝えるとき、どう見せるか・どう表現するかを大切にしている。',
          '美的センスや審美眼が、自分の強みの一つだと思う。',
        ],
      },
      {
        name: '鼓舞する力',
        description: '人のポジティブな面を引き出し、前向きなエネルギーを与える力',
        questions: [
          '誰かの良い面を見つけて、言葉にして伝えることが自然にできる。',
          '周りの人のやる気や自信を引き出すことが得意だと思う。',
          '自分の言葉や行動で、誰かが前向きになれたときに大きな喜びを感じる。',
        ],
      },
    ],
  },
]

export const DEEP_PSYCH_QUESTIONS = [
  {
    text: '目の前に扉があります。その扉はどんな状態ですか？',
    options: [
      { value: 'A', text: '鍵がかかっている' },
      { value: 'B', text: '少し開いているが、中が見えない' },
      { value: 'C', text: '大きく開いているが、なぜか入れない' },
      { value: 'D', text: '扉がどこにあるか分からない' },
    ],
  },
  {
    text: 'あなたは今、どんな場所にいる感じがしますか？',
    options: [
      { value: 'A', text: '深い森の中（出口が見えない）' },
      { value: 'B', text: '高い山の頂上（景色はいいが、一人）' },
      { value: 'C', text: '静かな部屋の隅（安心できる場所）' },
      { value: 'D', text: '広い海の真ん中（自由だけど、不安）' },
    ],
  },
  {
    text: '夜、眠れないとき、頭の中に浮かぶのはどれに近いですか？',
    options: [
      { value: 'A', text: '誰かに言えなかった言葉' },
      { value: 'B', text: 'やり残したこと・できなかったこと' },
      { value: 'C', text: 'あのときの後悔' },
      { value: 'D', text: 'これからへの漠然とした不安' },
    ],
  },
  {
    text: '鏡の前に立ったとき、あなたはどんな気持ちになりますか？',
    options: [
      { value: 'A', text: '目を合わせるのが少し怖い' },
      { value: 'B', text: 'なんとなく避けてしまう' },
      { value: 'C', text: '特に何も感じない' },
      { value: 'D', text: '素直に見つめられる' },
    ],
  },
  {
    text: '大切な人からプレゼントをもらいました。最初に感じるのはどれですか？',
    options: [
      { value: 'A', text: '嬉しいが、お返しをしなければと焦る' },
      { value: 'B', text: 'こんな自分に、なぜ？と少し不思議に感じる' },
      { value: 'C', text: '素直に嬉しいが、表現するのが照れくさい' },
      { value: 'D', text: '素直に「ありがとう」と受け取れる' },
    ],
  },
  {
    text: '泣いている子どもがいます。あなたはどうしますか？',
    options: [
      { value: 'A', text: 'すぐに抱きしめてあげたい' },
      { value: 'B', text: '泣き止むまでそっとそばにいる' },
      { value: 'C', text: 'なぜ泣いているか、原因を探す' },
      { value: 'D', text: 'どうしてあげればいいか分からず、戸惑う' },
    ],
  },
  {
    text: 'あなたが一番怖いのはどれですか？',
    options: [
      { value: 'A', text: '誰かに嫌われること' },
      { value: 'B', text: '誰かを傷つけてしまうこと' },
      { value: 'C', text: '何もできないまま時間が過ぎること' },
      { value: 'D', text: '本当の自分を知られること' },
    ],
  },
  {
    text: '長い旅から帰ってきました。家の扉を開けると、何がありますか？',
    options: [
      { value: 'A', text: '誰もいない、静かな部屋' },
      { value: 'B', text: '大切な人が待っている' },
      { value: 'C', text: '自分の知らないものが置かれている' },
      { value: 'D', text: '何も変わっていない、いつもの景色' },
    ],
  },
  {
    text: '植物を育てています。その植物は今、どんな状態ですか？',
    options: [
      { value: 'A', text: '水をあげたいのに、あげ方が分からない' },
      { value: 'B', text: '枯れかけているが、なんとか生きている' },
      { value: 'C', text: '少しずつ、育っている' },
      { value: 'D', text: 'のびのびと、育っている' },
    ],
  },
  {
    text: 'あなたの心の中に、ずっと閉じた引き出しがあります。その中に何が入っていると思いますか？',
    options: [
      { value: 'A', text: '誰にも言えなかった言葉' },
      { value: 'B', text: '悲しみ' },
      { value: 'C', text: '怒り' },
      { value: 'D', text: 'まだ開いたことがないから、分からない' },
    ],
  },
  {
    text: '誰もいない砂浜を一人で歩いています。足元に何かを見つけました。何ですか？',
    options: [
      { value: 'A', text: '誰かが書いた手紙' },
      { value: 'B', text: '古い鍵' },
      { value: 'C', text: 'きれいな貝殻' },
      { value: 'D', text: '何も見つからない。ただ歩き続ける' },
    ],
  },
  {
    text: '空を見上げると、一面に雲が広がっています。あなたの目が止まるのはどれですか？',
    options: [
      { value: 'A', text: '一つだけ、ぽつんと離れた雲' },
      { value: 'B', text: '大きな雲の陰に隠れた小さな雲' },
      { value: 'C', text: '形が変わり続ける雲' },
      { value: 'D', text: 'ゆっくりと流れていく雲' },
    ],
  },
]

export const SPIRITUAL_QUESTIONS = [
  {
    type: 'choice' as const,
    text: '今の自分の状態を、直感で選んでください。',
    options: [
      { value: 'A', text: '嵐の中にいる（混乱・葛藤）' },
      { value: 'B', text: '霧の中にいる（迷い・不明瞭）' },
      { value: 'C', text: '夜明け前にいる（変化の予感）' },
      { value: 'D', text: '静かな海にいる（安定・休息）' },
    ],
  },
  {
    type: 'text' as const,
    text: '最近、偶然とは思えない出来事や「何かに導かれている」と感じた瞬間はありましたか？\nあれば教えてください。（なければ「なし」でOK）',
  },
  {
    type: 'choice' as const,
    text: '今の自分に一番響く言葉を、直感で選んでください。',
    options: [
      { value: 'A', text: '手放す' },
      { value: 'B', text: '信じる' },
      { value: 'C', text: '動く' },
      { value: 'D', text: '休む' },
    ],
  },
  {
    type: 'text' as const,
    text: '今、直感が「これが大事」と言っていることを一言で書いてください。',
  },
  {
    type: 'choice' as const,
    text: '人生の流れについて、今の感覚に近いのはどれですか？',
    options: [
      { value: 'A', text: '自分で切り開いているという感覚' },
      { value: 'B', text: '何かに流されている感覚' },
      { value: 'C', text: '止まっているような感覚' },
      { value: 'D', text: '少しずつ動き始めている感覚' },
    ],
  },
  {
    type: 'text' as const,
    text: '今のあなたが、未来の自分に伝えたい一言は何ですか？',
  },
]

export function calculateStrengthScores(answers: number[]): { talent: string; domain: StrengthDomain; score: number }[] {
  const results: { talent: string; domain: StrengthDomain; score: number }[] = []
  let answerIdx = 0
  for (const domainDef of STRENGTH_DOMAINS) {
    for (const talent of domainDef.talents) {
      const score = answers[answerIdx] + answers[answerIdx + 1] + answers[answerIdx + 2]
      results.push({ talent: talent.name, domain: domainDef.domain, score })
      answerIdx += 3
    }
  }
  return results.sort((a, b) => b.score - a.score)
}

export function calculateDomainScores(answers: number[]): { domain: StrengthDomain; total: number; pct: number }[] {
  const scores = calculateStrengthScores(answers)
  const maxPerDomain = 60
  const domains: StrengthDomain[] = ['関係力', '思考力', '実行力', '表現力']
  return domains.map(domain => {
    const total = scores.filter(s => s.domain === domain).reduce((a, b) => a + b.score, 0)
    return { domain, total, pct: Math.round((total / maxPerDomain) * 100) }
  })
}

# UI導線変更メモ（LINEカウンセリング移行）

## 変更日
2026-06-09

## 背景
LINEカウンセリングサービス（https://line.me/R/ti/p/@455zndeb）への導線に切り替えるため、
cocohare内のチャット・一部機能への導線をUIから削除した。
コード・機能自体は残っているため、方針変更時に導線を復元できる。

---

## 変更ファイルと内容

### 1. `app/home-client.tsx`

**削除したもの①：「ぽとりと話す」カード（サブスク済み・未サブスク両方）**
```tsx
<div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
  <div className="flex justify-center mb-3">
    <Image src="/potori/humming.webp" alt="ぽとり" width={72} height={72} className="object-contain" />
  </div>
  <h2 className="text-sm font-medium mb-1.5" style={{ color: '#3F342D' }}>ぽとりと話す</h2>
  <p className="text-xs leading-relaxed mb-4" style={{ color: '#3F342D99' }}>
    今日のきもちを話してみましょう。<br />
    ぽとりがそっと寄り添います。
  </p>
  <Link
    href="/counseling/chat"
    className="block w-full py-3 rounded-xl text-white text-sm font-medium transition hover:opacity-90"
    style={{ backgroundColor: '#FAA66B' }}
  >
    話しはじめる
  </Link>
</div>
```

**削除したもの②：通知を許可するボタン（PwaNotifButtons）**
```tsx
<PwaNotifButtons />
```
※ コメントアウトで残してある（`{/* <PwaNotifButtons /> */}`）

**追加したもの：LINE CTA（診断ボタン下・両状態共通）**
```tsx
<a
  href="https://line.me/R/ti/p/@455zndeb"
  target="_blank"
  rel="noopener noreferrer"
  className="block rounded-2xl p-5 mb-4 text-center"
  style={{ backgroundColor: '#00B900', textDecoration: 'none' }}
>
  <p className="text-sm font-bold mb-1" style={{ color: '#fff' }}>LINEでAIカウンセリング</p>
  <p className="text-xs" style={{ color: '#ffffff99' }}>ぽとりとLINEで話してみよう</p>
</a>
```

---

### 2. `app/components/GlobalNavDrawer.tsx`

**削除したもの①：「ぽとりと話す」メニュー項目**
```tsx
{subscribed && (
  <button style={itemStyle} onClick={() => go('/counseling/chat')}>{icons.chat}ぽとりと話す</button>
)}
```

**削除したもの②：「ぽとりの日記」「気分チェック」「週間レポート」メニュー項目**
```tsx
{(plan === 'take' || plan === 'matsu') && (
  <>
    <button style={itemStyle} onClick={() => go('/counseling/diary')}>{icons.diary}ぽとりの日記</button>
    <button style={itemStyle} onClick={() => go('/counseling/mood-check')}>{icons.mood}気分チェック</button>
    <button style={itemStyle} onClick={() => go('/counseling/diary/reports')}>{icons.report}週間レポート</button>
  </>
)}
```
※ コメントアウトで残してある

**削除したもの③：サブスクCTAボタン（「サブスクに登録する」「プランを確認する」「プランをアップグレード」）**
```tsx
{isLoggedIn && !subscribed && (
  <div style={{ padding: '16px', borderTop: '1px solid #F0EAE5' }}>
    <button onClick={() => go('/subscription')} ...>サブスクに登録する</button>
  </div>
)}
{isLoggedIn && subscribed && (
  <div style={{ padding: '16px', borderTop: '1px solid #F0EAE5' }}>
    <button onClick={() => go('/subscription')} ...>
      {plan === 'matsu' ? 'プランを確認する' : 'プランをアップグレード'}
    </button>
  </div>
)}
```
※ コメントアウトで残してある

---

### 3. `app/diagnosis/free/result/[id]/page.tsx`

**追加したもの：LINE CTA（ページ最下部）**
```tsx
<a
  href="https://line.me/R/ti/p/@455zndeb"
  target="_blank"
  rel="noopener noreferrer"
  className="block rounded-2xl p-5 text-center"
  style={{ backgroundColor: '#00B900', textDecoration: 'none' }}
>
  <p className="text-sm font-bold mb-1" style={{ color: '#fff' }}>LINEでAIカウンセリング</p>
  <p className="text-xs" style={{ color: '#ffffff99' }}>ぽとりとLINEで話してみよう</p>
</a>
```

---

## 復元方法

1. `home-client.tsx` の「ぽとりと話す」カードを元の位置に追加、`PwaNotifButtons` のコメントアウトを解除
2. `GlobalNavDrawer.tsx` のコメントアウトを解除
3. LINE CTAを削除
4. デプロイ

チャット機能自体（`/counseling/chat`）はそのまま動いているため、導線を復元するだけでOK。

export default function GameLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section>
      {/* ゲーム画面は余計な余白を消したりできます */}
      {children}
    </section>
  )
}
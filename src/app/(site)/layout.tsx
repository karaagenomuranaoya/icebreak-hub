export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section>
      {/* 将来ここに共通ヘッダーなどを入れます */}
      {children}
    </section>
  )
}
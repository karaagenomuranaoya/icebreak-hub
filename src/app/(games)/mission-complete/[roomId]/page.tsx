export default function GuestEntrance({ params }: { params: { roomId: string } }) {
  // params.roomId で部屋IDが取れます
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-100">
      <h1 className="text-xl font-bold">ここに「名前入力画面」を作ります</h1>
      <p>部屋ID: {params.roomId}</p>
    </div>
  )
}
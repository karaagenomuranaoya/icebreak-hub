'use client'

import { useParams } from 'next/navigation'

export default function PlayPage() {
  const { roomId } = useParams()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
      <h1 className="text-3xl font-bold animate-bounce">
        🎮 ゲームスタート！
      </h1>
      <p className="mt-4">Room ID: {roomId}</p>
    </div>
  )
}
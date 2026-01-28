'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function GuestJoinPage() {
  const { roomId } = useParams()
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    // 1. プレイヤーテーブルに登録
    const { error } = await supabase
      .from('players')
      .insert([
        {
          room_id: roomId,
          name: name,
          is_host: false,
          score: 0
        }
      ])

    if (error) {
      console.error(error)
      alert('参加に失敗しました')
      setLoading(false)
    } else {
      setJoined(true)
    }
  }

  // 参加後の待機画面
  if (joined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
        <div className="text-6xl mb-4">🥂</div>
        <h1 className="text-2xl font-bold mb-2">参加完了！</h1>
        <p className="text-xl text-yellow-400 font-bold mb-8">{name} さん</p>
        <p className="text-gray-400">
          ホストが開始するまで<br />
          そのままお待ちください...
        </p>
        <div className="mt-8 animate-pulse text-sm text-gray-500">
          画面を閉じないでね
        </div>
      </div>
    )
  }

  // 名前入力画面
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow-lg">
        <h1 className="text-xl font-bold text-gray-800 mb-6 text-center">
          ミッション・コンプリート<br/>に参加
        </h1>
        
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">ニックネーム</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: たなか"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-black"
              maxLength={10}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? '参加中...' : 'ゲームに参加する'}
          </button>
        </form>
      </div>
    </div>
  )
}
'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function MissionCompleteEntrance() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const createRoom = async () => {
    setLoading(true)
    
    // 1. 部屋を作成
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    const { data, error } = await supabase
      .from('rooms')
      .insert([{ code, game_type: 'mission-complete', status: 'waiting' }])
      .select()
      .single()

    if (error) {
      console.error(error)
      alert('作成失敗')
      setLoading(false)
      return
    }

    // 2. 参加画面へ移動（★ここを変更）
    // PC用ロビーではなく、参加画面へ直接飛ばす。?role=host をつけるのがミソ。
    router.push(`/mission-complete/${data.id}?role=host`)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-8 text-center text-yellow-400">
        MISSION<br/>COMPLETE
      </h1>
      <p className="mb-12 text-gray-300 text-center text-sm">
        スマホ1台で完結。<br/>幹事も一緒に遊べるスパイゲーム。
      </p>
      <button
        onClick={createRoom}
        disabled={loading}
        className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-10 rounded-full text-xl transition disabled:opacity-50"
      >
        {loading ? '作成中...' : '新しい部屋を作る'}
      </button>
    </div>
  )
}
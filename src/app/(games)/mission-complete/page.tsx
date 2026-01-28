'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function MissionCompleteEntrance() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const createRoom = async () => {
    setLoading(true)
    
    // 1. 4桁のランダムな部屋コードを生成
    const code = Math.floor(1000 + Math.random() * 9000).toString()

    // 2. Supabaseに部屋を作成
    const { data, error } = await supabase
      .from('rooms')
      .insert([
        { 
          code: code, 
          game_type: 'mission-complete', 
          status: 'waiting' 
        }
      ])
      .select()
      .single()

    if (error) {
      console.error(error)
      alert('部屋の作成に失敗しました')
      setLoading(false)
      return
    }

    // 3. ロビー画面へ移動 (部屋のIDをURLに含める)
    router.push(`/mission-complete/${data.id}/lobby`)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-8 text-center text-yellow-400">
        MISSION<br/>COMPLETE
      </h1>
      
      <p className="mb-12 text-gray-300 text-center">
        スパイのように任務を遂行せよ。<br/>
        飲み会専用ミッションゲーム。
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
'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// 型定義
type Mission = {
  id: string
  mission_content: string
  status: string
}

export default function PlayPage() {
  const { roomId } = useParams()
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. 自分がプレイヤーか、メイン画面（PC）かを判定
    const storedId = localStorage.getItem('mc_player_id')
    setPlayerId(storedId)

    if (storedId) {
      // --- プレイヤー（スマホ）の場合: ミッションを取得 ---
      const fetchMissions = async () => {
        const { data } = await supabase
          .from('mc_player_missions')
          .select('*')
          .eq('player_id', storedId)
        
        if (data) setMissions(data)
        setLoading(false)
      }
      fetchMissions()
    } else {
      // --- メイン画面（PC）の場合 ---
      setLoading(false)
    }
  }, [])

  // -------------------------------------------
  // View A: メイン画面 (PC / プロジェクター用)
  // -------------------------------------------
  if (!playerId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4 text-center">
        <h2 className="text-xl text-yellow-500 font-bold mb-4">CURRENT TOPIC</h2>
        <div className="bg-white text-black p-8 rounded-xl shadow-2xl max-w-4xl w-full">
          <p className="text-4xl md:text-6xl font-bold">
            「最近、一番笑ったこと」
          </p>
        </div>
        <p className="mt-8 text-gray-400">
          この話題を話しながら、<br/>こっそりミッションを遂行してください。
        </p>
      </div>
    )
  }

  // -------------------------------------------
  // View B: プレイヤー画面 (スマホ用)
  // -------------------------------------------
  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-20">
      <h1 className="text-center font-bold text-gray-700 mb-4">あなたの極秘ミッション</h1>
      
      {loading ? (
        <p className="text-center mt-10">指令を受信中...</p>
      ) : (
        <div className="space-y-4">
          {missions.map((mission) => (
            <div 
              key={mission.id} 
              className={`p-5 rounded-xl border-l-8 shadow-md transition-transform active:scale-95 ${
                mission.status === 'completed' 
                  ? 'bg-gray-300 border-gray-500 opacity-60' 
                  : 'bg-white border-yellow-500'
              }`}
            >
              <p className={`font-bold text-lg mb-2 ${mission.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                {mission.mission_content}
              </p>
              
              {mission.status !== 'completed' && (
                <button 
                  className="w-full mt-2 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-500"
                  onClick={() => alert('次のステップで「承認機能」を実装します！')}
                >
                  達成した！
                </button>
              )}
              
              {mission.status === 'completed' && (
                <p className="text-center text-sm font-bold text-gray-600">MISSION COMPLETED</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
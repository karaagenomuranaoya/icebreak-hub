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
  const completeMission = async (missionId: string) => {
    // 1. 楽観的UI更新（サーバーを待たずに即座に完了済みにする）
    setMissions((prev) => 
      prev.map((m) => 
        m.id === missionId ? { ...m, status: 'completed' } : m
      )
    )

    // 2. サーバーに送信
    const { error } = await supabase
      .from('mc_player_missions')
      .update({ status: 'completed' })
      .eq('id', missionId)
    
    if (error) {
      console.error(error)
      alert('通信エラー：やり直してください')
      // エラーなら元に戻す処理が必要ですが、MVPなので割愛
    }
  }

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
              className={`p-5 rounded-xl border-l-8 shadow-md transition-all duration-300 ${
                mission.status === 'completed' 
                  ? 'bg-gray-800 border-gray-600 scale-95' // 完了したらダークに
                  : 'bg-white border-yellow-500'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                 <p className={`font-bold text-lg ${mission.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  {mission.mission_content}
                </p>
                {/* 完了バッジ */}
                {mission.status === 'completed' && (
                  <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">COMPLETED</span>
                )}
              </div>
              
              {/* ボタン：完了していない時だけ表示 */}
              {mission.status !== 'completed' && (
                <button 
                  className="w-full mt-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-3 rounded-lg shadow-lg active:scale-95 transition-transform"
                  onClick={() => completeMission(mission.id)}
                >
                  任務完了ボタン
                </button>
              )}
              
              {mission.status === 'completed' && (
                <p className="text-center text-xs text-gray-500 mt-1">ナイススパイ！</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
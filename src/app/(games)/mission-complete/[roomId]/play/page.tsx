'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// 型定義
type Mission = { id: string; mission_content: string; status: string }

export default function PlayPage() {
  const { roomId } = useParams()
  const router = useRouter()
  
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false) // ホストかどうか
  const [missions, setMissions] = useState<Mission[]>([])
  const [currentTopic, setCurrentTopic] = useState<string>('話題を抽選中...')
  const [loading, setLoading] = useState(true)
  const [showAdminMenu, setShowAdminMenu] = useState(false) // 管理メニュー用
  const [notification, setNotification] = useState<string | null>(null) // 速報用

  useEffect(() => {
    const storedId = localStorage.getItem('mc_player_id')
    if (!storedId) return 
    setPlayerId(storedId)

    // 1. 初期データ取得
    const initData = async () => {
      // プレイヤー情報（ホスト確認）
      const { data: player } = await supabase
        .from('players')
        .select('is_host')
        .eq('id', storedId)
        .single()
      if (player) setIsHost(player.is_host)

      // ミッション取得
      const { data: myMissions } = await supabase
        .from('mc_player_missions')
        .select('*')
        .eq('player_id', storedId)
      if (myMissions) setMissions(myMissions)

      // 現在のお題を取得
      const { data: room } = await supabase
        .from('rooms')
        .select('current_topic')
        .eq('id', roomId)
        .single()
      if (room && room.current_topic) setCurrentTopic(room.current_topic)
      else if (player?.is_host) handleChangeTopic() // お題が空ならホストが初期化

      setLoading(false)
    }

    initData()

    // 2. リアルタイム監視
    // A. お題の変更を監視
    const roomChannel = supabase.channel('play-room-topic')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.new.current_topic) setCurrentTopic(payload.new.current_topic)
        }
      ).subscribe()
    
    // B. 他人のミッション達成を監視（速報用）
    // ※今回は誰が達成したかまで厳密に取らず、とりあえず「誰か」で通知する簡易版
    const missionChannel = supabase.channel('play-missions')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mc_player_missions' },
        (payload) => {
          if (payload.new.status === 'completed') {
            showNotification('速報：誰かが極秘任務を遂行しました！')
          }
        }
      ).subscribe()

    return () => {
      supabase.removeChannel(roomChannel)
      supabase.removeChannel(missionChannel)
    }
  }, [roomId])

  // --- アクション関数 ---

  // お題チェンジ（ホストのみ）
  const handleChangeTopic = async () => {
    setShowAdminMenu(false)
    const { error } = await supabase.rpc('change_topic', { p_room_id: roomId })
    if (error) console.error(error)
  }

  // ミッション達成（自分）
  const completeMission = async (missionId: string) => {
    // UIを即座に更新
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, status: 'completed' } : m))
    
    await supabase
      .from('mc_player_missions')
      .update({ status: 'completed' })
      .eq('id', missionId)
  }

  // 通知表示ヘルパー
  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  if (loading) return <div className="text-center text-white mt-20">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      
      {/* 1. ヘッダー：お題表示エリア (全員に見える) */}
      <div className="bg-gray-900 text-white p-6 rounded-b-3xl shadow-xl sticky top-0 z-10">
        <div className="flex justify-between items-start mb-2">
          <span className="text-yellow-400 text-xs font-bold tracking-widest">CURRENT TOPIC</span>
          
          {/* ホスト専用：管理ボタン */}
          {isHost && (
            <div className="relative">
              <button 
                onClick={() => setShowAdminMenu(!showAdminMenu)}
                className="text-2xl hover:text-yellow-400 transition"
              >
                ⚙️
              </button>
              {/* 管理メニュー */}
              {showAdminMenu && (
                <div className="absolute right-0 top-10 bg-white text-black rounded-lg shadow-xl w-48 overflow-hidden z-50">
                  <button 
                    onClick={handleChangeTopic}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b font-bold"
                  >
                    🎲 話題を変える
                  </button>
                  <button 
                    onClick={() => alert('リザルト画面は未実装です！')}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 text-red-600 font-bold"
                  >
                    🏁 ゲーム終了
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <h2 className="text-2xl font-bold leading-tight min-h-[3rem] flex items-center">
          {currentTopic}
        </h2>
      </div>

      {/* 2. 速報通知エリア */}
      {notification && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black px-6 py-2 rounded-full shadow-lg font-bold animate-bounce z-50 whitespace-nowrap">
          {notification}
        </div>
      )}

      {/* 3. ミッションリスト */}
      <div className="p-4">
        <p className="text-gray-500 font-bold text-sm mb-4 ml-2">YOUR MISSIONS</p>
        <div className="space-y-4">
          {missions.map((mission) => (
            <div 
              key={mission.id} 
              className={`p-5 rounded-xl border-l-8 shadow-md transition-all ${
                mission.status === 'completed' 
                  ? 'bg-gray-800 border-gray-600' 
                  : 'bg-white border-yellow-500'
              }`}
            >
              <p className={`font-bold text-lg mb-3 ${mission.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                {mission.mission_content}
              </p>
              
              {mission.status !== 'completed' ? (
                <button 
                  className="w-full bg-blue-600 active:bg-blue-700 text-white font-bold py-3 rounded-lg shadow active:scale-95 transition-transform"
                  onClick={() => completeMission(mission.id)}
                >
                  任務完了
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold">
                  <span>✓</span> <span>COMPLETED</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
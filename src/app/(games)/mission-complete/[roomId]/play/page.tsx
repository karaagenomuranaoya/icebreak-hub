'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import confetti from 'canvas-confetti' 

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

  // --- アクション関数定義 ---

  // お題チェンジ（ホストのみ）
  // ★ここを修正しました：RPCの結果を受け取って即座に画面反映させる
  const handleChangeTopic = async () => {
    setShowAdminMenu(false)
    
    // RPCを呼び出し、戻り値(data)として新しいお題を受け取る
    const { data, error } = await supabase.rpc('change_topic', { p_room_id: roomId })
    
    if (error) {
      console.error(error)
      alert('お題の変更に失敗しました: ' + error.message)
    } else if (data) {
      // 即座にステートを更新（通信待ちラグを解消）
      setCurrentTopic(data)
    }
  }

   // ミッション達成（わんこそば形式）
  const completeMission = async (missionId: string) => {
    // 1. まず手元の画面で、押したやつを「完了」にする（見た目の即時反応）
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, status: 'completed' } : m))
    
    // 2. サーバーの必殺技を呼び出す
    const { data: newMission, error } = await supabase.rpc('complete_and_refill', { 
      p_mission_id: missionId 
    })

    if (error) {
      console.error(error)
      alert('通信エラーが発生しました')
    } else if (newMission) {
      // 3. サーバーから返ってきた「新しいミッション」をリストに追加する！
      //    (少しアニメーション的な「間」があると気持ちいいので300ms待つ)
      setTimeout(() => {
         setMissions(prev => [
           // 新しい順（上）に来るように追加するか、リストの下に追加するか
           // ここでは「完了したのはそのまま、一番下に新しいのが来る」ようにします
           ...prev, 
           newMission as Mission
         ])
         
         // ついでに「指令受信！」みたいな通知を自分だけに出すと盛り上がる
         showNotification('📡 新しい指令を受信しました')
      }, 500)
    }
  }


  // 通知表示ヘルパー
  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  // --- 初期化と監視 ---

  useEffect(() => {
    const storedId = localStorage.getItem('mc_player_id')
    if (!storedId) return 
    setPlayerId(storedId)

    // 1. 初期データ取得
    const initData = async () => {
      // A. プレイヤー情報（ホスト権限チェック）
      const { data: player } = await supabase
        .from('players')
        .select('is_host')
        .eq('id', storedId)
        .single()
      
      const isUserHost = player?.is_host || false
      if (player) setIsHost(isUserHost)

      // B. 自分のミッション取得
      const { data: myMissions } = await supabase
        .from('mc_player_missions')
        .select('*')
        .eq('player_id', storedId)
      if (myMissions) setMissions(myMissions)

      // C. 現在のお題を取得
      const { data: room } = await supabase
        .from('rooms')
        .select('current_topic')
        .eq('id', roomId)
        .single()
      
      if (room && room.current_topic) {
        setCurrentTopic(room.current_topic)
      } else if (isUserHost) {
        // お題が空っぽで、かつ自分がホストなら、最初のお題を抽選する
        handleChangeTopic()
      }

      setLoading(false)
    }

    initData()

    // 2. リアルタイム監視
    // A. お題の変更を監視 (他人が変えた場合用)
    const roomChannel = supabase.channel('play-room-topic')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.new.current_topic) setCurrentTopic(payload.new.current_topic)
        // ★ここを追加：ステータスが finished になったらリザルトへ
        if (payload.new.status === 'finished') {
          router.push(`/mission-complete/${roomId}/result`)
        }
        }
      ).subscribe()
    
    // B. 他人のミッション達成を監視（速報用）
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])
   // ホスト用：ゲーム終了関数
  const finishGame = async () => {
    if (!confirm('本当にゲームを終了して結果発表に移りますか？')) return
    
    const { error } = await supabase.rpc('finish_game', { p_room_id: roomId })
    if (error) {
      alert('終了処理に失敗: ' + error.message)
    }
    // 成功すれば上のリアルタイム検知で勝手に遷移する
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
                <div className="absolute right-0 top-10 bg-white text-black rounded-lg shadow-xl w-48 overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
                  <button 
                    onClick={handleChangeTopic}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b font-bold"
                  >
                    🎲 話題を変える
                  </button>
                  <button 
                    onClick={finishGame} // ★ここを紐付け
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
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black px-6 py-2 rounded-full shadow-lg font-bold animate-bounce z-50 whitespace-nowrap border-2 border-black">
          {notification}
        </div>
      )}

      {/* 3. ミッションリスト */}
      <div className="p-4">
        <p className="text-gray-500 font-bold text-sm mb-4 ml-2">YOUR MISSIONS</p>
        <div className="space-y-4">
          {missions
          // ★並び替え: 未達成(pending)が先、完了(completed)は後ろ
            .sort((a, b) => (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0)).map((mission) => (
            <div 
              key={mission.id} 
              className={`p-5 rounded-xl border-l-8 shadow-md transition-all duration-300 ${
                mission.status === 'completed' 
                  ? 'bg-gray-800 border-gray-600 scale-95' 
                  : 'bg-white border-yellow-500'
              }`}
            >
              <p className={`font-bold text-lg mb-3 ${mission.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                {mission.mission_content}
              </p>
              
              {mission.status !== 'completed' ? (
                <button 
                  className="w-full bg-blue-600 active:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg active:scale-95 transition-transform"
                  onClick={() => completeMission(mission.id)}
                >
                  任務完了
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold animate-pulse">
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
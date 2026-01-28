'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import confetti from 'canvas-confetti'

// 型定義
type Mission = { id: string; mission_content: string; status: string }
type PlayerResult = {
  id: string
  name: string
  score: number
  missions: Mission[]
}

export default function ResultPage() {
  const { roomId } = useParams()
  const router = useRouter()
  const [results, setResults] = useState<PlayerResult[]>([])
  const [loading, setLoading] = useState(true)
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null) // 詳細を開いているプレイヤー

  useEffect(() => {
    const fetchResult = async () => {
      // 1. プレイヤーとスコアを取得（スコア高い順）
      const { data: players } = await supabase
        .from('players')
        .select('id, name, score')
        .eq('room_id', roomId)
        .order('score', { ascending: false })

      if (!players) return

      // 2. 全員のミッション履歴を取得してマージする
      // (N+1問題になるけど人数少ないから一旦ループで回す)
      const fullResults = await Promise.all(
        players.map(async (p) => {
          const { data: missions } = await supabase
            .from('mc_player_missions')
            .select('id, mission_content, status')
            .eq('player_id', p.id)
            .eq('status', 'completed') // 完了したものだけ取得

          return {
            ...p,
            missions: missions || []
          } as PlayerResult
        })
      )

      setResults(fullResults)
      setLoading(false)

      // 3. 演出：紙吹雪ドーン！
      runConfetti()
    }

    fetchResult()
  }, [roomId])

  // 紙吹雪エフェクト
  const runConfetti = () => {
    const duration = 3000
    const end = Date.now() + duration

    ;(function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#FFA500'] // 金・オレンジ
      })
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFD700', '#FFA500']
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    })()
  }

  // アコーディオン開閉
  const toggleDetails = (playerId: string) => {
    setOpenPlayerId(openPlayerId === playerId ? null : playerId)
  }

  // 新しいゲームへ（トップに戻る）
  const goHome = () => {
    router.push('/mission-complete')
  }

  if (loading) return <div className="text-center text-white mt-20">集計中...</div>

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 pb-20">
      <h1 className="text-4xl font-bold text-center text-yellow-400 mb-2 tracking-widest">
        RESULT
      </h1>
      <p className="text-center text-gray-400 mb-8">結果発表</p>

      {/* ランキングリスト */}
      <div className="max-w-2xl mx-auto space-y-4">
        {results.map((player, index) => {
          const rank = index + 1
          const isTop = rank === 1
          
          return (
            <div 
              key={player.id}
              className={`rounded-xl overflow-hidden transition-all duration-300 ${
                isTop 
                  ? 'bg-gradient-to-r from-yellow-600 to-yellow-800 border-2 border-yellow-400 shadow-[0_0_20px_rgba(255,215,0,0.5)] transform scale-105'
                  : 'bg-gray-800 border border-gray-700'
              }`}
            >
              {/* プレイヤー行（クリックで詳細） */}
              <div 
                onClick={() => toggleDetails(player.id)}
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5"
              >
                {/* 順位バッジ */}
                <div className={`
                  w-12 h-12 flex items-center justify-center rounded-full font-bold text-xl shadow-lg
                  ${rank === 1 ? 'bg-yellow-400 text-black' : 
                    rank === 2 ? 'bg-gray-300 text-gray-800' :
                    rank === 3 ? 'bg-yellow-700 text-white' : 'bg-gray-700 text-gray-400'}
                `}>
                  {rank}
                </div>

                {/* 名前 */}
                <div className="flex-1">
                  <div className="font-bold text-lg flex items-center gap-2">
                    {player.name}
                    {isTop && <span className="text-2xl">👑</span>}
                  </div>
                  <div className="text-xs text-gray-300">
                    タップして履歴を見る ▼
                  </div>
                </div>

                {/* スコア */}
                <div className="text-right">
                  <span className="text-3xl font-bold">{player.score}</span>
                  <span className="text-xs ml-1">pt</span>
                </div>
              </div>

              {/* 詳細（アコーディオン中身） */}
              {openPlayerId === player.id && (
                <div className="bg-black/30 p-4 border-t border-white/10 animate-in slide-in-from-top-2">
                  <h4 className="text-xs text-gray-400 mb-2 font-bold">達成した極秘任務リスト:</h4>
                  {player.missions.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">任務達成なし... スパイ失格！</p>
                  ) : (
                    <ul className="space-y-2">
                      {player.missions.map((m) => (
                        <li key={m.id} className="text-sm flex items-start gap-2 text-gray-200">
                          <span className="text-yellow-500 mt-0.5">✓</span>
                          {m.mission_content}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ホームへ戻るボタン */}
      <div className="mt-12 text-center">
        <button
          onClick={goHome}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-full transition"
        >
          トップへ戻る
        </button>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import QRCode from 'react-qr-code'

// 参加者の型
type Player = { id: string; name: string; is_host: boolean }

export default function GuestJoinPage() {
  const { roomId } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // URLに ?role=host がついていれば、その人はホスト（幹事）
  const isHostUrl = searchParams.get('role') === 'host'

  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(false)
  // ★ loadingとは別に、ゲーム開始処理専用のフラグを作る
  const [starting, setStarting] = useState(false)
  const [isHost, setIsHost] = useState(false) // DB登録後の確定フラグ
  
  // ロビー用ステート
  const [players, setPlayers] = useState<Player[]>([])
  const [showQr, setShowQr] = useState(false) // QRコード表示モーダル用

  // -------------------------
  // 1. 参加処理
  // -------------------------
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    // プレイヤー登録
    const { data, error } = await supabase
      .from('players')
      .insert([
        {
          room_id: roomId,
          name: name,
          is_host: isHostUrl, // URLパラメータを信じて権限付与
          score: 0
        }
      ])
      .select()
      .single()

    if (error) {
      alert('参加エラー')
      setLoading(false)
    } else {
      if (data) {
        localStorage.setItem('mc_player_id', data.id)
        setIsHost(data.is_host) // 自分がホストか確定させる
      }
      setJoined(true)
    }
  }

  // -------------------------
  // 2. 参加後の監視処理 (ロビー機能)
  // -------------------------
  useEffect(() => {
    if (!joined) return

    // A. 既存の参加者を取得
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('players')
        .select('id, name, is_host')
        .eq('room_id', roomId)
      if (data) setPlayers(data)
    }
    fetchPlayers()

    // B. 参加者の増減をリアルタイム監視
    const playerChannel = supabase
      .channel('lobby-players')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        (payload) => setPlayers(prev => [...prev, payload.new as Player])
      )
      .subscribe()

    // C. ゲーム開始の監視
    const roomChannel = supabase
      .channel('lobby-room')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.new.status === 'playing') {
            router.push(`/mission-complete/${roomId}/play`)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(playerChannel)
      supabase.removeChannel(roomChannel)
    }
  }, [joined, roomId, router])

  // -------------------------
  // 3. ホスト用アクション
  // -------------------------
  const startGame = async () => {
    if (!confirm('全員揃いましたか？ゲームを開始します！')) return
    setStarting(true) // ★ボタンを無効化
    const { error } = await supabase.rpc('start_mission_game', { p_room_id: roomId })
    
    if (error) {
      console.error(error)
      alert('開始エラー: ' + error.message)
      setStarting(false) // エラーならボタンを復活
    }
  }

  // 招待用URL
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/mission-complete/${roomId}` : ''

  // ==========================================
  // 描画エリア
  // ==========================================

  // --- A. 参加前の名前入力画面 ---
  if (!joined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-6">
        <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow-lg">
          <h1 className="text-xl font-bold text-gray-800 mb-2 text-center">
            {isHostUrl ? '部屋を作成しました！' : 'ゲームに参加'}
          </h1>
          <p className="text-sm text-gray-500 mb-6 text-center">
            {isHostUrl ? 'まずは幹事（あなた）の名前を入れてください' : 'ニックネームを入力してください'}
          </p>
          
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="あなたの名前"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-black"
              maxLength={10}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition"
            >
              {loading ? '処理中...' : isHostUrl ? '待機ルームへ入る' : '参加する'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // --- B. 参加後の待機ロビー ---
  return (
    <div className="flex min-h-screen flex-col bg-gray-900 text-white p-4">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">待機ルーム</h2>
        <span className="bg-gray-800 px-3 py-1 rounded text-sm text-gray-300">
          参加者: {players.length}人
        </span>
      </div>

      {/* ホスト専用: 招待ボタン */}
      {isHost && (
        <div className="mb-6">
          <button
            onClick={() => setShowQr(true)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg"
          >
            <span className="text-2xl">📱</span>
            みんなを招待する (QR表示)
          </button>
        </div>
      )}

      {/* 参加者リスト */}
      <div className="flex-1 bg-gray-800 rounded-xl p-4 overflow-y-auto mb-20">
        <h3 className="text-sm text-gray-400 mb-4">参加メンバー</h3>
        <ul className="space-y-3">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-3 bg-gray-700 p-3 rounded-lg">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-black ${p.is_host ? 'bg-yellow-500' : 'bg-gray-400'}`}>
                {p.name.slice(0, 1)}
              </div>
              <span>{p.name}</span>
              {p.is_host && <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded ml-auto">幹事</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* ホスト専用: スタートボタン（固定フッター） */}
      {isHost ? (
        <div className="fixed bottom-0 left-0 w-full p-4 bg-gray-900 border-t border-gray-800">
          <button
            onClick={startGame}
            disabled={players.length < 2 || starting} 
            className={`w-full font-bold py-4 rounded-full text-xl shadow-lg transition ${
              players.length < 2
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-yellow-500 hover:bg-yellow-400 text-black animate-pulse'
            }`}
          >
            {/* ★テキストを出し分け */}
            {starting ? '準備中...' : 'ゲームスタート！'}
          </button>
          {players.length < 2 && <p className="text-center text-xs text-gray-500 mt-2">※最低2人必要です</p>}
        </div>
      ) : (
        /* ゲスト用メッセージ */
        <div className="fixed bottom-0 left-0 w-full p-6 bg-gray-900 border-t border-gray-800 text-center">
          <p className="text-yellow-400 font-bold animate-pulse">ホストが開始するのを待っています...</p>
        </div>
      )}

      {/* QRコードモーダル */}
      {showQr && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl mb-8">
            <QRCode value={joinUrl} size={240} />
          </div>
          <p className="text-white text-lg font-bold mb-8 text-center">
            スマホで読み取って<br/>参加してね
          </p>
          <button
            onClick={() => setShowQr(false)}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-10 rounded-full"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  )
}
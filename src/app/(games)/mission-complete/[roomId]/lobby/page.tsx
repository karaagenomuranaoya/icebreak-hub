'use client'

import { useParams, useRouter } from 'next/navigation' // useRouterを追加
import QRCode from 'react-qr-code'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// プレイヤー情報の型定義
type Player = {
  id: string
  name: string
}

export default function LobbyPage() {
  const { roomId } = useParams()
  const router = useRouter() // 画面遷移用
  const [roomCode, setRoomCode] = useState<string>('')
  const [joinUrl, setJoinUrl] = useState('')
  const [players, setPlayers] = useState<Player[]>([]) // 参加者リスト

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 本番環境のURLに対応するため window.location.origin を使用
      setJoinUrl(`${window.location.origin}/mission-complete/${roomId}`)
    }

    // 1. 部屋情報の取得
    const fetchRoom = async () => {
      const { data } = await supabase
        .from('rooms')
        .select('code')
        .eq('id', roomId)
        .single()
      if (data) setRoomCode(data.code)
    }

    // 2. 既存の参加者を取得
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('players')
        .select('id, name')
        .eq('room_id', roomId)
      
      if (data) setPlayers(data)
    }

    fetchRoom()
    fetchPlayers()

    // 3. リアルタイム購読を開始（ここが魔法！）
    const channel = supabase
      .channel('room-players')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',           // 新しい行が追加されたら
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}` // この部屋のIDと一致する場合のみ
        },
        (payload) => {
          // 新しい参加者をリストに追加
          const newPlayer = payload.new as Player
          setPlayers((current) => [...current, newPlayer])
        }
      )
      .subscribe()
    // ★ 部屋のステータス監視（ゲーム開始を検知）
    const roomChannel = supabase
      .channel('room-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          // ステータスが 'playing' になったらプレイ画面へGO
          if (payload.new.status === 'playing') {
            router.push(`/mission-complete/${roomId}/play`)
          }
        }
      )
      .subscribe()

    

    // クリーンアップ（画面を離れる時に購読解除）
    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(roomChannel) // クリーンアップ追加
    }
  }, [roomId])

  // ゲーム開始ボタンの処理
  const startGame = async () => {
    // 1. さっき作ったRPC（必殺技）を呼び出す
    const { error } = await supabase.rpc('start_mission_game', { 
      p_room_id: roomId 
    })

    if (error) {
      console.error(error)
      alert('ゲーム開始に失敗しました')
      return
    }
    
    // ここで router.push しなくてOK！
    // 理由は下の「リアルタイム検知」で自動遷移させるからです。
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="bg-white p-4 rounded-xl mb-6 shadow-[0_0_20px_rgba(255,255,0,0.3)]">
        {joinUrl && <QRCode value={joinUrl} size={200} />}
      </div>

      <h2 className="text-4xl font-bold mb-2 tracking-widest">{roomCode}</h2>
      <p className="text-gray-400 mb-8 animate-pulse">参加者を待っています...</p>

      <div className="w-full max-w-md bg-gray-800 rounded-lg p-6 min-h-[250px]">
        <h3 className="text-lg font-bold border-b border-gray-700 pb-2 mb-4 flex justify-between">
          参加者リスト 
          <span className="text-yellow-400">{players.length}人</span>
        </h3>
        
        {players.length === 0 ? (
          <p className="text-gray-500 italic text-center mt-10">QRコードを読み込んで参加してください</p>
        ) : (
          <ul className="space-y-3">
            {players.map((player) => (
              <li key={player.id} className="flex items-center gap-3 bg-gray-700 p-3 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold">
                  {player.name.slice(0, 1)}
                </div>
                <span className="font-bold text-lg">{player.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={startGame}
        disabled={players.length === 0}
        className={`mt-8 font-bold py-4 px-10 rounded-full text-xl transition shadow-lg ${
          players.length > 0
            ? 'bg-yellow-500 hover:bg-yellow-400 text-black cursor-pointer shadow-yellow-500/50'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        ゲームスタート！
      </button>
    </div>
  )
}
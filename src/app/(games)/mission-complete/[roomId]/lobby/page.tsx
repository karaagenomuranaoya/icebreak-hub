'use client'

import { useParams } from 'next/navigation'
import QRCode from 'react-qr-code'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function LobbyPage() {
  // URLから roomId を取得
  const { roomId } = useParams()
  const [roomCode, setRoomCode] = useState<string>('')
  
  // 参加用URL (今のURLから /lobby を取ったものに参加用のパスをつける想定)
  // ※ローカル開発中は localhost:3000 になりますが、スマホで見るにはPCのIPアドレスが必要です。
  // いったんPC画面確認用として window.location.origin を使います。
  const [joinUrl, setJoinUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 実際の参加URL: domain/mission-complete/{roomId}
      // Guestはここから入る形にします
      setJoinUrl(`${window.location.origin}/mission-complete/${roomId}`)
    }

    // 部屋情報を取得して、4桁コードを表示したい
    const fetchRoom = async () => {
      const { data } = await supabase
        .from('rooms')
        .select('code')
        .eq('id', roomId)
        .single()
      
      if (data) setRoomCode(data.code)
    }
    
    fetchRoom()
  }, [roomId])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="bg-white p-4 rounded-xl mb-6">
        {/* QRコード表示 */}
        {joinUrl && <QRCode value={joinUrl} size={200} />}
      </div>

      <h2 className="text-2xl font-bold mb-2">部屋コード: {roomCode}</h2>
      <p className="text-gray-400 mb-8">参加者を待っています...</p>

      <div className="w-full max-w-md bg-gray-800 rounded-lg p-4 min-h-[200px]">
        <h3 className="text-lg font-bold border-b border-gray-700 pb-2 mb-2">
          参加者リスト (0人)
        </h3>
        <ul className="space-y-2">
          <li className="text-gray-500 italic">まだ誰もいません</li>
          {/* ここに後でリアルタイムに参加者を表示します */}
        </ul>
      </div>

      <button className="mt-8 bg-gray-700 text-gray-400 font-bold py-3 px-8 rounded-full cursor-not-allowed">
        ゲーム開始 (人数不足)
      </button>
    </div>
  )
}
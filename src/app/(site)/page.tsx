'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function Home() {
  const [status, setStatus] = useState('接続テスト中...')

  useEffect(() => {
    const checkConnection = async () => {
      // roomsテーブルからデータを取ってみる（空でもエラーが出なければOK）
      const { data, error } = await supabase.from('rooms').select('*').limit(1)
      
      if (error) {
        console.error(error)
        setStatus('❌ 接続失敗: ' + error.message)
      } else {
        setStatus('✅ Supabase接続成功！ ハブサイトの準備完了です。')
      }
    }
    checkConnection()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">アイスブレイク.com</h1>
      <p className="text-xl">{status}</p>
    </div>
  )
}
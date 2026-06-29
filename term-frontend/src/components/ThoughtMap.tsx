import React, { useState, useEffect } from 'react'
import { Spin, Tooltip } from 'antd'
import { getHuaiheFigures } from '../api/termApi'
import type { HuaiheFigure } from '../types/term'

interface DropItem extends HuaiheFigure {
  left: string
  duration: string
  delay: string
}

/** 为人物生成随机动画参数（仅调用一次） */
function buildDrops(figures: HuaiheFigure[]): DropItem[] {
  return figures.map((person) => ({
    ...person,
    left: `${Math.random() * 80 + 10}%`,
    duration: `${Math.random() * 12 + 8}s`,
    delay: `${Math.random() * 10}s`,
  }))
}

const ThoughtMap: React.FC = () => {
  const [drops, setDrops] = useState<DropItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHuaiheFigures()
      .then((res) => {
        if (res.code === 200 && res.data) {
          setDrops(buildDrops(res.data))
        }
      })
      .catch((err) => {
        console.error('获取名人数据失败', err)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div
        style={{
          width: '280px',
          height: '650px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,245,0.3)',
          backdropFilter: 'blur(8px)',
          borderRadius: '32px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
          border: '1px solid rgba(255,255,255,0.5)',
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div
      style={{
        width: '280px',
        height: '1250px',
        position: 'relative',
        background: 'rgba(255,255,245,0.3)',
        backdropFilter: 'blur(8px)',
        borderRadius: '32px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.5)',
      }}
    >
      <style>{`
        @keyframes fall {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(1250px); opacity: 0; }
        }
      `}</style>
      {drops.map((drop, idx) => {
        const animationStyle = `fall ${drop.duration} linear ${drop.delay} infinite`
        return (
          <Tooltip
            key={idx}
            title={drop.分类 || '其他'}
            placement="top"
            mouseEnterDelay={0.1}
            overlayStyle={{
              backgroundColor: 'rgba(8, 8, 8, 0.97)',
              color: '#F5F5F0',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-50px',
                left: drop.left,
                animation: animationStyle,
                cursor: 'pointer',
                background: 'rgba(108,156,120,0.7)',
                borderRadius: '50%',
                width: '56px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: '#fff',
                fontWeight: 500,
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.6)',
                transition: 'transform 0.2s, background 0.2s',
                backdropFilter: 'blur(2px)',
              }}
              onClick={() => window.open(drop.百度链接, '_blank')}
              onMouseEnter={(e) => {
                e.currentTarget.style.animationPlayState = 'paused'
                e.currentTarget.style.transform = 'scale(1.1)'
                e.currentTarget.style.background =
                  'rgba(108,156,120,0.9)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.animationPlayState = 'running'
                e.currentTarget.style.transform = ''
                e.currentTarget.style.background =
                  'rgba(108,156,120,0.7)'
              }}
            >
              {drop.人物}
            </div>
          </Tooltip>
        )
      })}
    </div>
  )
}

export default ThoughtMap

import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* 메모장 본체 */}
        <div
          style={{
            width: 22,
            height: 26,
            background: '#fffde7',
            border: '2px solid #bdbdbd',
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: 7,
            gap: 3,
            position: 'relative',
          }}
        >
          {/* 줄 3개 */}
          <div style={{ width: 14, height: 2, background: '#9e9e9e', borderRadius: 1 }} />
          <div style={{ width: 14, height: 2, background: '#9e9e9e', borderRadius: 1 }} />
          <div style={{ width: 10, height: 2, background: '#9e9e9e', borderRadius: 1 }} />
          {/* 상단 클립 */}
          <div
            style={{
              position: 'absolute',
              top: -4,
              width: 8,
              height: 4,
              background: '#78909c',
              borderRadius: '2px 2px 0 0',
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  )
}

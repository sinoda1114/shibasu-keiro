const blue = '#228be6'
const white = '#ffffff'
const yellow = '#ffd43b'

export function ShibasuIconArtwork() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: blue,
        borderRadius: '22%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '21%',
          top: '19%',
          width: '58%',
          height: '58%',
          borderRadius: '15%',
          background: white,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '30%',
          top: '29%',
          width: '40%',
          height: '18%',
          borderRadius: 10,
          background: blue,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '31%',
          top: '64%',
          width: '9%',
          height: '9%',
          borderRadius: 999,
          background: blue,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: '31%',
          top: '64%',
          width: '9%',
          height: '9%',
          borderRadius: 999,
          background: blue,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '41%',
          top: '64%',
          width: '18%',
          height: '8%',
          borderRadius: 999,
          background: yellow,
        }}
      />
    </div>
  )
}

import { useEffect, useRef } from 'react'
import MindMap from '../../x-mind-map/src'

function App() {
  const mindContainerRef = useRef<HTMLDivElement>(null)
  const mindMap = useRef<MindMap | null>(null)

  useEffect(() => {
    if (!mindContainerRef.current) return
    mindMap.current = new MindMap({
      el: mindContainerRef.current,
      data: {
        data: {
          text: '根节点',
        },
        children: [],
      },
    })
  }, [])
  useEffect(() => {
    if (!mindMap.current) return
    mindMap.current.event.on('node_contextmenu', (a, b, c) => {
      console.log(a, b, c)
    })
  }, [mindMap])

  return (
    <>
      <div ref={mindContainerRef} style={{ width: '1000px', height: '800px' }}></div>
    </>
  )
}

export default App

import React, {
  useEffect,
  useState,
  useContext,
  useRef,
  useCallback
} from 'react'

import { ExampleComponent } from 'react-drag-and-drop'
import 'react-drag-and-drop/dist/index.css'
import styled from 'styled-components'
import Draggable from 'react-draggable'

const AppContainer = styled.div`
  display: flex;
  background: lightblue;
  gap: 20px;
`

const StyledColumn = styled.div`
  background: gray;
  width: 300px;
  height: 500px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
`

const Item = styled.div`
  width: 200px;
  height: 100px;
  background: red;
`

const DragItem = ({ children, id, containerId }) => {
  const dragContext = useContext(DragContext)
  const [isDragging, setIsDragging] = useState()
  return (
    <div
      onMouseDown={(e) => {
        dragContext.dragStart(containerId, id, e)
        setIsDragging(true)
      }}
      onMouseUp={() => {
        dragContext.dragStop(containerId, id)
        setIsDragging(false)
      }}
      position={null}
      scale={1}
    >
      <div style={{ position: isDragging ? 'block' : 'block' }}>{children}</div>
    </div>
  )
}

const DragClone = ({ position, children }) => {
  return <div style={{ position: 'absolute' }}>{children}</div>
}

const DragContainer = ({ startPosition }) => {
  const [position, setPosition] = useState(startPosition)
  useEffect(() => {
    document.addEventListener('mousemove', (e) => {
      setPosition({ x: e.clientX, y: e.clientY })
    })
  }, [])
  return (
    <div
      style={{
        background: 'red',
        borderRadius: 100,
        position: 'absolute',
        left: position.x + 'px',
        top: position.y + 'px'
      }}
    >
      alma
    </div>
  )
}

const usePrevious = (value) => {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}

const DragContext = React.createContext({})
const DragProvider = ({ children, dragIds, setDragIds }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragItems, setDragItems] = useState()
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 })
  const [lastContainer, setLastContainer] = useState(0)
  const previousLastContainer = usePrevious(lastContainer)
  useEffect(() => {
    if (isDragging && dragItems && previousLastContainer != lastContainer) {
      setDragItems((oldItems) => {
        console.log(
          `manipulate container currentContainer: ${lastContainer} previousContainer: ${previousLastContainer} items: ${JSON.stringify(
            dragItems
          )}`
        )
        const copyItems = { ...oldItems }
        copyItems[previousLastContainer].pop()
        if (!copyItems[lastContainer]) copyItems[lastContainer] = []
        copyItems[lastContainer].push({ id: Math.random(), isDragged: true })
        return copyItems
      })
    }
  }, [lastContainer])
  useEffect(() => {
    document.addEventListener('mouseup', (e) => {
      setIsDragging(false)
    })
  })
  useEffect(() => {
    const dragItems = {}
    Object.entries(dragIds).forEach(
      ([containerId, itemIds]) =>
        (dragItems[containerId] = itemIds.map((id) => ({ id })))
    )
    console.log('re evaluate ids-s', dragItems)
    setDragItems(dragItems)
  }, [dragIds])

  const mouseOverContainerCallback = useCallback(
    (id) => {
      setLastContainer(id)
    },
    [lastContainer]
  )

  const dragContext = {
    setContainerRef: (id, ref) => {},
    mouseOverContainer: mouseOverContainerCallback,
    items: dragItems,
    dragStart: (containerId, itemId, e) => {
      setIsDragging(true)
      setStartPosition({ x: e.clientX, y: e.clientY })
    },
    dragStop: (containerId, itemId) => {
      setIsDragging(false)
    }
  }

  console.log('rerender :/', dragItems)
  return (
    <DragContext.Provider value={dragContext}>
      {isDragging && (
        <DragContainer startPosition={startPosition}></DragContainer>
      )}
      <div style={{ userSelect: 'none' }}>{children}</div>
    </DragContext.Provider>
  )
}

function useDragContainer(id) {
  const dragContext = useContext(DragContext)
  const containerRef = useRef()
  useEffect(() => {
    containerRef.current.addEventListener('mouseenter', () => {
      dragContext.mouseOverContainer(id)
    })
  }, [containerRef])
  dragContext.setContainerRef(id, containerRef)
  let dragItems = dragContext.items?.[id] ?? []

  return [dragItems, containerRef]
}

const Column = ({ id }) => {
  const containerId = id
  const [items, containerRef] = useDragContainer(id)
  return (
    <StyledColumn ref={containerRef}>
      {items &&
        items.map(({ id, isDragged }) => (
          <DragItem id={id} key={id} containerId={containerId}>
            <Item style={{ opacity: isDragged ? 0.5 : 1 }}>{id}</Item>
          </DragItem>
        ))}
    </StyledColumn>
  )
}

const App = () => {
  const [dragItemIds, setDragItemIds] = useState({
    0: [1, 2, 3],
    1: [4],
    2: [5, 6, 7]
  })
  return (
    <DragProvider dragIds={dragItemIds} setDragItemIds={setDragItemIds}>
      <AppContainer>
        <Column id={0}></Column>
        <Column id={1}></Column>
        <Column id={2}></Column>
        <Column id={3}></Column>
      </AppContainer>
    </DragProvider>
  )
}

export default App

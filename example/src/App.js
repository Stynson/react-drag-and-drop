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
  const ref = useRef()
  return (
    <div
      onMouseDown={(e) => {
        dragContext.dragStart(containerId, id, e, children, ref)
        setIsDragging(true)
      }}
      onMouseUp={() => {
        dragContext.dragStop(containerId, id)
        setIsDragging(false)
      }}
      position={null}
      scale={1}
    >
      <div
        ref={ref}
        style={{
          position: isDragging ? 'block' : 'block',
          pointerEvents: 'none !important'
        }}
      >
        {children}
      </div>
    </div>
  )
}

const DragContainer = ({
  startPosition,
  dragChildren,
  offset,
  containerRefs,
  mouseOverContainer
}) => {
  const [position, setPosition] = useState(startPosition)
  useEffect(() => {
    const onMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY })
      Object.entries(containerRefs).some(([id, ref]) => {
        const rect = ref.current.getBoundingClientRect()
        if (rect.left < e.clientX && rect.right > e.clientX) {
          mouseOverContainer(id)
          return true
        }
      })
    }
    document.addEventListener('mousemove', onMouseMove)
    return () => document.removeEventListener('mousemove', onMouseMove)
  }, [containerRefs])
  return (
    <div
      style={{
        background: 'red',
        borderRadius: 100,
        position: 'absolute',
        left: position.x - offset.x + 'px',
        top: position.y - offset.y + 'px'
      }}
    >
      {dragChildren}
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
  const [draggedItemId, setDraggedItemId] = useState()
  const [dragChildren, setDragChildren] = useState()
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 })
  const [lastContainer, setLastContainer] = useState(0)
  const [mirrorOffset, setMirrorOffset] = useState({ x: 0, y: 0 }) //TODO recalculate offset after scroll...
  const [containerRefs, setContainerRefs] = useState({})
  const previousLastContainer = usePrevious(lastContainer)
  useEffect(() => {
    if (isDragging && dragItems && previousLastContainer != lastContainer) {
      setDragItems((oldItems) => {
        const copyItems = { ...oldItems }
        copyItems[previousLastContainer].pop()
        if (!copyItems[lastContainer]) copyItems[lastContainer] = []
        copyItems[lastContainer].push({ id: draggedItemId, isDragged: true })
        return copyItems
      })
    }
  }, [lastContainer])

  const dragEndHandler = useCallback(() => {
    setIsDragging(false)
    setDragItems((oldItems) => {
      let copyItems = { ...oldItems }
      copyItems[lastContainer] = copyItems[lastContainer].map(({ id }) => ({
        id,
        isDragged: false
      }))

      return copyItems
    })
  }, [lastContainer])

  useEffect(() => {
    document.addEventListener('mouseup', dragEndHandler)
    return () => document.removeEventListener('mouseup', dragEndHandler)
  }, [lastContainer])

  useEffect(() => {
    const dragItems = {}
    Object.entries(dragIds).forEach(
      ([containerId, itemIds]) =>
        (dragItems[containerId] = itemIds.map((id) => ({ id })))
    )
    setDragItems(dragItems)
  }, [dragIds])

  const mouseOverContainerCallback = useCallback(
    (id) => {
      setLastContainer(id)
    },
    [lastContainer]
  )

  const dragContext = {
    setContainerRef: (id, ref) => {
      console.log('setcontainersref', id, ref, containerRefs)
      setContainerRefs((containers) => {
        const copyContainers = { ...containers }
        copyContainers[id] = ref
        console.log('wtf mate', copyContainers)
        return copyContainers
      })
    },
    items: dragItems,
    dragStart: (containerId, itemId, e, children, ref) => {
      setIsDragging(true)
      setStartPosition({ x: e.clientX, y: e.clientY })
      setDraggedItemId(itemId)
      setDragChildren(children)
      const rect = ref.current.getBoundingClientRect()
      console.log('MESAURE', rect, e.clientX, e.clientY, e.screenX, e.screenY)
      setMirrorOffset({ x: e.clientX - rect.x, y: e.clientY - rect.y })
    },
    dragStop: (containerId, itemId) => {
      setIsDragging(false)
    }
  }

  console.log('rerender :/', dragItems, containerRefs)
  return (
    <DragContext.Provider value={dragContext}>
      {isDragging && (
        <DragContainer
          startPosition={startPosition}
          dragChildren={dragChildren}
          offset={mirrorOffset}
          containerRefs={containerRefs}
          mouseOverContainer={mouseOverContainerCallback}
        ></DragContainer>
      )}
      <div style={{ userSelect: 'none' }}>{children}</div>
    </DragContext.Provider>
  )
}

function useDragContainer(id) {
  const dragContext = useContext(DragContext)
  const containerRef = useRef()
  useEffect(() => {
    dragContext.setContainerRef(id, containerRef)
  }, [containerRef])
  let dragItems = dragContext.items?.[id] ?? []

  return [dragItems, containerRef]
}

//----------------- use ---------------------------------

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

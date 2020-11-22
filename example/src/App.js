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
  mouseOverContainer,
  setDraggedItemIndex
}) => {
  const [position, setPosition] = useState(startPosition)
  useEffect(() => {
    const onMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY })

      let currentContainerId = 0
      Object.entries(containerRefs).some(([id, ref]) => {
        const rect = ref.current.getBoundingClientRect()
        if (rect.left < e.clientX && rect.right > e.clientX) {
          currentContainerId = id
          return true
        }
      })
      const items = Array.from(
        containerRefs[currentContainerId].current.children
      )
      if (items[0] && items[0].getBoundingClientRect().top > e.clientY) {
        setDraggedItemIndex(0)
      }
      if (
        items[items.length - 1] &&
        items[items.length - 1].getBoundingClientRect().bottom < e.clientY
      ) {
        setDraggedItemIndex(items.length - 1)
      } else {
        items.some((item, index) => {
          const rect = item.getBoundingClientRect()
          if (rect.top < e.clientY && rect.bottom > e.clientY) {
            setDraggedItemIndex(index)
            return true
          }
        })
      }
      mouseOverContainer(currentContainerId)
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
        zIndex: 9999,
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
  return [ref.current, (value) => (ref.current = value)]
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
  const [draggedItemIndex, setDraggedItemIndex] = useState()
  const [previousDraggedItemIndex] = usePrevious(draggedItemIndex)
  const [containerRefs, setContainerRefs] = useState({})
  const [previousLastContainer, setPreviousLastContainer] = usePrevious(
    lastContainer
  )
  useEffect(() => {
    if (isDragging && dragItems && previousLastContainer != lastContainer) {
      console.log('HEYO', previousLastContainer, previousDraggedItemIndex)
      //nem updatelodik a draggedItemIndex container cserenel jelenleg!
      setDragItems((oldItems) => {
        const copyItems = { ...oldItems }
        copyItems[previousLastContainer].splice(previousDraggedItemIndex, 1) //pop
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
      setLastContainer(containerId)
      setPreviousLastContainer(containerId)
      setDraggedItemIndex(
        dragItems[containerId].findIndex(({ id }) => id == itemId)
      )
    },
    dragStop: (containerId, itemId) => {
      setIsDragging(false)
    }
  }

  console.log(dragItems)
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
          setDraggedItemIndex={setDraggedItemIndex}
        ></DragContainer>
      )}
      <pre style={{ position: 'fixed', left: 0, top: 0 }}>
        {dragItems &&
          JSON.stringify(
            Object.entries(dragItems).map(([key, value]) =>
              value.map((x) => x.id)
            ),
            null,
            2
          )}
      </pre>
      <div style={{ userSelect: 'none', left: 200, position: 'absolute' }}>
        {children}
      </div>
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

import './App.css'

import React, {
    useEffect,
    useRef,
    useState,
} from 'react'

import { io } from 'socket.io-client'
import {
    BoxGeometry,
    MeshNormalMaterial,
} from 'three'

import {
    Physics,
    useBox,
    usePlane,
    useSphere,
} from '@react-three/cannon'
import {
    PointerLockControls,
    Stats,
    Text,
} from '@react-three/drei'
import { Canvas } from '@react-three/fiber'

const ControlsWrapper = ({ socket }) => {
    const controlsRef = useRef()
    const [updateCallback, setUpdateCallback] = useState(null)

    // Register the update event and clean up
    useEffect(() => {
        const onControlsChange = (val) => {
            const { position, rotation } = val.target.object
            const { id } = socket

            const posArray = []
            const rotArray = []

            position.toArray(posArray)
            rotation.toArray(rotArray)

            socket.emit('move', {
                id,
                rotation: rotArray,
                position: posArray,
            })
        }

        if (controlsRef.current) {
            setUpdateCallback(
                controlsRef.current.addEventListener('change', onControlsChange)
            )
        }

        // Dispose
        return () => {
            if (updateCallback && controlsRef.current)
                controlsRef.current.removeEventListener(
                    'change',
                    onControlsChange
                )
        }
    }, [controlsRef, socket])

    return <PointerLockControls ref={controlsRef} movementSpeed={2} lookSpeed={0.5} />
    // return <FirstPersonControls ref={controlsRef} movementSpeed={2} lookSpeed={0.5} />
}

const UserWrapper = ({ position, rotation, id }) => {
    const [physRef, api] = useBox(() => ({ mass: 1 }))
    return (
        <mesh
            ref={physRef}
            position={position}
            rotation={rotation}
            geometry={new BoxGeometry()}
            material={new MeshNormalMaterial()}
        >
            {/* Optionally show the ID above the user's mesh */}
            <Text
                position={[0, 1.0, 0]}
                color="black"
                anchorX="center"
                anchorY="middle"
            >
                {'User ' + id}
            </Text>
        </mesh>
    )
}

const Floor = () => {
    const [physRef, api] = usePlane(() => ({ mass: 0, rotation: [-Math.PI / 2, 0, 0] }))
    return (
        <mesh
            ref={physRef}
        >
            <planeGeometry args={[20,20]}/>
            <meshNormalMaterial />
        </mesh>
    )
}

const TestBall = () => {
    const [physRef, api] = useSphere(() => ({ mass: 1, position: [0,2,0] }))

    return (
        <mesh
            ref={physRef}
        >
            <sphereGeometry args={[1,32,16]}/>
            <meshNormalMaterial />
        </mesh>
    )
}

function App() {
    const [socketClient, setSocketClient] = useState(null)
    const [clients, setClients] = useState({})

    const usePersonControls = () => {
        const keys = {
          KeyW: 'forward',
          KeyS: 'backward',
          KeyA: 'left',
          KeyD: 'right',
          Space: 'jump',
        }
      
        const moveFieldByKey = (key) => keys[key]
      
        const [movement, setMovement] = useState({
          forward: false,
          backward: false,
          left: false,
          right: false,
          jump: false,
        })
      
        useEffect(() => {
          const handleKeyDown = (e) => {
            setMovement((m) => ({ ...m, [moveFieldByKey(e.code)]: true }))
          }
          const handleKeyUp = (e) => {
            setMovement((m) => ({ ...m, [moveFieldByKey(e.code)]: false }))
          }
          document.addEventListener('keydown', handleKeyDown)
          document.addEventListener('keyup', handleKeyUp)
          return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.removeEventListener('keyup', handleKeyUp)
          }
        }, [])
        return movement
    }

    const { forward, backward, left, right, jump } = usePersonControls()

    useEffect(() => {
        // On mount initialize the socket connection
        setSocketClient(io())

        // Dispose gracefuly
        return () => {
            if (socketClient) socketClient.disconnect()
        }
    }, [])

    useEffect(() => {
        if (socketClient) {
            socketClient.on('move', (clients) => {
                setClients(clients)
            })
        }
    }, [socketClient])

    return (
        socketClient && (
            <Canvas camera={{ position: [0, 1, -5], near: 0.1, far: 1000 }}>
                <Physics>
                    <Stats />
                    <ControlsWrapper socket={socketClient} />
                    <gridHelper rotation={[0, 0, 0]} />
                    <Floor />
                    <TestBall />
                    {/* Filter myself from the client list and create user boxes with IDs */}
                    {Object.keys(clients)
                        .filter((clientKey) => clientKey !== socketClient.id)
                        .map((client) => {
                            const { position, rotation } = clients[client]
                            return (
                                <UserWrapper
                                    key={client}
                                    id={client}
                                    position={position}
                                    rotation={rotation}
                                />
                            )
                        })}
                </Physics>
            </Canvas>
        )
    )
}

export default App

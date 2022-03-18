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

    return <PointerLockControls ref={controlsRef} movementSpeed={2}  lookSpeed={0.5} />
}

const UserWrapper = ({ position, rotation, id }) => {
    return (
        <mesh
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

function App() {
    const [socketClient, setSocketClient] = useState(null)
    const [clients, setClients] = useState({})

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
                <Stats />
                <ControlsWrapper socket={socketClient} />
                <gridHelper rotation={[0, 0, 0]} />

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
            </Canvas>
        )
    )
}

export default App

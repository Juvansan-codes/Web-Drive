// FIX: Implement the full Game component to resolve placeholder content errors.
import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import {
    MAX_SPEED,
    FRICTION,
    TURN_SPEED,
    CAR_WIDTH,
    CAR_LENGTH,
    CAR_BODY_HEIGHT,
    BUILDING_HEIGHT,
    BUILDING_COLORS,
    GRID_SIZE,
    CELL_SIZE,
    WORLD_SIZE,
    ROAD_WIDTH,
    ROAD_COLOR,
    SIDEWALK_COLOR,
    ENGINE_FORCE,
    DRAG_FORCE,
    BRAKE_FORCE,
    DRIFT_CONTROL,
    MAX_DAMAGE,
    DAMAGE_SCALAR,
    NUM_AI_CARS,
    AI_CAR_SPEED,
    AI_AVOIDANCE_DISTANCE
} from '../constants';
import { Controls, Obstacle } from '../types';

interface AICarState {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  angle: number;
  target: THREE.Vector3;
  ref: React.RefObject<THREE.Group>;
  color: string;
}

// Smoke Particle Component
const SmokeParticle = React.memo(({ position }: { position: THREE.Vector3 }) => (
    <mesh position={position}>
        <sphereGeometry args={[Math.random() * 1 + 0.5, 8, 8]} />
        <meshBasicMaterial color={0x555555} transparent opacity={0.3} />
    </mesh>
));


// Car Component with cartoon style and damage effects
const Car = React.forwardRef<THREE.Group, { damage: number }>(({ damage }, ref) => {
    const smokeParticles = useRef<{ id: number; position: THREE.Vector3; velocity: THREE.Vector3; life: number }[]>([]);
    const [smokeRender, setSmokeRender] = useState<number>(0);

    const mainBodyGeom = useMemo(() => new THREE.BoxGeometry(CAR_WIDTH, CAR_BODY_HEIGHT, CAR_LENGTH), []);
    const cabinGeom = useMemo(() => new THREE.BoxGeometry(CAR_WIDTH * 0.9, CAR_BODY_HEIGHT, CAR_LENGTH * 0.5), []);
    const wheelGeom = useMemo(() => new THREE.CylinderGeometry(2, 2, 1.5, 16), []);

    const smokeIntensity = useMemo(() => {
        if (damage < 20) return 0;
        if (damage < 50) return 1;
        if (damage < 80) return 3;
        return 5;
    }, [damage]);

    useFrame(() => {
        // Add new particles based on intensity
        for(let i = 0; i < smokeIntensity; i++) {
             if (Math.random() > 0.5) {
                smokeParticles.current.push({
                    id: Math.random(),
                    position: new THREE.Vector3(
                        (Math.random() - 0.5) * 4,
                        1,
                         -CAR_LENGTH / 2 + (Math.random() - 0.5) // Position smoke at the back
                    ),
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.1,
                        Math.random() * 0.5 + 0.2,
                        (Math.random() - 0.5) * 0.1
                    ),
                    life: 100
                });
            }
        }

        // Update existing particles
        smokeParticles.current.forEach(p => {
            p.position.add(p.velocity);
            p.life -= 2;
        });

        // Filter out dead particles
        smokeParticles.current = smokeParticles.current.filter(p => p.life > 0);

        // Trigger re-render
        if(smokeParticles.current.length > 0) {
            setSmokeRender(r => r + 1);
        }
    });
    
    return (
        <group ref={ref}>
            {/* Main Body */}
            <mesh position={[0, CAR_BODY_HEIGHT * 0.7, 0]} castShadow geometry={mainBodyGeom}>
                <meshToonMaterial color="#4299e1" />
            </mesh>
            <lineSegments position={[0, CAR_BODY_HEIGHT * 0.7, 0]}>
                <edgesGeometry args={[mainBodyGeom]} />
                <lineBasicMaterial color="black" />
            </lineSegments>

            {/* Cabin */}
            <mesh position={[0, CAR_BODY_HEIGHT * 1.5, -CAR_LENGTH * 0.1]} castShadow geometry={cabinGeom}>
                <meshToonMaterial color="#63b3ed" />
            </mesh>
            <lineSegments position={[0, CAR_BODY_HEIGHT * 1.5, -CAR_LENGTH * 0.1]}>
                <edgesGeometry args={[cabinGeom]} />
                <lineBasicMaterial color="black" />
            </lineSegments>

            {/* Windshield */}
             <mesh position={[0, CAR_BODY_HEIGHT * 1.5, CAR_LENGTH * 0.15]} rotation={[-Math.PI / 8, 0, 0]}>
                <planeGeometry args={[CAR_WIDTH * 0.85, CAR_BODY_HEIGHT * 1.1]} />
                <meshToonMaterial color="#a0deff" opacity={0.7} transparent />
            </mesh>
            
            {/* Headlights */}
            <mesh position={[-CAR_WIDTH/3, CAR_BODY_HEIGHT * 0.8, CAR_LENGTH/2]}>
                <boxGeometry args={[2, 1, 0.5]} />
                <meshToonMaterial color="#fef08a" />
            </mesh>
            <mesh position={[CAR_WIDTH/3, CAR_BODY_HEIGHT * 0.8, CAR_LENGTH/2]}>
                <boxGeometry args={[2, 1, 0.5]} />
                <meshToonMaterial color="#fef08a" />
            </mesh>

            {/* Taillights */}
            <mesh position={[-CAR_WIDTH/3, CAR_BODY_HEIGHT * 0.8, -CAR_LENGTH/2]}>
                <boxGeometry args={[1.5, 1, 0.5]} />
                <meshToonMaterial color="red" />
            </mesh>
             <mesh position={[CAR_WIDTH/3, CAR_BODY_HEIGHT * 0.8, -CAR_LENGTH/2]}>
                <boxGeometry args={[1.5, 1, 0.5]} />
                <meshToonMaterial color="red" />
            </mesh>

            {/* Wheels */}
            <group position={[-CAR_WIDTH/2 - 0.75, 2, CAR_LENGTH/2 - 4]} rotation={[0, 0, Math.PI / 2]}>
                <mesh geometry={wheelGeom}><meshToonMaterial color="#222" /></mesh>
            </group>
            <group position={[CAR_WIDTH/2 + 0.75, 2, CAR_LENGTH/2 - 4]} rotation={[0, 0, -Math.PI / 2]}>
                <mesh geometry={wheelGeom}><meshToonMaterial color="#222" /></mesh>
            </group>
            <group position={[-CAR_WIDTH/2 - 0.75, 2, -CAR_LENGTH/2 + 3]} rotation={[0, 0, Math.PI / 2]}>
                <mesh geometry={wheelGeom}><meshToonMaterial color="#222" /></mesh>
            </group>
            <group position={[CAR_WIDTH/2 + 0.75, 2, -CAR_LENGTH/2 + 3]} rotation={[0, 0, -Math.PI / 2]}>
                <mesh geometry={wheelGeom}><meshToonMaterial color="#222" /></mesh>
            </group>

            {/* Render Smoke */}
            {smokeParticles.current.map(p => (
                 <SmokeParticle key={p.id} position={p.position} />
            ))}
        </group>
    );
});

// Cartoon Car for AI
const AI_CAR_COLORS = ['#f56565', '#ed8936', '#ecc94b', '#48bb78', '#38b2ac', '#63b3ed', '#9f7aea', '#ed64a6'];
const CartoonCar = React.forwardRef<THREE.Group, { color: string }>(({ color }, ref) => {
    const bodyGeom = useMemo(() => new THREE.BoxGeometry(CAR_WIDTH * 0.8, CAR_BODY_HEIGHT, CAR_LENGTH * 0.8), []);
    const cabinGeom = useMemo(() => new THREE.BoxGeometry(CAR_WIDTH * 0.7, CAR_BODY_HEIGHT, CAR_LENGTH * 0.4), []);

    return (
        <group ref={ref}>
            <mesh position={[0, CAR_BODY_HEIGHT * 0.7, 0]} castShadow geometry={bodyGeom}>
                <meshToonMaterial color={color} />
            </mesh>
             <lineSegments position={[0, CAR_BODY_HEIGHT * 0.7, 0]}>
                <edgesGeometry args={[bodyGeom]} />
                <lineBasicMaterial color="black" />
            </lineSegments>
            <mesh position={[0, CAR_BODY_HEIGHT * 1.5, 0]} castShadow geometry={cabinGeom}>
                <meshToonMaterial color={new THREE.Color(color).multiplyScalar(1.2)} />
            </mesh>
             <lineSegments position={[0, CAR_BODY_HEIGHT * 1.5, 0]}>
                <edgesGeometry args={[cabinGeom]} />
                <lineBasicMaterial color="black" />
            </lineSegments>
        </group>
    );
});


// Cartoon Building Component with Instanced Windows
const CartoonBuilding = React.memo(({ obstacle, color }: { obstacle: Obstacle; color: number }) => {
    const { x, y: z, width, height: depth } = obstacle;
    const buildingHeight = BUILDING_HEIGHT * (Math.random() * 0.5 + 0.75); // Vary height

    const shape = useMemo(() => Math.random() > 0.4 ? 'box' : 'cylinder', []);
    const geom = useMemo(() => {
        return shape === 'box'
            ? new THREE.BoxGeometry(width, buildingHeight, depth)
            : new THREE.CylinderGeometry(width / 2, width / 2, buildingHeight, 16)
    }, [shape, width, buildingHeight, depth]);

    const windowGeom = useMemo(() => new THREE.PlaneGeometry(8, 8), []);
    const windowMat = useMemo(() => new THREE.MeshToonMaterial({ color: '#334155' }), []);
    const windowMatrices = useMemo(() => {
        const matrices: THREE.Matrix4[] = [];
        const tempObject = new THREE.Object3D();
        const windowSpacing = 15;
        const floors = Math.floor(buildingHeight / windowSpacing);

        for (let i = 0; i < floors; i++) {
            const y = -buildingHeight / 2 + i * windowSpacing + windowSpacing / 2;
            if (shape === 'box') {
                const facePositions = [
                    { p: [0, y, depth / 2 + 0.1], r: [0, 0, 0] },
                    { p: [0, y, -depth / 2 - 0.1], r: [0, Math.PI, 0] },
                    { p: [-width / 2 - 0.1, y, 0], r: [0, -Math.PI / 2, 0] },
                    { p: [width / 2 + 0.1, y, 0], r: [0, Math.PI / 2, 0] },
                ];
                facePositions.forEach(pos => {
                    tempObject.position.set(pos.p[0], pos.p[1], pos.p[2]);
                    tempObject.rotation.set(pos.r[0], pos.r[1], pos.r[2]);
                    tempObject.updateMatrix();
                    matrices.push(tempObject.matrix.clone());
                });
            } else { // Cylinder
                const numWindows = 8;
                const radius = width / 2 + 0.1;
                for (let j = 0; j < numWindows; j++) {
                    const angle = (j / numWindows) * Math.PI * 2;
                    tempObject.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
                    tempObject.rotation.set(0, -angle, 0);
                    tempObject.updateMatrix();
                    matrices.push(tempObject.matrix.clone());
                }
            }
        }
        return matrices;
    }, [shape, buildingHeight, width, depth]);
    
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null!);
    useLayoutEffect(() => {
        if (!instancedMeshRef.current) return;
        windowMatrices.forEach((matrix, i) => {
            instancedMeshRef.current.setMatrixAt(i, matrix);
        });
        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    }, [windowMatrices]);

    return (
        <group position={[x, buildingHeight / 2, z]}>
            <mesh castShadow receiveShadow geometry={geom}>
                <meshToonMaterial color={color} />
            </mesh>
            <lineSegments>
                <edgesGeometry args={[geom]} />
                <lineBasicMaterial color="black" />
            </lineSegments>
            {/* Rooftop */}
            <mesh position={[0, buildingHeight / 2, 0]} castShadow>
                <boxGeometry args={[width + 4, 4, depth + 4]} />
                <meshToonMaterial color={new THREE.Color(color).multiplyScalar(0.7)} />
            </mesh>
             {/* Door */}
            <mesh position={[0, -buildingHeight / 2 + 8, shape === 'box' ? depth / 2 + 0.1 : width / 2 + 0.1]}>
                <planeGeometry args={[10, 16]} />
                <meshToonMaterial color="#333" />
            </mesh>
            {/* Windows */}
            {windowMatrices.length > 0 && (
                <instancedMesh ref={instancedMeshRef} args={[windowGeom, windowMat, windowMatrices.length]} />
            )}
        </group>
    );
});

// Instanced Environment Components
const InstancedStreetLamps = React.memo(({ matrices }: { matrices: THREE.Matrix4[] }) => {
    const count = matrices.length;
    const poleRef = useRef<THREE.InstancedMesh>(null!);
    const armRef = useRef<THREE.InstancedMesh>(null!);
    const lightRef = useRef<THREE.InstancedMesh>(null!);

    useLayoutEffect(() => {
        matrices.forEach((m, i) => {
            poleRef.current?.setMatrixAt(i, m);
            armRef.current?.setMatrixAt(i, m);
            lightRef.current?.setMatrixAt(i, m);
        });
        if(poleRef.current) poleRef.current.instanceMatrix.needsUpdate = true;
        if(armRef.current) armRef.current.instanceMatrix.needsUpdate = true;
        if(lightRef.current) lightRef.current.instanceMatrix.needsUpdate = true;
    }, [matrices]);
    
    return (
        <group>
            <instancedMesh ref={poleRef} args={[undefined, undefined, count]} castShadow={false}>
                 <cylinderGeometry args={[0.5, 0.5, 30, 8]} />
                 <meshToonMaterial color="#555" />
            </instancedMesh>
             <instancedMesh ref={armRef} args={[undefined, undefined, count]} castShadow={false}>
                <cylinderGeometry args={[0.3, 0.3, 5, 8]} />
                <meshToonMaterial color="#555" />
            </instancedMesh>
             <instancedMesh ref={lightRef} args={[undefined, undefined, count]} castShadow={false}>
                <sphereGeometry args={[1, 8, 8]} />
                <meshToonMaterial color="yellow" />
            </instancedMesh>
        </group>
    )
});

const InstancedBenches = React.memo(({ matrices }: { matrices: THREE.Matrix4[] }) => {
    const ref = useRef<THREE.InstancedMesh>(null!);
    useLayoutEffect(() => {
        matrices.forEach((m, i) => ref.current?.setMatrixAt(i, m));
        if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    }, [matrices]);
    
    return (
        <instancedMesh ref={ref} args={[undefined, undefined, matrices.length]} castShadow receiveShadow>
            <boxGeometry args={[12, 5, 3]} />
            <meshToonMaterial color="#8B4513" />
        </instancedMesh>
    );
});

const NPC_COLORS = ['#ff6b6b', '#f06595', '#cc5de8', '#845ef7', '#5c7cfa', '#339af0', '#22b8cf', '#20c997', '#51cf66', '#94d82d', '#fcc419', '#ff922b'];
const InstancedNPCs = React.memo(({ matrices, animationData, isSitting }: { matrices: THREE.Matrix4[], animationData?: { initialY: number, initialX: number }[], isSitting: boolean }) => {
    const bodyRef = useRef<THREE.InstancedMesh>(null!);
    const headRef = useRef<THREE.InstancedMesh>(null!);
    const bodyHeight = isSitting ? 4 : 8;
    // FIX: Changed useMemo to return a Float32Array of colors, instead of a full InstancedBufferAttribute object.
    const colors = useMemo(() => {
        const colorsArray = new Float32Array(matrices.length * 3);
        const color = new THREE.Color();
        for (let i = 0; i < matrices.length; i++) {
            color.set(NPC_COLORS[i % NPC_COLORS.length]);
            color.toArray(colorsArray, i * 3);
        }
        return colorsArray;
    }, [matrices.length]);

    useLayoutEffect(() => {
        matrices.forEach((m, i) => {
            bodyRef.current?.setMatrixAt(i, m);
            headRef.current?.setMatrixAt(i, m);
        });
        if(bodyRef.current) bodyRef.current.instanceMatrix.needsUpdate = true;
        if(headRef.current) headRef.current.instanceMatrix.needsUpdate = true;
    }, [matrices]);

    useFrame(({ clock }) => {
        if (isSitting || !animationData || !bodyRef.current || !headRef.current) return;
        const time = clock.getElapsedTime();
        const tempObject = new THREE.Object3D();
        
        matrices.forEach((m, i) => {
            tempObject.matrix.copy(m);
            tempObject.matrix.decompose(tempObject.position, tempObject.quaternion, tempObject.scale);
            const anim = animationData[i];
            tempObject.position.y = anim.initialY + Math.sin(time * 2 + anim.initialX) * 0.2;
            tempObject.updateMatrix();
            bodyRef.current!.setMatrixAt(i, tempObject.matrix);
            headRef.current!.setMatrixAt(i, tempObject.matrix);
        });
        bodyRef.current.instanceMatrix.needsUpdate = true;
        headRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <group>
            <instancedMesh ref={bodyRef} args={[undefined, undefined, matrices.length]} castShadow receiveShadow>
                {/* FIX: Moved the instancedBufferAttribute to be a child of the geometry and corrected its props to fix the error. */}
                <boxGeometry args={[4, bodyHeight, 2]}>
                    <instancedBufferAttribute attach="instanceColor" args={[colors, 3]} />
                </boxGeometry>
                <meshToonMaterial vertexColors />
            </instancedMesh>
            <instancedMesh ref={headRef} args={[undefined, undefined, matrices.length]} castShadow receiveShadow>
                <sphereGeometry args={[2, 16, 16]} />
                <meshToonMaterial color="#ffc9a6" />
            </instancedMesh>
        </group>
    );
});


const roadInterval = 3;

const GameScene = ({ setCarDamage, carDamage, mapCanvasRef }: { setCarDamage: React.Dispatch<React.SetStateAction<number>>, carDamage: number, mapCanvasRef: React.RefObject<HTMLCanvasElement> }) => {
    const carRef = useRef<THREE.Group>(null!);
    const controls = useRef<Controls>({ forward: false, backward: false, left: false, right: false });
    const speed = useRef(0);
    const angle = useRef(0);
    const sidewaysSpeed = useRef(0);
    const carPosition = useRef(new THREE.Vector3(CELL_SIZE / 2, 1.1, CELL_SIZE / 2)); 

    const aiCars = useRef<AICarState[]>([]);
    const [aiCarComponents, setAiCarComponents] = useState<React.ReactElement[]>([]);

    const audioContext = useRef<AudioContext | null>(null);
    const engineSound = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);
    const screechSound = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);
    const isAudioInitialized = useRef(false);

    const playCollisionSound = useCallback((impactSpeed: number) => {
        if (!audioContext.current) return;
        const context = audioContext.current;
        const duration = 0.4;
        
        const bufferSize = context.sampleRate * duration;
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const source = context.createBufferSource();
        source.buffer = buffer;
        
        const gain = context.createGain();
        gain.gain.setValueAtTime(Math.min(0.8, impactSpeed / 20), context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

        source.connect(gain).connect(context.destination);
        source.start();

        source.onended = () => {
            source.disconnect();
            gain.disconnect();
        };
    }, []);

    const initAudio = useCallback(() => {
        if (isAudioInitialized.current) return;
        isAudioInitialized.current = true;
        
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContext.current = context;

        // Engine Sound
        const engineOsc = context.createOscillator();
        const engineGain = context.createGain();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.value = 60;
        engineGain.gain.setValueAtTime(0, context.currentTime); // Start silent
        engineOsc.connect(engineGain).connect(context.destination);
        engineOsc.start();
        engineSound.current = { osc: engineOsc, gain: engineGain };

        // Screech Sound
        const screechOsc = context.createOscillator();
        const screechGain = context.createGain();
        screechOsc.type = 'sine';
        screechOsc.frequency.value = 3000;
        screechGain.gain.setValueAtTime(0, context.currentTime); // Start silent
        screechOsc.connect(screechGain).connect(context.destination);
        screechOsc.start();
        screechSound.current = { osc: screechOsc, gain: screechGain };

        // Ambient City Rumble
        const ambientGain = context.createGain();
        ambientGain.gain.setValueAtTime(0.05, context.currentTime);
        ambientGain.connect(context.destination);
        const rumble1 = context.createOscillator();
        rumble1.type = 'sawtooth';
        rumble1.frequency.value = 30;
        rumble1.connect(ambientGain);
        rumble1.start();
        const rumble2 = context.createOscillator();
        rumble2.type = 'sine';
        rumble2.frequency.value = 45;
        rumble2.connect(ambientGain);
        rumble2.start();
    }, []);

    useEffect(() => {
        if (aiCars.current.length === 0) {
            const newCars: AICarState[] = [];
            const newCarComponents: React.ReactElement[] = [];

            for (let i = 0; i < NUM_AI_CARS; i++) {
                const roadLine = Math.floor(Math.random() * (GRID_SIZE / roadInterval)) * roadInterval;
                const isVertical = Math.random() > 0.5;
                const x = isVertical ? roadLine * CELL_SIZE + CELL_SIZE / 2 : Math.random() * WORLD_SIZE;
                const z = isVertical ? Math.random() * WORLD_SIZE : roadLine * CELL_SIZE + CELL_SIZE / 2;
                
                const carRef = React.createRef<THREE.Group>();
                const color = AI_CAR_COLORS[i % AI_CAR_COLORS.length];

                const newCar: AICarState = {
                    id: i,
                    position: new THREE.Vector3(x, 1.1, z),
                    velocity: new THREE.Vector3(),
                    angle: isVertical ? (Math.random() > 0.5 ? 0 : Math.PI) : (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2),
                    target: new THREE.Vector3(x, 1.1, z),
                    ref: carRef,
                    color: color,
                };
                newCars.push(newCar);
                newCarComponents.push(<CartoonCar key={i} ref={carRef} color={color} />);
            }
            aiCars.current = newCars;
            setAiCarComponents(newCarComponents);
        }
    }, []);


    const cityBuildings = useMemo(() => {
        const buildings: Obstacle[] = [];
        for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
                if (i % roadInterval !== 0 && j % roadInterval !== 0) {
                    const blockX = i * CELL_SIZE;
                    const blockZ = j * CELL_SIZE;
                    const buildingCount = Math.floor(Math.random() * 3) + 1;

                    for (let k = 0; k < buildingCount; k++) {
                        const width = Math.random() * (CELL_SIZE / 2.5) + (CELL_SIZE / 3);
                        const depth = Math.random() * (CELL_SIZE / 2.5) + (CELL_SIZE / 3);
                        const x = blockX + Math.random() * (CELL_SIZE - width) + width / 2;
                        const z = blockZ + Math.random() * (CELL_SIZE - depth) + depth / 2;
                        buildings.push({ x, y: z, width, height: depth });
                    }
                }
            }
        }
        return buildings;
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isAudioInitialized.current) {
                initAudio();
            }
            if (e.key === 'w' || e.key === 'ArrowUp') controls.current.forward = true;
            if (e.key === 's' || e.key === 'ArrowDown') controls.current.backward = true;
            if (e.key === 'a' || e.key === 'ArrowLeft') controls.current.left = true;
            if (e.key === 'd' || e.key === 'ArrowRight') controls.current.right = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'w' || e.key === 'ArrowUp') controls.current.forward = false;
            if (e.key === 's' || e.key === 'ArrowDown') controls.current.backward = false;
            if (e.key === 'a' || e.key === 'ArrowLeft') controls.current.left = false;
            if (e.key === 'd' || e.key === 'ArrowRight') controls.current.right = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (audioContext.current) {
                audioContext.current.close();
            }
        };
    }, [initAudio]);

    const checkCollision = (nextPos: THREE.Vector3) => {
        const cos = Math.abs(Math.cos(angle.current));
        const sin = Math.abs(Math.sin(angle.current));
        const rotatedWidth = cos * CAR_WIDTH + sin * CAR_LENGTH;
        const rotatedDepth = sin * CAR_WIDTH + cos * CAR_LENGTH;

        const carAABB = {
            minX: nextPos.x - rotatedWidth / 2,
            maxX: nextPos.x + rotatedWidth / 2,
            minZ: nextPos.z - rotatedDepth / 2,
            maxZ: nextPos.z + rotatedDepth / 2,
        };

        for (const obstacle of cityBuildings) {
            const obsAABB = {
                minX: obstacle.x - obstacle.width / 2,
                maxX: obstacle.x + obstacle.width / 2,
                minZ: obstacle.y - obstacle.height / 2,
                maxZ: obstacle.y + obstacle.height / 2,
            };

            if (
                carAABB.maxX >= obsAABB.minX &&
                carAABB.minX <= obsAABB.maxX &&
                carAABB.maxZ >= obsAABB.minZ &&
                carAABB.minZ <= obsAABB.maxZ
            ) {
                return { collision: true, isBuilding: true };
            }
        }
        
        for (const aiCar of aiCars.current) {
            if (nextPos.distanceTo(aiCar.position) < CAR_LENGTH) {
                return { collision: true, isBuilding: false };
            }
        }
        
        return { collision: false, isBuilding: false };
    };

    const findNewTarget = (car: AICarState) => {
        const currentGridX = Math.round((car.position.x - CELL_SIZE / 2) / CELL_SIZE / roadInterval);
        const currentGridZ = Math.round((car.position.z - CELL_SIZE / 2) / CELL_SIZE / roadInterval);
        
        const possibleDirections: ( 'N' | 'S' | 'E' | 'W' )[] = [];
        if (currentGridZ > 0) possibleDirections.push('N');
        if (currentGridZ < GRID_SIZE / roadInterval -1) possibleDirections.push('S');
        if (currentGridX > 0) possibleDirections.push('W');
        if (currentGridX < GRID_SIZE / roadInterval -1) possibleDirections.push('E');
        
        if (possibleDirections.length === 0) return car.target;
        
        const direction = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];

        let targetX = currentGridX;
        let targetZ = currentGridZ;

        switch (direction) {
            case 'N': targetZ -=1; break;
            case 'S': targetZ +=1; break;
            case 'W': targetX -=1; break;
            case 'E': targetX +=1; break;
        }

        return new THREE.Vector3(
            targetX * CELL_SIZE * roadInterval + CELL_SIZE / 2,
            1.1,
            targetZ * CELL_SIZE * roadInterval + CELL_SIZE / 2
        );
    };

    useFrame((state) => {
        if (!carRef.current) return;
        
        aiCars.current.forEach(car => {
            const distanceToTarget = car.position.distanceTo(car.target);
            if(distanceToTarget < AI_CAR_SPEED * 2) {
                car.target = findNewTarget(car);
            }

            const directionToTarget = new THREE.Vector3().subVectors(car.target, car.position).normalize();
            const targetAngle = Math.atan2(directionToTarget.x, directionToTarget.z);
            
            car.angle = THREE.MathUtils.lerp(car.angle, targetAngle, 0.08);

            let desiredSpeed = AI_CAR_SPEED;
            const forwardPoint = car.position.clone().add(new THREE.Vector3(Math.sin(car.angle), 0, Math.cos(car.angle)).multiplyScalar(AI_AVOIDANCE_DISTANCE));

            for(const otherCar of aiCars.current) {
                if(car.id === otherCar.id) continue;
                if(forwardPoint.distanceTo(otherCar.position) < CAR_LENGTH) {
                    desiredSpeed *= 0.1;
                    break;
                }
            }
             if(forwardPoint.distanceTo(carPosition.current) < CAR_LENGTH * 1.5) {
                desiredSpeed *= 0.05;
            }

            const targetVelocity = new THREE.Vector3(Math.sin(car.angle) * desiredSpeed, 0, Math.cos(car.angle) * desiredSpeed);
            car.velocity.lerp(targetVelocity, 0.1);
            car.position.add(car.velocity);

            if(car.ref.current) {
                car.ref.current.position.copy(car.position);
                car.ref.current.rotation.y = car.angle;
            }
        });

        if (carDamage >= MAX_DAMAGE) return;
        
        if (isAudioInitialized.current && engineSound.current && screechSound.current && audioContext.current) {
            const now = audioContext.current.currentTime;
            const { osc: engineOsc, gain: engineGain } = engineSound.current;
            const { gain: screechGain } = screechSound.current;

            const targetFreq = 60 + Math.abs(speed.current) * 12;
            const targetGain = 0.05 + Math.abs(speed.current / MAX_SPEED) * 0.25;
            engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
            engineGain.gain.setTargetAtTime(targetGain, now, 0.1);
            
            const screechThreshold = 0.4;
            const screechIntensity = Math.max(0, (Math.abs(sidewaysSpeed.current) - screechThreshold) / 4);
            const targetScreechGain = Math.min(0.4, screechIntensity);
            screechGain.gain.setTargetAtTime(targetScreechGain, now, 0.02);
        }

        const damageModifier = 1 - (carDamage / MAX_DAMAGE) * 0.7;
        const currentMaxSpeed = MAX_SPEED * damageModifier;
        const currentEngineForce = ENGINE_FORCE * damageModifier;

        if (controls.current.forward) speed.current += currentEngineForce * (1 - Math.abs(speed.current) / currentMaxSpeed);
        if (controls.current.backward) speed.current -= speed.current > 0 ? BRAKE_FORCE : currentEngineForce * 0.5;

        const totalDrag = DRAG_FORCE * Math.abs(speed.current) + FRICTION;
        speed.current *= (1 - totalDrag);
        sidewaysSpeed.current *= (1 - DRIFT_CONTROL);

        if (Math.abs(speed.current) > 0.1) {
            const turnDirection = speed.current > 0 ? 1 : -1;
            const turnAmount = TURN_SPEED * turnDirection;
            if (controls.current.left) {
                 angle.current += turnAmount;
                 sidewaysSpeed.current -= turnAmount * speed.current * 0.1;
            }
            if (controls.current.right) {
                 angle.current -= turnAmount;
                 sidewaysSpeed.current += turnAmount * speed.current * 0.1;
            }
        }
        
        if (Math.abs(speed.current) < 0.01) speed.current = 0;
        if (Math.abs(sidewaysSpeed.current) < 0.01) sidewaysSpeed.current = 0;
        speed.current = Math.max(-currentMaxSpeed * 0.3, Math.min(speed.current, currentMaxSpeed));

        const forwardVector = new THREE.Vector3(Math.sin(angle.current), 0, Math.cos(angle.current));
        const sidewaysVector = new THREE.Vector3(Math.cos(angle.current), 0, -Math.sin(angle.current));

        const moveVector = new THREE.Vector3()
            .add(forwardVector.multiplyScalar(speed.current))
            .add(sidewaysVector.multiplyScalar(sidewaysSpeed.current));

        const newPosition = carPosition.current.clone().add(moveVector);
        
        const collisionResult = checkCollision(newPosition);
        if (!collisionResult.collision) {
            carPosition.current.copy(newPosition);
        } else {
            const impactSpeed = Math.abs(speed.current) + Math.abs(sidewaysSpeed.current);
            const impactDamage = Math.floor(impactSpeed * DAMAGE_SCALAR);
            if (impactDamage > 0) {
                 setCarDamage(prev => Math.min(MAX_DAMAGE, prev + impactDamage));
                 playCollisionSound(impactSpeed);
            }
            if (collisionResult.isBuilding) {
                 speed.current *= -0.5;
                 sidewaysSpeed.current *= -0.7;
            } else {
                speed.current *= 0.5;
                sidewaysSpeed.current *= 0.5;
            }
           
        }
        
        const verticalBob = Math.sin(state.clock.getElapsedTime() * Math.abs(speed.current) * 0.5) * 0.1;
        carRef.current.position.y = 1.1 + verticalBob;
        carRef.current.position.x = carPosition.current.x;
        carRef.current.position.z = carPosition.current.z;
        carRef.current.rotation.y = angle.current;

        const cameraOffset = new THREE.Vector3(-Math.sin(angle.current) * 60, 40, -Math.cos(angle.current) * 60);
        const cameraPosition = new THREE.Vector3().copy(carPosition.current).add(cameraOffset);
        
        state.camera.position.lerp(cameraPosition, 0.1);
        state.camera.lookAt(carPosition.current);

        if (mapCanvasRef.current) {
            const canvas = mapCanvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const MAP_SIZE = canvas.width;
            const MAP_SCALE = 0.1;

            ctx.save();
            ctx.beginPath();
            ctx.arc(MAP_SIZE / 2, MAP_SIZE / 2, MAP_SIZE / 2, 0, Math.PI * 2);
            ctx.clip();
            
            ctx.fillStyle = 'rgba(10, 20, 30, 0.7)';
            ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

            ctx.save();
            ctx.translate(MAP_SIZE / 2, MAP_SIZE / 2);
            ctx.rotate(angle.current - Math.PI);
            ctx.scale(MAP_SCALE, MAP_SCALE);
            ctx.translate(-carPosition.current.x, -carPosition.current.z);
            
            ctx.fillStyle = `#${ROAD_COLOR.toString(16)}`;
            for (let i = 0; i < GRID_SIZE; i++) { if (i % roadInterval === 0) { const x = i * CELL_SIZE + CELL_SIZE / 2 - ROAD_WIDTH / 2; ctx.fillRect(x, 0, ROAD_WIDTH, WORLD_SIZE); } }
            for (let j = 0; j < GRID_SIZE; j++) { if (j % roadInterval === 0) { const z = j * CELL_SIZE + CELL_SIZE / 2 - ROAD_WIDTH / 2; ctx.fillRect(0, z, WORLD_SIZE, ROAD_WIDTH); } }
            
            cityBuildings.forEach((building, i) => {
                const colorHex = BUILDING_COLORS[i % BUILDING_COLORS.length].toString(16).padStart(6, '0');
                ctx.fillStyle = `#${colorHex}`;
                ctx.fillRect(building.x - building.width / 2, building.y - building.height / 2, building.width, building.height);
            });

            ctx.fillStyle = 'white';
            aiCars.current.forEach(car => {
                ctx.fillRect(car.position.x - 3, car.position.z - 5, 6, 10);
            });
            
            ctx.restore();
            ctx.restore();

            ctx.beginPath();
            ctx.arc(MAP_SIZE / 2, MAP_SIZE / 2, MAP_SIZE / 2 - 2, 0, Math.PI * 2);
            ctx.strokeStyle = '#63b3ed';
            ctx.lineWidth = 4;
            ctx.stroke();
            
            ctx.save();
            ctx.translate(MAP_SIZE / 2, MAP_SIZE / 2);
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(-6, 6);
            ctx.lineTo(6, 6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    });
    
    const roadElements = useMemo(() => {
        const elements: React.ReactElement[] = [];
        const sidewalkWidth = 20;
        for (let i = 0; i < GRID_SIZE; i++) {
            if (i % roadInterval === 0) {
                const x = i * CELL_SIZE + CELL_SIZE / 2;
                elements.push(<mesh key={`v-road-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.1, WORLD_SIZE / 2]} receiveShadow><planeGeometry args={[ROAD_WIDTH, WORLD_SIZE]} /><meshToonMaterial color={ROAD_COLOR} /></mesh>);
                elements.push(<mesh key={`v-sw-l-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x - ROAD_WIDTH/2 - sidewalkWidth/2, 0.2, WORLD_SIZE/2]} receiveShadow><planeGeometry args={[sidewalkWidth, WORLD_SIZE]} /><meshToonMaterial color={SIDEWALK_COLOR} /></mesh>);
                elements.push(<mesh key={`v-sw-r-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x + ROAD_WIDTH/2 + sidewalkWidth/2, 0.2, WORLD_SIZE/2]} receiveShadow><planeGeometry args={[sidewalkWidth, WORLD_SIZE]} /><meshToonMaterial color={SIDEWALK_COLOR} /></mesh>);
            }
        }
        for (let j = 0; j < GRID_SIZE; j++) {
            if (j % roadInterval === 0) {
                const z = j * CELL_SIZE + CELL_SIZE / 2;
                elements.push(<mesh key={`h-road-${j}`} rotation={[-Math.PI / 2, 0, 0]} position={[WORLD_SIZE / 2, 0.1, z]} receiveShadow><planeGeometry args={[WORLD_SIZE, ROAD_WIDTH]} /><meshToonMaterial color={ROAD_COLOR} /></mesh>);
                elements.push(<mesh key={`h-sw-t-${j}`} rotation={[-Math.PI/2,0,0]} position={[WORLD_SIZE/2, 0.2, z - ROAD_WIDTH/2 - sidewalkWidth/2]} receiveShadow><planeGeometry args={[WORLD_SIZE, sidewalkWidth]} /><meshToonMaterial color={SIDEWALK_COLOR} /></mesh>);
                elements.push(<mesh key={`h-sw-b-${j}`} rotation={[-Math.PI/2,0,0]} position={[WORLD_SIZE/2, 0.2, z + ROAD_WIDTH/2 + sidewalkWidth/2]} receiveShadow><planeGeometry args={[WORLD_SIZE, sidewalkWidth]} /><meshToonMaterial color={SIDEWALK_COLOR} /></mesh>);
            }
        }
        return elements;
    }, []);
    
    const instancedEnvironment = useMemo(() => {
        const lampMatrices: THREE.Matrix4[] = [];
        const benchMatrices: THREE.Matrix4[] = [];
        const standingNpcMatrices: THREE.Matrix4[] = [];
        const standingNpcAnimationData: { initialY: number, initialX: number }[] = [];
        const sittingNpcMatrices: THREE.Matrix4[] = [];

        const tempObject = new THREE.Object3D();
        const lampSpacing = 120;
        const propSpacing = 150;
        const sidewalkOffset = ROAD_WIDTH / 2 + 10;
        const BENCH_SEAT_HEIGHT = 3.25;
        const SIDEWALK_HEIGHT = 0.2;

        const addLamp = (x: number, z: number) => {
            const polePos = new THREE.Vector3(x, 15, z);
            const armPos = new THREE.Vector3(x + 2, 29, z);
            const armRot = new THREE.Euler(0, 0, -Math.PI / 4);
            const lightPos = new THREE.Vector3(x + 4.5, 27, z);
            
            tempObject.position.set(x, 0, z);
            tempObject.rotation.set(0, 0, 0);
            tempObject.updateMatrix();
            lampMatrices.push(tempObject.matrix.clone());
        };

        const placeGroup = (x: number, z: number, isVerticalRoad: boolean) => {
            const benchRotationY = isVerticalRoad ? Math.PI / 2 : 0;
            tempObject.position.set(x, SIDEWALK_HEIGHT + 2.5, z);
            tempObject.rotation.set(0, benchRotationY, 0);
            tempObject.updateMatrix();
            benchMatrices.push(tempObject.matrix.clone());

            const numNpcs = Math.floor(Math.random() * 2) + 2;
            for (let i = 0; i < numNpcs; i++) {
                const isSitting = i < 2 && Math.random() > 0.4;
                let npcX, npcZ, npcRot, npcY;
                if (isSitting) {
                    npcY = BENCH_SEAT_HEIGHT;
                    const seatOffset = (i === 0 ? -3 : 3);
                    if (isVerticalRoad) { npcX = x; npcZ = z + seatOffset; } else { npcX = x + seatOffset; npcZ = z; }
                    npcRot = benchRotationY + Math.PI + (Math.random() - 0.5);
                    
                    tempObject.position.set(npcX, npcY + 4, z); // Center of body
                    tempObject.rotation.set(0, npcRot, 0);
                    tempObject.updateMatrix();
                    sittingNpcMatrices.push(tempObject.matrix.clone());
                } else {
                    npcY = SIDEWALK_HEIGHT;
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 10 + Math.random() * 5;
                    npcX = x + Math.cos(angle) * radius;
                    npcZ = z + Math.sin(angle) * radius;
                    npcRot = Math.atan2(x - npcX, z - npcZ);

                    tempObject.position.set(npcX, npcY + 4, npcZ); // Center of body
                    tempObject.rotation.set(0, npcRot, 0);
                    tempObject.updateMatrix();
                    standingNpcMatrices.push(tempObject.matrix.clone());
                    standingNpcAnimationData.push({ initialY: npcY + 4, initialX: npcX });
                }
            }
        };

        for (let j = 0; j < GRID_SIZE; j++) {
            if (j % roadInterval === 0) {
                const z = j * CELL_SIZE + CELL_SIZE / 2;
                for (let x = CELL_SIZE; x < WORLD_SIZE; x += lampSpacing) {
                    addLamp(x, z - sidewalkOffset);
                    addLamp(x, z + sidewalkOffset);
                }
                 for (let x = CELL_SIZE; x < WORLD_SIZE; x += propSpacing) {
                    if (Math.random() > 0.6) placeGroup(x + Math.random() * 40 - 20, z - sidewalkOffset, false);
                    if (Math.random() > 0.6) placeGroup(x + Math.random() * 40 - 20, z + sidewalkOffset, false);
                }
            }
        }
        for (let i = 0; i < GRID_SIZE; i++) {
            if (i % roadInterval === 0) {
                const x = i * CELL_SIZE + CELL_SIZE / 2;
                for (let z = CELL_SIZE; z < WORLD_SIZE; z += lampSpacing) {
                    addLamp(x - sidewalkOffset, z);
                    addLamp(x + sidewalkOffset, z);
                }
                for (let z = CELL_SIZE; z < WORLD_SIZE; z += propSpacing) {
                     if (Math.random() > 0.6) placeGroup(x - sidewalkOffset, z + Math.random() * 40 - 20, true);
                    if (Math.random() > 0.6) placeGroup(x + sidewalkOffset, z + Math.random() * 40 - 20, true);
                }
            }
        }

        return { lampMatrices, benchMatrices, standingNpcMatrices, sittingNpcMatrices, standingNpcAnimationData };
    }, []);

    return (
        <>
            <ambientLight intensity={0.8} />
            <directionalLight 
                position={[100, 200, 100]} 
                intensity={1.5} 
                castShadow 
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
            />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[WORLD_SIZE / 2, 0, WORLD_SIZE / 2]} receiveShadow>
                <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
                <meshToonMaterial color="#48bb78" />
            </mesh>
            {roadElements}
            
            <InstancedStreetLamps matrices={instancedEnvironment.lampMatrices} />
            <InstancedBenches matrices={instancedEnvironment.benchMatrices} />
            <InstancedNPCs matrices={instancedEnvironment.standingNpcMatrices} animationData={instancedEnvironment.standingNpcAnimationData} isSitting={false} />
            <InstancedNPCs matrices={instancedEnvironment.sittingNpcMatrices} isSitting={true} />

            <Car ref={carRef} damage={carDamage} />
            {aiCarComponents}
            {cityBuildings.map((obs, i) => (
                <CartoonBuilding key={i} obstacle={obs} color={BUILDING_COLORS[i % BUILDING_COLORS.length]} />
            ))}
            <fog attach="fog" args={['#a0deff', 400, 1500]} />
        </>
    );
};

const Game = () => {
    const [carDamage, setCarDamage] = useState(0);
    const mapCanvasRef = useRef<HTMLCanvasElement>(null);
    const [showInstructions, setShowInstructions] = useState(true);

    useEffect(() => {
        const hide = () => setShowInstructions(false);
        window.addEventListener('keydown', hide, { once: true });
        return () => window.removeEventListener('keydown', hide);
    }, []);

    const damageColor = carDamage > 80 ? 'red' : carDamage > 50 ? 'orange' : 'white';

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#a0deff' }}>
            {showInstructions && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 200,
                    textAlign: 'center',
                    cursor: 'pointer',
                }} onClick={() => setShowInstructions(false)}>
                    <h1 style={{ fontSize: '3em', margin: 0 }}>Web Drive V</h1>
                    <p style={{ fontSize: '1.5em', marginTop: '20px' }}>Use <kbd>WASD</kbd> or <kbd>Arrow Keys</kbd> to Drive</p>
                    <p style={{ marginTop: '40px', fontSize: '1.2em', animation: 'pulse 2s infinite' }}>Press any key to start</p>
                    <style>{`
                        @keyframes pulse {
                            0% { opacity: 1; }
                            50% { opacity: 0.5; }
                            100% { opacity: 1; }
                        }
                        kbd {
                            background-color: #eee;
                            border-radius: 3px;
                            border: 1px solid #b4b4b4;
                            color: #333;
                            display: inline-block;
                            font-size: .85em;
                            font-weight: 700;
                            line-height: 1;
                            padding: 2px 4px;
                            white-space: nowrap;
                        }
                    `}</style>
                </div>
            )}
            <canvas 
                ref={mapCanvasRef}
                width="200"
                height="200"
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '20px',
                    zIndex: 100,
                    borderRadius: '50%',
                }}
            />
             <div style={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                color: 'white',
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: '10px 15px',
                borderRadius: '8px',
                zIndex: 100,
                fontFamily: 'monospace',
                border: '1px solid rgba(255,255,255,0.2)'
            }}>
                <h3 style={{margin: 0, fontSize: '1em', color: '#aaa' }}>CAR STATUS</h3>
                <p style={{margin: '5px 0 0', fontSize: '1.2em', fontWeight: 'bold', color: damageColor }}>
                   DAMAGE: {carDamage}%
                </p>
                 {carDamage >= MAX_DAMAGE && <p style={{color: 'red', fontWeight: 'bold', margin: '5px 0 0'}}>VEHICLE DISABLED</p>}
            </div>
             <Canvas
                shadows
                camera={{
                    position: [1000, 60, 920],
                    fov: 60,
                    near: 1,
                    far: 10000
                }}
             >
               <GameScene setCarDamage={setCarDamage} carDamage={carDamage} mapCanvasRef={mapCanvasRef} />
            </Canvas>
        </div>
    );
};

export default Game;
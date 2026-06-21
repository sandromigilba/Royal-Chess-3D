import { useMemo } from 'react'
import * as THREE from 'three'
import { useSettingsStore } from '../store/settingsStore'

interface PieceGeomProps {
  color: 'w' | 'b';
  hovered?: boolean;
  selected?: boolean;
  checking?: boolean;
}

/**
 * Premium gray-glass material.
 * White → light gray (abu muda) with silver sheen, 80% opaque
 * Black → dark gray (abu tua) smoked glass, 72% opaque
 */
export function PieceMaterial({ color, hovered = false, selected = false, checking = false }: { 
  color: 'w' | 'b'; 
  hovered?: boolean; 
  selected?: boolean; 
  checking?: boolean;
}) {
  const pieceTheme = useSettingsStore((state) => state.pieceTheme);
  const isDoff = pieceTheme === 'doff';

  // White: doff = #cdd1d6 (abu muda), glossy = #eceff2 (whiter)
  // Black: doff = #4b5058 (abu tua), glossy = #546378 (lighter blue-gray)
  const baseColor = color === 'w' 
    ? (isDoff ? '#cdd1d6' : '#eceff2') 
    : (isDoff ? '#4b5058' : '#546378');

  const emissive = checking 
    ? '#ff3333'
    : selected 
      ? (color === 'w' ? '#a5d8ff' : '#1971c2')
      : hovered 
        ? (color === 'w' ? (isDoff ? '#9ba4b0' : '#b0b8c4') : (isDoff ? '#686f7a' : '#708197')) 
        : '#000000';

  const opacity = 1.0;

  const roughness = isDoff
    ? (color === 'w' ? 0.50 : 0.55)
    : (color === 'w' ? 0.18 : 0.14);

  const metalness = isDoff
    ? (color === 'w' ? 0.30 : 0.40)
    : (color === 'w' ? 0.55 : 0.65);

  const reflectivity = isDoff
    ? (color === 'w' ? 0.30 : 0.30)
    : (color === 'w' ? 0.70 : 0.60);

  const clearcoat = isDoff
    ? (color === 'w' ? 0.10 : 0.10)
    : (color === 'w' ? 0.50 : 0.70);

  const clearcoatRoughness = isDoff
    ? (color === 'w' ? 0.60 : 0.60)
    : (color === 'w' ? 0.15 : 0.08);

  return (
    <meshPhysicalMaterial
      color={baseColor}
      roughness={roughness}
      metalness={metalness}
      reflectivity={reflectivity}
      clearcoat={clearcoat}
      clearcoatRoughness={clearcoatRoughness}
      emissive={emissive}
      emissiveIntensity={checking ? 1.1 : (selected ? 0.55 : (hovered ? 0.18 : 0.0))}
      transparent={false}
      opacity={opacity}
    />
  )
}

// Common circular base for all pieces
function PieceBase({ color, hovered, selected, checking }: PieceGeomProps) {
  return (
    <group>
      {/* Lower rim */}
      <mesh castShadow receiveShadow position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.3, 0.32, 0.05, 20]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
      {/* Upper collar */}
      <mesh castShadow receiveShadow position={[0, 0.065, 0]}>
        <cylinderGeometry args={[0.26, 0.28, 0.03, 20]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
    </group>
  )
}

export function PawnGeometry({ color, hovered, selected, checking }: PieceGeomProps) {
  return (
    <group>
      <PieceBase color={color} hovered={hovered} selected={selected} checking={checking} />
      {/* Tapered body */}
      <mesh castShadow receiveShadow position={[0, 0.225, 0]}>
        <cylinderGeometry args={[0.13, 0.24, 0.3, 20]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
      {/* Collar ring */}
      <mesh castShadow receiveShadow position={[0, 0.385, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.13, 0.03, 8, 20]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
      {/* Sphere head */}
      <mesh castShadow receiveShadow position={[0, 0.49, 0]}>
        <sphereGeometry args={[0.16, 20, 20]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
    </group>
  )
}

export function RookGeometry({ color, hovered, selected, checking }: PieceGeomProps) {
  return (
    <group>
      <PieceBase color={color} hovered={hovered} selected={selected} checking={checking} />
      {/* Main tower body */}
      <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.2, 0.24, 0.45, 20]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
      {/* Top battlement head */}
      <mesh castShadow receiveShadow position={[0, 0.575, 0]}>
        <cylinderGeometry args={[0.24, 0.22, 0.1, 20]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
      {/* Castle notch */}
      <mesh castShadow receiveShadow position={[0, 0.635, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.02, 12, 1, false]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
    </group>
  )
}

export function KnightGeometry({ color, hovered, selected, checking }: PieceGeomProps) {
  const horseShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.16, -0.3);
    shape.lineTo(0.16, -0.3);
    shape.quadraticCurveTo(0.24, 0.05, 0.26, 0.18);
    shape.lineTo(0.32, 0.12);
    shape.lineTo(0.36, 0.28);
    shape.quadraticCurveTo(0.18, 0.45, 0.08, 0.45);
    shape.lineTo(-0.04, 0.45);
    shape.lineTo(-0.12, 0.35);
    shape.lineTo(-0.24, 0.15);
    shape.lineTo(-0.24, -0.05);
    shape.quadraticCurveTo(-0.24, -0.24, -0.16, -0.3);
    shape.closePath();
    return shape;
  }, []);

  const extrudeSettings = {
    depth: 0.16,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02,
  };

  return (
    <group>
      <PieceBase color={color} hovered={hovered} selected={selected} checking={checking} />
      <mesh castShadow receiveShadow position={[-0.08, 0.32, -0.08]} rotation={[0, Math.PI / 2, 0]}>
        <extrudeGeometry args={[horseShape, extrudeSettings]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
    </group>
  )
}

export function BishopGeometry({ color, hovered, selected, checking }: PieceGeomProps) {
  return (
    <group>
      <PieceBase color={color} hovered={hovered} selected={selected} checking={checking} />
      <mesh castShadow receiveShadow position={[0, 0.275, 0]}>
        <cylinderGeometry args={[0.16, 0.24, 0.4, 20]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.575, 0]}>
        <cylinderGeometry args={[0.18, 0.16, 0.2, 20]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.735, 0]}>
        <cylinderGeometry args={[0.01, 0.18, 0.14, 20]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.825, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
    </group>
  )
}

export function QueenGeometry({ color, hovered, selected, checking }: PieceGeomProps) {
  return (
    <group>
      <PieceBase color={color} hovered={hovered} selected={selected} checking={checking} />
      <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.16, 0.24, 0.6, 20]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.68, 0]}>
        <cylinderGeometry args={[0.26, 0.16, 0.08, 20]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.28, 0.25, 0.06, 10, 1, false]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.81, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
    </group>
  )
}

export function KingGeometry({ color, hovered, selected, checking }: PieceGeomProps) {
  return (
    <group>
      <PieceBase color={color} hovered={hovered} selected={selected} checking={checking} />
      <mesh castShadow receiveShadow position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.16, 0.24, 0.65, 20]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.725, 0]}>
        <cylinderGeometry args={[0.24, 0.16, 0.06, 20]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.815, 0]}>
        <cylinderGeometry args={[0.2, 0.24, 0.12, 20]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
      {/* Cross */}
      <mesh castShadow position={[0, 1.0, 0]}>
        <boxGeometry args={[0.04, 0.14, 0.04]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
      <mesh castShadow position={[0, 1.01, 0]}>
        <boxGeometry args={[0.12, 0.04, 0.04]} />
        <PieceMaterial color={color} hovered={hovered} selected={selected} checking={checking} />
      </mesh>
    </group>
  )
}

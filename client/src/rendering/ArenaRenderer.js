import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { TILE, MAP_W, MAP_H } from '../mapgen/BSPGenerator.js'

const TILE_SIZE = 2
const WALL_H = 2.5

// 波次颜色主题
const WAVE_PALETTES = [
  { floor: 0x001a2e, wall: 0x00ffff, wallEmissive: 0x004466 },
  { floor: 0x1a0030, wall: 0xaa00ff, wallEmissive: 0x330055 },
  { floor: 0x2e0000, wall: 0xff2060, wallEmissive: 0x550010 },
  { floor: 0x001a00, wall: 0x00ff88, wallEmissive: 0x004422 },
]

export class ArenaRenderer {
  constructor(scene) {
    this.scene = scene
    this.group = new THREE.Group()
    scene.add(this.group)
    this._floorMesh = null
    this._wallMesh = null
    this._reactor = null
    this._reactorCore = null
    this._reactorRingA = null
    this._reactorRingB = null
    this._reactorPillar = null
    this._paletteIdx = 0
  }

  build(tiles, reactorPos) {
    // 清理旧网格
    this.group.clear()

    const floorGeos = [], wallGeos = []

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const wx = x * TILE_SIZE, wz = y * TILE_SIZE
        if (tiles[y * MAP_W + x] === TILE.FLOOR) {
          const g = new THREE.BoxGeometry(TILE_SIZE, 0.1, TILE_SIZE)
          g.translate(wx + TILE_SIZE / 2, -0.05, wz + TILE_SIZE / 2)
          floorGeos.push(g)
        } else {
          const g = new THREE.BoxGeometry(TILE_SIZE, WALL_H, TILE_SIZE)
          g.translate(wx + TILE_SIZE / 2, WALL_H / 2, wz + TILE_SIZE / 2)
          wallGeos.push(g)
        }
      }
    }

    const palette = WAVE_PALETTES[this._paletteIdx % WAVE_PALETTES.length]

    // 合并几何体 — 一次 draw call
    if (floorGeos.length) {
      const merged = mergeGeometries(floorGeos)
      const mat = new THREE.MeshStandardMaterial({
        color: palette.floor,
        roughness: 0.9,
        metalness: 0.1,
        emissive: new THREE.Color(palette.floor).multiplyScalar(0.3)
      })
      this._floorMesh = new THREE.Mesh(merged, mat)
      this.group.add(this._floorMesh)
    }

    if (wallGeos.length) {
      const merged = mergeGeometries(wallGeos)
      const mat = new THREE.MeshStandardMaterial({
        color: palette.wall,
        emissive: new THREE.Color(palette.wallEmissive),
        emissiveIntensity: 1.5,  // > 1 触发 bloom
        roughness: 0.3,
        metalness: 0.8
      })
      this._wallMesh = new THREE.Mesh(merged, mat)
      this.group.add(this._wallMesh)
    }

    // 反应堆核心
    const rx = (reactorPos.x + 0.5) * TILE_SIZE
    const rz = (reactorPos.y + 0.5) * TILE_SIZE

    this._reactor = new THREE.Group()
    this._reactor.position.set(rx, 0, rz)
    this.group.add(this._reactor)

    this._reactorCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0xffaa00), emissiveIntensity: 4, roughness: 0.1, metalness: 0.9 })
    )
    this._reactorCore.position.y = 1.4
    this._reactor.add(this._reactorCore)

    const ringMat = new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: new THREE.Color(0xff8800), emissiveIntensity: 3, roughness: 0.2, metalness: 1.0 })
    this._reactorRingA = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.055, 8, 32), ringMat)
    this._reactorRingA.position.y = 1.4
    this._reactor.add(this._reactorRingA)

    this._reactorRingB = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.055, 8, 32), ringMat.clone())
    this._reactorRingB.position.y = 1.4
    this._reactorRingB.rotation.x = Math.PI / 2
    this._reactor.add(this._reactorRingB)

    this._reactorPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 6.0, 8),
      new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: new THREE.Color(0xffaa00), emissiveIntensity: 2.5, roughness: 0.0, metalness: 0.0, transparent: true, opacity: 0.55 })
    )
    this._reactorPillar.position.y = 3.0
    this._reactor.add(this._reactorPillar)

    const reactorLight = new THREE.PointLight(0xffaa00, 3, 12)
    reactorLight.position.y = 2
    this._reactor.add(reactorLight)

    floorGeos.forEach(g => g.dispose())
    wallGeos.forEach(g => g.dispose())
  }

  update(dt, reactorHpRatio) {
    if (!this._reactor) return

    this._reactorCore.rotation.y  += dt * 1.2
    this._reactorCore.rotation.x  += dt * 0.5
    this._reactorRingA.rotation.y += dt * 2.0
    this._reactorRingB.rotation.z += dt * 1.4

    const base      = 3 + (1 - reactorHpRatio) * 6
    const pulse     = Math.sin(Date.now() * 0.003 * (1 + (1 - reactorHpRatio) * 4)) * 0.5 + 0.5
    const intensity = base + pulse * 2

    this._reactorCore.material.emissiveIntensity   = intensity
    this._reactorRingA.material.emissiveIntensity  = intensity * 0.8
    this._reactorRingB.material.emissiveIntensity  = intensity * 0.8
    this._reactorPillar.material.emissiveIntensity = 1.5 + pulse * 2
    this._reactorPillar.material.opacity           = 0.35 + pulse * 0.3
  }

  setPalette(idx) {
    this._paletteIdx = idx
  }
}

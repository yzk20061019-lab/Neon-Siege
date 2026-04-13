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
    this._reactorMesh = null
    this._gridLines = null
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
    const reactorGeo = new THREE.OctahedronGeometry(0.8, 1)
    const reactorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0xffaa00),
      emissiveIntensity: 3,
      wireframe: false
    })
    this._reactorMesh = new THREE.Mesh(reactorGeo, reactorMat)
    this._reactorMesh.position.set(rx, 1.2, rz)
    this.group.add(this._reactorMesh)

    // 反应堆光源
    const reactorLight = new THREE.PointLight(0xffaa00, 3, 12)
    reactorLight.position.set(rx, 2, rz)
    this.group.add(reactorLight)

    floorGeos.forEach(g => g.dispose())
    wallGeos.forEach(g => g.dispose())
  }

  update(dt, reactorHpRatio) {
    if (this._reactorMesh) {
      this._reactorMesh.rotation.y += dt * 1.5
      this._reactorMesh.rotation.x += dt * 0.8
      // 血量越低，反应堆越狂乱
      const intensity = 2 + (1 - reactorHpRatio) * 5
      this._reactorMesh.material.emissiveIntensity = intensity
    }
  }

  setPalette(idx) {
    this._paletteIdx = idx
  }
}

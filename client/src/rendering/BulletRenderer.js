import * as THREE from 'three'

const POOL_SIZE = 200
const TRAIL_LENGTH = 8

export class BulletRenderer {
  constructor(scene) {
    this.scene = scene
    this._pool = []
    this._active = new Map()  // bulletId -> { mesh, trail[] }

    const geo = new THREE.SphereGeometry(0.12, 6, 6)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0.2, 0.8, 1),
      emissiveIntensity: 4
    })

    // 预分配对象池
    for (let i = 0; i < POOL_SIZE; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone())
      mesh.visible = false
      scene.add(mesh)
      this._pool.push(mesh)
    }
  }

  update(bullets) {
    const seen = new Set()

    for (const b of bullets) {
      seen.add(b.id)
      if (!this._active.has(b.id)) {
        const mesh = this._pool.pop()
        if (!mesh) continue
        mesh.visible = true
        this._active.set(b.id, { mesh, prevPos: new THREE.Vector3(b.x, 0.3, b.y) })
      }
      const entry = this._active.get(b.id)
      if (entry) {
        entry.mesh.position.set(b.x, 0.3, b.y)
      }
    }

    // 回收不再活跃的子弹
    for (const [id, entry] of this._active) {
      if (!seen.has(id)) {
        entry.mesh.visible = false
        this._pool.push(entry.mesh)
        this._active.delete(id)
      }
    }
  }
}

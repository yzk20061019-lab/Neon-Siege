import * as THREE from 'three'

const TILE_SIZE = 2

export class PlayerRenderer {
  constructor(scene, localId) {
    this.scene = scene
    this.localId = localId
    this.meshes = new Map()  // playerId -> group

    this._geo = new THREE.CylinderGeometry(0.35, 0.25, 0.5, 8)
    this._barrelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6)
  }

  update(players) {
    const seen = new Set()

    for (const p of players) {
      seen.add(p.id)
      let group = this.meshes.get(p.id)

      if (!group) {
        group = new THREE.Group()
        const isLocal = p.id === this.localId
        const color = isLocal ? 0x00ffff : 0xff8800
        const emissive = isLocal ? new THREE.Color(0, 0.5, 0.5) : new THREE.Color(0.5, 0.2, 0)

        const bodyMat = new THREE.MeshStandardMaterial({
          color, emissive, emissiveIntensity: 2, roughness: 0.3, metalness: 0.8
        })
        const body = new THREE.Mesh(this._geo, bodyMat)
        body.position.y = 0.35

        const barrelMat = new THREE.MeshStandardMaterial({
          color: 0xffffff, emissive: new THREE.Color(color).multiplyScalar(0.5),
          emissiveIntensity: 3
        })
        const barrel = new THREE.Mesh(this._barrelGeo, barrelMat)
        barrel.rotation.x = Math.PI / 2
        barrel.position.set(0, 0.35, -0.5)

        group.add(body, barrel)
        this.scene.add(group)
        this.meshes.set(p.id, group)
      }

      if (!p.alive) { group.visible = false; continue }
      group.visible = true
      group.position.set(p.x, 0, p.y)
      group.rotation.y = -p.angle + Math.PI / 2
    }

    for (const [id, group] of this.meshes) {
      if (!seen.has(id)) {
        this.scene.remove(group)
        this.meshes.delete(id)
      }
    }
  }

  getLocalPosition(players) {
    const local = players.find(p => p.id === this.localId)
    return local ? { x: local.x, z: local.y } : null
  }
}

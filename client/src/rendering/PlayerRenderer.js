import * as THREE from 'three'

const TILE_SIZE = 2

export class PlayerRenderer {
  constructor(scene, localId) {
    this.scene = scene
    this.localId = localId
    this.meshes = new Map()  // playerId -> group

    this._headGeo  = new THREE.BoxGeometry(0.22, 0.18, 0.22)
    this._torsoGeo = new THREE.BoxGeometry(0.45, 0.35, 0.30)
    this._legGeo   = new THREE.BoxGeometry(0.14, 0.30, 0.14)
    this._gunGeo   = new THREE.CylinderGeometry(0.055, 0.055, 0.52, 6)
  }

  update(players) {
    const seen = new Set()

    for (const p of players) {
      seen.add(p.id)
      let group = this.meshes.get(p.id)

      if (!group) {
        group = new THREE.Group()
        const isLocal = p.id === this.localId
        const color   = isLocal ? 0x00ffff : 0xff8800
        const emissive = isLocal ? new THREE.Color(0, 0.6, 0.6) : new THREE.Color(0.6, 0.25, 0)
        const base = { color, emissive, roughness: 0.25, metalness: 0.85 }

        const torso = new THREE.Mesh(this._torsoGeo,
          new THREE.MeshStandardMaterial({ ...base, emissiveIntensity: 1.2 }))
        torso.position.y = 0.75

        const head = new THREE.Mesh(this._headGeo,
          new THREE.MeshStandardMaterial({ ...base, emissiveIntensity: 1.0 }))
        head.position.y = 1.05

        const legMat = new THREE.MeshStandardMaterial({ ...base, emissiveIntensity: 0.8 })
        const legL = new THREE.Mesh(this._legGeo, legMat)
        legL.position.set(-0.16, 0.42, 0)
        const legR = new THREE.Mesh(this._legGeo, legMat)
        legR.position.set( 0.16, 0.42, 0)

        const gun = new THREE.Mesh(this._gunGeo, new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: new THREE.Color(color).multiplyScalar(0.6),
          emissiveIntensity: 1.8, roughness: 0.1, metalness: 1.0
        }))
        gun.rotation.x = Math.PI / 2
        gun.position.set(0, 0.75, -0.52)

        group.add(torso, head, legL, legR, gun)
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

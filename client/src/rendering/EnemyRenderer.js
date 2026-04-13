import * as THREE from 'three'
import vertSrc from '../shaders/NeonEnemy.vert?raw'
import fragSrc from '../shaders/NeonEnemy.frag?raw'

const TILE_SIZE = 2
const ENEMY_COLORS = {
  '#ff2060': new THREE.Color(1, 0.12, 0.37),
  '#ff6020': new THREE.Color(1, 0.37, 0.12),
  '#a020ff': new THREE.Color(0.62, 0.12, 1),
  '#ff20a0': new THREE.Color(1, 0.12, 0.62),
}

export class EnemyRenderer {
  constructor(scene) {
    this.scene = scene
    this.meshes = new Map()  // enemyId -> mesh
    this._geo = new THREE.ConeGeometry(0.35, 0.8, 6)
    this._geo.rotateX(Math.PI / 2)
  }

  update(enemies, uTime) {
    const seen = new Set()

    for (const e of enemies) {
      seen.add(e.id)
      let mesh = this.meshes.get(e.id)

      if (!mesh) {
        const color = ENEMY_COLORS[e.color] || new THREE.Color(1, 0, 0.5)
        const mat = new THREE.ShaderMaterial({
          vertexShader: vertSrc,
          fragmentShader: fragSrc,
          uniforms: {
            uTime: { value: 0 },
            uColor: { value: color },
            uHealthRatio: { value: 1.0 }
          }
        })
        mesh = new THREE.Mesh(this._geo, mat)
        this.scene.add(mesh)
        this.meshes.set(e.id, mesh)
      }

      mesh.position.set(e.x, 0.5, e.y)
      mesh.material.uniforms.uTime.value = uTime
      mesh.material.uniforms.uHealthRatio.value = e.hp / e.maxHp
    }

    // 移除已死亡的敌人
    for (const [id, mesh] of this.meshes) {
      if (!seen.has(id)) {
        this.scene.remove(mesh)
        mesh.material.dispose()
        this.meshes.delete(id)
      }
    }
  }

  dispose() {
    for (const [, mesh] of this.meshes) {
      this.scene.remove(mesh)
      mesh.material.dispose()
    }
    this._geo.dispose()
  }
}

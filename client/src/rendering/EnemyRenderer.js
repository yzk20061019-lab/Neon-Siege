import * as THREE from 'three'
import vertSrc from '../shaders/NeonEnemy.vert?raw'
import fragSrc from '../shaders/NeonEnemy.frag?raw'

const ENEMY_COLORS = {
  '#ff2060': new THREE.Color(1, 0.12, 0.37),
  '#ff6020': new THREE.Color(1, 0.37, 0.12),
  '#a020ff': new THREE.Color(0.62, 0.12, 1),
  '#ff20a0': new THREE.Color(1, 0.12, 0.62),
}

// 共享几何体 — 模块级，避免重复分配
const _scoutBodyGeo  = new THREE.SphereGeometry(0.28, 8, 6)
const _scoutLegGeo   = new THREE.CylinderGeometry(0.045, 0.045, 0.22, 5)
const _heavyTorsoGeo = new THREE.BoxGeometry(0.55, 0.50, 0.40)
const _heavyLegGeo   = new THREE.BoxGeometry(0.18, 0.32, 0.18)
const _droneDiscGeo  = new THREE.CylinderGeometry(0.38, 0.38, 0.10, 12)
const _droneRotorGeo = new THREE.TorusGeometry(0.30, 0.035, 6, 16)

function _makeMat(uniforms) {
  return new THREE.ShaderMaterial({
    vertexShader: vertSrc,
    fragmentShader: fragSrc,
    uniforms
  })
}

function _buildScout(color) {
  const uniforms = {
    uTime:        { value: 0 },
    uColor:       { value: color },
    uHealthRatio: { value: 1.0 }
  }
  const group = new THREE.Group()

  const body = new THREE.Mesh(_scoutBodyGeo, _makeMat(uniforms))
  body.position.y = 0.28
  group.add(body)

  // 4条腿，均匀分布在 45°/135°/225°/315°
  const legAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75]
  for (const a of legAngles) {
    const leg = new THREE.Mesh(_scoutLegGeo, _makeMat(uniforms))
    leg.rotation.z = Math.PI / 2
    leg.rotation.y = a
    leg.position.set(Math.cos(a) * 0.30, 0.11, Math.sin(a) * 0.30)
    group.add(leg)
  }

  group.userData.uniforms = uniforms
  group.userData.groundY  = 0
  return group
}

function _buildHeavy(color) {
  const uniforms = {
    uTime:        { value: 0 },
    uColor:       { value: color },
    uHealthRatio: { value: 1.0 }
  }
  const group = new THREE.Group()

  const torso = new THREE.Mesh(_heavyTorsoGeo, _makeMat(uniforms))
  torso.position.y = 0.55
  group.add(torso)

  const legL = new THREE.Mesh(_heavyLegGeo, _makeMat(uniforms))
  legL.position.set(-0.19, 0.16, 0)
  group.add(legL)

  const legR = new THREE.Mesh(_heavyLegGeo, _makeMat(uniforms))
  legR.position.set( 0.19, 0.16, 0)
  group.add(legR)

  group.userData.uniforms = uniforms
  group.userData.groundY  = 0
  return group
}

function _buildDrone(color) {
  const uniforms = {
    uTime:        { value: 0 },
    uColor:       { value: color },
    uHealthRatio: { value: 1.0 }
  }
  const group = new THREE.Group()

  const disc = new THREE.Mesh(_droneDiscGeo, _makeMat(uniforms))
  group.add(disc)

  const rotorA = new THREE.Mesh(_droneRotorGeo, _makeMat(uniforms))
  group.add(rotorA)

  const rotorB = new THREE.Mesh(_droneRotorGeo, _makeMat(uniforms))
  rotorB.rotation.x = Math.PI / 2
  group.add(rotorB)

  group.userData.uniforms = uniforms
  group.userData.groundY  = 0.8
  group.userData.isDrone  = true
  group.userData.rotorA   = rotorA
  group.userData.rotorB   = rotorB
  return group
}

export class EnemyRenderer {
  constructor(scene) {
    this.scene = scene
    this.meshes = new Map()  // enemyId -> THREE.Group
  }

  update(enemies, uTime) {
    const seen = new Set()

    for (const e of enemies) {
      seen.add(e.id)
      let group = this.meshes.get(e.id)

      if (!group) {
        const color = ENEMY_COLORS[e.color] || new THREE.Color(1, 0, 0.5)
        if (e.color === '#ff6020') {
          group = _buildHeavy(color)
        } else if (e.color === '#a020ff') {
          group = _buildDrone(color)
        } else {
          group = _buildScout(color)
        }
        this.scene.add(group)
        this.meshes.set(e.id, group)
      }

      const u = group.userData.uniforms
      u.uTime.value        = uTime
      u.uHealthRatio.value = e.hp / e.maxHp

      group.position.set(e.x, group.userData.groundY, e.y)

      if (group.userData.isDrone) {
        group.userData.rotorA.rotation.y += 0.04
        group.userData.rotorB.rotation.z += 0.04
      }
    }

    for (const [id, group] of this.meshes) {
      if (!seen.has(id)) {
        this.scene.remove(group)
        for (const child of group.children) child.material.dispose()
        this.meshes.delete(id)
      }
    }
  }

  dispose() {
    for (const [, group] of this.meshes) {
      this.scene.remove(group)
      for (const child of group.children) child.material.dispose()
    }
  }
}

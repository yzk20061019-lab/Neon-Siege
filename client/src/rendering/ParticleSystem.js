import * as THREE from 'three'

const MAX_PARTICLES = 800

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene
    this._particles = []

    // 使用 Points 渲染所有粒子（单次 draw call）
    this._positions = new Float32Array(MAX_PARTICLES * 3)
    this._colors = new Float32Array(MAX_PARTICLES * 3)
    this._sizes = new Float32Array(MAX_PARTICLES)

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(this._positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(this._colors, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(this._sizes, 1))

    const mat = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    })

    this._points = new THREE.Points(geo, mat)
    scene.add(this._points)
    this._geo = geo
  }

  // 在 (x, z) 位置爆炸，生成 count 个粒子
  explode(x, z, color, count = 30) {
    const c = new THREE.Color(color)
    for (let i = 0; i < count && this._particles.length < MAX_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 5
      this._particles.push({
        x, y: 0.3 + Math.random() * 0.5, z,
        vx: Math.cos(angle) * speed,
        vy: 1 + Math.random() * 3,
        vz: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.6,
        maxLife: 0,
        r: c.r, g: c.g, b: c.b
      })
      this._particles[this._particles.length - 1].maxLife = this._particles[this._particles.length - 1].life
    }
  }

  // 命中火花（较少粒子）
  spark(x, z, count = 12) {
    this.explode(x, z, '#ffffff', count)
  }

  update(dt) {
    const gravity = -6

    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i]
      p.life -= dt
      if (p.life <= 0) { this._particles.splice(i, 1); continue }
      p.vx *= 0.92
      p.vz *= 0.92
      p.vy += gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt
      if (p.y < 0) { p.y = 0; p.vy *= -0.3 }
    }

    // 更新 GPU 缓冲区
    const n = Math.min(this._particles.length, MAX_PARTICLES)
    for (let i = 0; i < n; i++) {
      const p = this._particles[i]
      const alpha = p.life / p.maxLife
      this._positions[i * 3] = p.x
      this._positions[i * 3 + 1] = p.y
      this._positions[i * 3 + 2] = p.z
      this._colors[i * 3] = p.r * alpha * 3     // 超亮触发 bloom
      this._colors[i * 3 + 1] = p.g * alpha * 3
      this._colors[i * 3 + 2] = p.b * alpha * 3
    }
    // 隐藏未使用的粒子
    for (let i = n; i < MAX_PARTICLES; i++) {
      this._positions[i * 3 + 1] = -100
    }

    this._geo.attributes.position.needsUpdate = true
    this._geo.attributes.color.needsUpdate = true
    this._geo.setDrawRange(0, MAX_PARTICLES)
  }
}

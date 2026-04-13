import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { ChromaticAberrationShader } from '../shaders/ChromaticAberration.js'

export class SceneManager {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.toneMapping = THREE.ReinhardToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    document.getElementById('app').prepend(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000005)
    this.scene.fog = new THREE.FogExp2(0x000010, 0.018)

    // 俯视角摄像机，略微倾斜增加立体感
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200)
    this.camera.position.set(0, 22, 12)
    this.camera.lookAt(0, 0, 0)

    // 环境光（极暗，赛博朋克氛围）
    this.scene.add(new THREE.AmbientLight(0x111133, 0.8))

    // 后处理
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.8,   // strength
      0.5,   // radius
      0.75   // threshold — 只有亮于此的物体发光
    )
    this.composer.addPass(bloom)
    this.composer.addPass(new ShaderPass(ChromaticAberrationShader))

    // 屏幕震动状态
    this._shake = 0
    this._cameraBase = new THREE.Vector3()

    window.addEventListener('resize', () => this._onResize())
  }

  // 触发屏幕震动
  shake(intensity = 0.5) {
    this._shake = Math.max(this._shake, intensity)
  }

  // 将摄像机跟随目标位置（世界坐标 x, z）
  followTarget(wx, wz) {
    this._cameraBase.set(wx, 22, wz + 12)
  }

  render(dt) {
    // 屏幕震动衰减
    if (this._shake > 0) {
      const s = this._shake
      this.camera.position.x = this._cameraBase.x + (Math.random() - 0.5) * s
      this.camera.position.y = this._cameraBase.y + (Math.random() - 0.5) * s * 0.3
      this.camera.position.z = this._cameraBase.z + (Math.random() - 0.5) * s
      this._shake *= 0.85
      if (this._shake < 0.01) this._shake = 0
    } else {
      this.camera.position.lerp(this._cameraBase, 0.1)
    }
    this.camera.lookAt(
      this._cameraBase.x,
      0,
      this._cameraBase.z - 12
    )
    this.composer.render()
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.composer.setSize(w, h)
  }
}

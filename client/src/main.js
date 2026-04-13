import { SceneManager } from './rendering/SceneManager.js'
import { ArenaRenderer } from './rendering/ArenaRenderer.js'
import { PlayerRenderer } from './rendering/PlayerRenderer.js'
import { EnemyRenderer } from './rendering/EnemyRenderer.js'
import { BulletRenderer } from './rendering/BulletRenderer.js'
import { ParticleSystem } from './rendering/ParticleSystem.js'
import { SocketClient } from './network/SocketClient.js'
import { Interpolator } from './network/Interpolator.js'
import { InputHandler } from './input/InputHandler.js'
import { HUD } from './ui/HUD.js'
import { generateMap } from './mapgen/BSPGenerator.js'

const TILE_SIZE = 2

class Game {
  constructor() {
    this.scene = new SceneManager()
    this.arena = new ArenaRenderer(this.scene.scene)
    this.particles = new ParticleSystem(this.scene.scene)
    this.hud = new HUD()
    this.net = new SocketClient()
    this.interpolator = new Interpolator()
    this.input = new InputHandler(this.scene.renderer.domElement)

    this.playerRenderer = null
    this.enemyRenderer = null
    this.bulletRenderer = null

    this.localId = null
    this.roomId = null
    this.lastState = null
    this.uTime = 0
    this.running = false

    this._setupLobby()
    this._setupNetworkHandlers()
  }

  _setupLobby() {
    document.getElementById('btnCreate').addEventListener('click', async () => {
      const name = document.getElementById('playerName').value.trim().toUpperCase() || 'GHOST'
      const result = await this.net.createRoom(name)
      if (result.ok) this._enterGame(result)
      else alert(result.error)
    })

    document.getElementById('btnJoin').addEventListener('click', async () => {
      const name = document.getElementById('playerName').value.trim().toUpperCase() || 'GHOST'
      const code = document.getElementById('roomCode').value.trim().toUpperCase()
      if (!code) { alert('Enter a room code'); return }
      const result = await this.net.joinRoom(code, name)
      if (result.ok) this._enterGame(result)
      else alert(result.error)
    })
  }

  _setupNetworkHandlers() {
    this.net.on('state', state => {
      this.lastState = state
      // 推入插值缓冲区
      for (const e of state.enemies) this.interpolator.push(e.id, e)
      for (const p of state.players) this.interpolator.push(p.id, p)
    })

    this.net.on('explosion', ({ x, y, color }) => {
      this.particles.explode(x, y, color, 40)
      this.scene.shake(0.6)
    })

    this.net.on('hit', ({ x, y }) => {
      this.particles.spark(x, y, 10)
    })

    this.net.on('matchEnd', data => {
      this.running = false
      this.hud.showEndScreen(data)
    })
  }

  _enterGame(result) {
    this.localId = this.net.getId()
    this.roomId = result.roomId
    const { seed, reactorPos, tileSize } = result.initData

    // 客户端用相同种子重建地图（与服务端完全一致）
    const mapData = generateMap(seed)

    this.playerRenderer = new PlayerRenderer(this.scene.scene, this.localId)
    this.enemyRenderer = new EnemyRenderer(this.scene.scene)
    this.bulletRenderer = new BulletRenderer(this.scene.scene)

    this.arena.build(mapData.tiles, reactorPos)

    document.getElementById('lobby').style.display = 'none'
    this.hud.show()

    this.running = true
    this._loop()
  }

  _loop() {
    let lastTime = performance.now()

    const tick = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      this.uTime += dt

      if (this.running && this.lastState) {
        // 发送输入
        this.net.sendInput(this.input.getInput())

        const state = this.lastState

        // 插值后的实体状态
        const interpEnemies = state.enemies.map(e => ({
          ...e, ...(this.interpolator.get(e.id) || e)
        }))
        const interpPlayers = state.players.map(p => ({
          ...p, ...(this.interpolator.get(p.id) || p)
        }))

        // 渲染
        this.playerRenderer.update(interpPlayers)
        this.enemyRenderer.update(interpEnemies, this.uTime)
        this.bulletRenderer.update(state.bullets)
        this.particles.update(dt)
        this.arena.update(dt, state.reactorHp / state.reactorMaxHp)

        // 摄像机跟随本地玩家
        const localPos = this.playerRenderer.getLocalPosition(interpPlayers)
        if (localPos) this.scene.followTarget(localPos.x, localPos.z)

        this.hud.update(state, this.localId, this.roomId)
      }

      this.scene.render(dt)
      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }
}

// 启动
new Game()

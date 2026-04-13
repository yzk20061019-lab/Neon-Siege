import { generateMap, MAP_W, MAP_H } from './mapgen/BSPGenerator.js'
import { PathGrid } from './pathfinding/PathGrid.js'
import { aStar } from './pathfinding/AStar.js'

const TILE_SIZE = 2          // 世界单位/格
const PLAYER_SPEED = 8       // 单位/秒
const BULLET_SPEED = 20
const BULLET_RADIUS = 0.15
const PLAYER_RADIUS = 0.4
const ENEMY_RADIUS = 0.35
const ENEMY_SPEED = 3.5
const ENEMY_DAMAGE = 8       // 每秒
const BULLET_DAMAGE = 25
const REACTOR_HP = 500
const MATCH_DURATION = 180   // 秒
const ENEMY_RECALC_MS = 600  // A* 重算间隔

const ENEMY_COLORS = ['#ff2060', '#ff6020', '#a020ff', '#ff20a0']

let eidCounter = 0
let bidCounter = 0

function worldToGrid(wx, wy) {
  return { x: Math.floor(wx / TILE_SIZE), y: Math.floor(wy / TILE_SIZE) }
}
function gridToWorld(gx, gy) {
  return { x: (gx + 0.5) * TILE_SIZE, y: (gy + 0.5) * TILE_SIZE }
}

export class GameRoom {
  constructor(id, seed, io) {
    this.id = id
    this.seed = seed
    this.io = io
    this.players = new Map()   // socketId -> PlayerState
    this.enemies = []
    this.bullets = []
    this.tick = 0
    this.lastTime = Date.now()
    this.interval = null
    this.phase = 'waiting'     // waiting | playing | ended

    const mapData = generateMap(seed)
    this.tiles = mapData.tiles
    this.rooms = mapData.rooms
    this.spawnPoints = mapData.spawnPoints
    this.reactorPos = mapData.reactorPos
    this.reactorHp = REACTOR_HP
    this.grid = new PathGrid(this.tiles)
    this.matchTimer = MATCH_DURATION
  }

  addPlayer(socketId, name) {
    const spawnIdx = this.players.size % 4
    const sp = this.spawnPoints[spawnIdx]
    const wx = sp.x * TILE_SIZE, wy = sp.y * TILE_SIZE
    this.players.set(socketId, {
      id: socketId, name,
      x: wx, y: wy,
      vx: 0, vy: 0,
      angle: 0,
      hp: 100, maxHp: 100,
      score: 0,
      alive: true,
      shootCooldown: 0,
      inputSeq: 0,
      keys: { w: false, a: false, s: false, d: false },
      mouseAngle: 0,
      shooting: false
    })
  }

  removePlayer(socketId) {
    this.players.delete(socketId)
    if (this.players.size === 0 && this.interval) this.stop()
  }

  start() {
    this.phase = 'playing'
    this._spawnEnemyWave(8)
    this.interval = setInterval(() => this._tick(), 50)
  }

  stop() {
    if (this.interval) { clearInterval(this.interval); this.interval = null }
  }

  handleInput(socketId, input) {
    const p = this.players.get(socketId)
    if (!p || !p.alive) return
    p.keys = input.keys
    p.mouseAngle = input.mouseAngle
    p.shooting = input.shooting
    p.inputSeq = input.seq
  }

  _tick() {
    const now = Date.now()
    const dt = Math.min((now - this.lastTime) / 1000, 0.1)
    this.lastTime = now
    this.tick++

    if (this.phase !== 'playing') return

    this.matchTimer -= dt
    if (this.matchTimer <= 0) { this._endMatch('timeout'); return }

    this._updatePlayers(dt)
    this._updateEnemies(dt)
    this._updateBullets(dt)
    this._checkReactor(dt)
    this._spawnEnemiesIfNeeded()
    this._broadcast()
  }

  _updatePlayers(dt) {
    for (const [, p] of this.players) {
      if (!p.alive) continue

      // 移动
      let dx = 0, dy = 0
      if (p.keys.w) dy -= 1
      if (p.keys.s) dy += 1
      if (p.keys.a) dx -= 1
      if (p.keys.d) dx += 1
      const len = Math.hypot(dx, dy)
      if (len > 0) { dx /= len; dy /= len }

      const nx = p.x + dx * PLAYER_SPEED * dt
      const ny = p.y + dy * PLAYER_SPEED * dt
      if (this._walkable(nx, p.y, PLAYER_RADIUS)) p.x = nx
      if (this._walkable(p.x, ny, PLAYER_RADIUS)) p.y = ny
      p.angle = p.mouseAngle

      // 射击
      p.shootCooldown -= dt
      if (p.shooting && p.shootCooldown <= 0) {
        p.shootCooldown = 0.12
        this._spawnBullet(p.x, p.y, p.mouseAngle, p.id, 'player')
      }
    }
  }

  _updateEnemies(dt) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]
      if (!e.alive) { this.enemies.splice(i, 1); continue }

      // 找最近玩家
      let target = null, minDist = Infinity
      for (const [, p] of this.players) {
        if (!p.alive) continue
        const d = Math.hypot(p.x - e.x, p.y - e.y)
        if (d < minDist) { minDist = d; target = p }
      }
      if (!target) continue

      // A* 寻路（错开重算，每个敌人独立计时）
      e.pathTimer += dt * 1000
      if (e.pathTimer >= ENEMY_RECALC_MS || e.path.length === 0) {
        e.pathTimer = 0
        const sg = worldToGrid(e.x, e.y)
        const tg = worldToGrid(target.x, target.y)
        e.path = aStar(this.grid, sg, tg)
      }

      // 沿路径移动
      if (e.path.length > 0) {
        const next = gridToWorld(e.path[0].x, e.path[0].y)
        const dx = next.x - e.x, dy = next.y - e.y
        const dist = Math.hypot(dx, dy)
        if (dist < 0.15) {
          e.path.shift()
        } else {
          const speed = ENEMY_SPEED * dt
          e.x += (dx / dist) * speed
          e.y += (dy / dist) * speed
        }
      }

      // 近战伤害
      if (minDist < PLAYER_RADIUS + ENEMY_RADIUS + 0.1) {
        target.hp -= ENEMY_DAMAGE * dt
        if (target.hp <= 0) { target.hp = 0; target.alive = false }
      }
    }
  }

  _updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.life -= dt

      if (b.life <= 0 || !this._walkable(b.x, b.y, BULLET_RADIUS)) {
        this.bullets.splice(i, 1)
        continue
      }

      // 命中敌人
      if (b.owner === 'player') {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j]
          if (!e.alive) continue
          if (Math.hypot(b.x - e.x, b.y - e.y) < BULLET_RADIUS + ENEMY_RADIUS) {
            e.hp -= BULLET_DAMAGE
            this.bullets.splice(i, 1)
            if (e.hp <= 0) {
              e.alive = false
              const shooter = this.players.get(b.shooterId)
              if (shooter) shooter.score += 100
              this.io.to(this.id).emit('explosion', { x: e.x, y: e.y, color: e.color })
            } else {
              this.io.to(this.id).emit('hit', { x: b.x, y: b.y })
            }
            break
          }
        }
      }
    }
  }

  _checkReactor(dt) {
    // 玩家靠近反应堆时造成伤害（攻击目标）
    const rx = this.reactorPos.x * TILE_SIZE
    const ry = this.reactorPos.y * TILE_SIZE
    for (const [, p] of this.players) {
      if (!p.alive) continue
      if (p.shooting && Math.hypot(p.x - rx, p.y - ry) < 3) {
        this.reactorHp -= BULLET_DAMAGE * dt * 2
        if (this.reactorHp <= 0) {
          this.reactorHp = 0
          this._endMatch('reactor')
          return
        }
      }
    }
  }

  _spawnBullet(x, y, angle, shooterId, owner) {
    this.bullets.push({
      id: bidCounter++,
      x, y,
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
      life: 2.5,
      shooterId, owner
    })
  }

  _spawnEnemyWave(count) {
    const nonSpawnRooms = this.rooms.filter((_, i) => i > 0)
    for (let i = 0; i < count; i++) {
      const room = nonSpawnRooms[i % nonSpawnRooms.length]
      const gx = room.x + Math.floor(room.w / 2)
      const gy = room.y + Math.floor(room.h / 2)
      const { x, y } = gridToWorld(gx, gy)
      this.enemies.push({
        id: eidCounter++,
        x, y,
        hp: 60, maxHp: 60,
        alive: true,
        path: [],
        pathTimer: Math.random() * ENEMY_RECALC_MS, // 错开初始重算
        color: ENEMY_COLORS[i % ENEMY_COLORS.length]
      })
    }
  }

  _spawnEnemiesIfNeeded() {
    if (this.tick % 200 === 0 && this.enemies.filter(e => e.alive).length < 12) {
      this._spawnEnemyWave(4)
    }
  }

  _walkable(wx, wy, radius) {
    // 检查四个角点
    const offsets = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
    for (const [ox, oy] of offsets) {
      const g = worldToGrid(wx + ox * radius, wy + oy * radius)
      if (!this.grid.isWalkable(g.x, g.y)) return false
    }
    return true
  }

  _endMatch(reason) {
    this.phase = 'ended'
    this.stop()
    this.io.to(this.id).emit('matchEnd', {
      reason,
      scores: [...this.players.values()].map(p => ({ name: p.name, score: p.score }))
    })
  }

  _broadcast() {
    const state = {
      tick: this.tick,
      timer: Math.ceil(this.matchTimer),
      reactorHp: Math.ceil(this.reactorHp),
      reactorMaxHp: REACTOR_HP,
      players: [...this.players.values()].map(p => ({
        id: p.id, name: p.name,
        x: p.x, y: p.y, angle: p.angle,
        hp: p.hp, maxHp: p.maxHp,
        score: p.score, alive: p.alive,
        seq: p.inputSeq
      })),
      enemies: this.enemies.filter(e => e.alive).map(e => ({
        id: e.id, x: e.x, y: e.y,
        hp: e.hp, maxHp: e.maxHp, color: e.color
      })),
      bullets: this.bullets.map(b => ({ id: b.id, x: b.x, y: b.y }))
    }
    this.io.to(this.id).emit('state', state)
  }

  getInitData() {
    return {
      seed: this.seed,
      reactorPos: this.reactorPos,
      spawnPoints: this.spawnPoints,
      tileSize: TILE_SIZE
    }
  }
}

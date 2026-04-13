import { createRNG, randInt } from './RNG.js'

export const TILE = { WALL: 1, FLOOR: 0 }
export const MAP_W = 60
export const MAP_H = 60
const MIN_ROOM = 7
const MAX_DEPTH = 4

class BSPNode {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h
    this.left = null; this.right = null
    this.room = null // { x, y, w, h }
  }
}

function carveRoom(tiles, room) {
  for (let ry = room.y; ry < room.y + room.h; ry++)
    for (let rx = room.x; rx < room.x + room.w; rx++)
      tiles[ry * MAP_W + rx] = TILE.FLOOR
}

function carveCorridor(tiles, x1, y1, x2, y2, rng) {
  // L 形走廊，随机决定先横后竖还是先竖后横
  if (rng() > 0.5) {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
      tiles[y1 * MAP_W + x] = TILE.FLOOR
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      tiles[y * MAP_W + x2] = TILE.FLOOR
  } else {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      tiles[y * MAP_W + x1] = TILE.FLOOR
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
      tiles[y2 * MAP_W + x] = TILE.FLOOR
  }
}

function getRoomCenter(room) {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2)
  }
}

function getLeafRoom(node) {
  if (node.room) return node.room
  const l = node.left ? getLeafRoom(node.left) : null
  const r = node.right ? getLeafRoom(node.right) : null
  return l || r
}

function split(node, depth, rng, tiles) {
  if (depth === 0 || node.w < MIN_ROOM * 2 + 2 || node.h < MIN_ROOM * 2 + 2) {
    // 叶节点：在此区域内生成一个房间
    const rw = randInt(rng, MIN_ROOM, node.w - 2)
    const rh = randInt(rng, MIN_ROOM, node.h - 2)
    const rx = node.x + 1 + randInt(rng, 0, node.w - rw - 1)
    const ry = node.y + 1 + randInt(rng, 0, node.h - rh - 1)
    node.room = { x: rx, y: ry, w: rw, h: rh }
    carveRoom(tiles, node.room)
    return
  }

  // 根据长宽比决定切割方向
  const horizontal = node.h > node.w
    ? true
    : node.w > node.h
    ? false
    : rng() > 0.5

  if (horizontal) {
    const splitY = randInt(rng, MIN_ROOM + 1, node.h - MIN_ROOM - 1)
    node.left = new BSPNode(node.x, node.y, node.w, splitY)
    node.right = new BSPNode(node.x, node.y + splitY, node.w, node.h - splitY)
  } else {
    const splitX = randInt(rng, MIN_ROOM + 1, node.w - MIN_ROOM - 1)
    node.left = new BSPNode(node.x, node.y, splitX, node.h)
    node.right = new BSPNode(node.x + splitX, node.y, node.w - splitX, node.h)
  }

  split(node.left, depth - 1, rng, tiles)
  split(node.right, depth - 1, rng, tiles)

  // 连接两个子树中的房间
  const roomA = getLeafRoom(node.left)
  const roomB = getLeafRoom(node.right)
  if (roomA && roomB) {
    const ca = getRoomCenter(roomA)
    const cb = getRoomCenter(roomB)
    carveCorridor(tiles, ca.x, ca.y, cb.x, cb.y, rng)
  }
}

// 洪水填充验证连通性，返回可达格子数
function floodFill(tiles, startX, startY) {
  const visited = new Uint8Array(MAP_W * MAP_H)
  const stack = [[startX, startY]]
  let count = 0
  while (stack.length) {
    const [x, y] = stack.pop()
    const idx = y * MAP_W + x
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue
    if (visited[idx] || tiles[idx] === TILE.WALL) continue
    visited[idx] = 1
    count++
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }
  return count
}

// 收集所有叶节点房间
function collectRooms(node, rooms) {
  if (node.room) { rooms.push(node.room); return }
  if (node.left) collectRooms(node.left, rooms)
  if (node.right) collectRooms(node.right, rooms)
}

/**
 * 生成地图
 * @param {number} seed
 * @returns {{ tiles: Uint8Array, rooms: Array, spawnPoints: Array, reactorPos: {x,y} }}
 */
export function generateMap(seed) {
  const rng = createRNG(seed)
  const tiles = new Uint8Array(MAP_W * MAP_H).fill(TILE.WALL)

  const root = new BSPNode(0, 0, MAP_W, MAP_H)
  split(root, MAX_DEPTH, rng, tiles)

  const rooms = []
  collectRooms(root, rooms)

  // 找中心房间作为反应堆位置
  const cx = MAP_W / 2, cy = MAP_H / 2
  rooms.sort((a, b) => {
    const da = Math.hypot(a.x + a.w / 2 - cx, a.y + a.h / 2 - cy)
    const db = Math.hypot(b.x + b.w / 2 - cx, b.y + b.h / 2 - cy)
    return da - db
  })
  const reactorRoom = rooms[0]
  const reactorPos = getRoomCenter(reactorRoom)

  // 四个角落的房间作为玩家出生点
  const corners = [
    { x: 0, y: 0 }, { x: MAP_W, y: 0 },
    { x: 0, y: MAP_H }, { x: MAP_W, y: MAP_H }
  ]
  const spawnRooms = corners.map(corner => {
    return rooms.slice(1).reduce((best, r) => {
      const dc = Math.hypot(getRoomCenter(r).x - corner.x, getRoomCenter(r).y - corner.y)
      const db = Math.hypot(getRoomCenter(best).x - corner.x, getRoomCenter(best).y - corner.y)
      return dc < db ? r : best
    })
  })
  const spawnPoints = spawnRooms.map(r => getRoomCenter(r))

  // 验证连通性
  const firstFloor = tiles.indexOf(TILE.FLOOR)
  const fx = firstFloor % MAP_W, fy = Math.floor(firstFloor / MAP_W)
  const reachable = floodFill(tiles, fx, fy)
  const totalFloor = tiles.filter(t => t === TILE.FLOOR).length
  if (reachable < totalFloor * 0.9) {
    // 极少数情况下连通性不足，换种子重试
    return generateMap(seed + 1)
  }

  return { tiles, rooms, spawnPoints, reactorPos }
}

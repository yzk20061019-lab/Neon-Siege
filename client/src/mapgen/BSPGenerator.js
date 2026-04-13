// 客户端版本 — 与服务端 BSPGenerator.js 逻辑完全相同
// 服务端只发送种子，客户端用相同算法重建地图，节省带宽

export function createRNG(seed) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min)) + min
}

export const TILE = { WALL: 1, FLOOR: 0 }
export const MAP_W = 60
export const MAP_H = 60
const MIN_ROOM = 7
const MAX_DEPTH = 4

class BSPNode {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h
    this.left = null; this.right = null; this.room = null
  }
}

function carveRoom(tiles, room) {
  for (let ry = room.y; ry < room.y + room.h; ry++)
    for (let rx = room.x; rx < room.x + room.w; rx++)
      tiles[ry * MAP_W + rx] = TILE.FLOOR
}

function carveCorridor(tiles, x1, y1, x2, y2, rng) {
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
  return { x: Math.floor(room.x + room.w / 2), y: Math.floor(room.y + room.h / 2) }
}

function getLeafRoom(node) {
  if (node.room) return node.room
  const l = node.left ? getLeafRoom(node.left) : null
  const r = node.right ? getLeafRoom(node.right) : null
  return l || r
}

function split(node, depth, rng, tiles) {
  if (depth === 0 || node.w < MIN_ROOM * 2 + 2 || node.h < MIN_ROOM * 2 + 2) {
    const rw = randInt(rng, MIN_ROOM, node.w - 2)
    const rh = randInt(rng, MIN_ROOM, node.h - 2)
    const rx = node.x + 1 + randInt(rng, 0, node.w - rw - 1)
    const ry = node.y + 1 + randInt(rng, 0, node.h - rh - 1)
    node.room = { x: rx, y: ry, w: rw, h: rh }
    carveRoom(tiles, node.room)
    return
  }
  const horizontal = node.h > node.w ? true : node.w > node.h ? false : rng() > 0.5
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
  const roomA = getLeafRoom(node.left)
  const roomB = getLeafRoom(node.right)
  if (roomA && roomB) {
    const ca = getRoomCenter(roomA), cb = getRoomCenter(roomB)
    carveCorridor(tiles, ca.x, ca.y, cb.x, cb.y, rng)
  }
}

function collectRooms(node, rooms) {
  if (node.room) { rooms.push(node.room); return }
  if (node.left) collectRooms(node.left, rooms)
  if (node.right) collectRooms(node.right, rooms)
}

export function generateMap(seed) {
  const rng = createRNG(seed)
  const tiles = new Uint8Array(MAP_W * MAP_H).fill(TILE.WALL)
  const root = new BSPNode(0, 0, MAP_W, MAP_H)
  split(root, MAX_DEPTH, rng, tiles)
  const rooms = []
  collectRooms(root, rooms)
  const cx = MAP_W / 2, cy = MAP_H / 2
  rooms.sort((a, b) => {
    const da = Math.hypot(a.x + a.w / 2 - cx, a.y + a.h / 2 - cy)
    const db = Math.hypot(b.x + b.w / 2 - cx, b.y + b.h / 2 - cy)
    return da - db
  })
  const reactorPos = getRoomCenter(rooms[0])
  const corners = [{ x: 0, y: 0 }, { x: MAP_W, y: 0 }, { x: 0, y: MAP_H }, { x: MAP_W, y: MAP_H }]
  const spawnPoints = corners.map(corner =>
    rooms.slice(1).reduce((best, r) => {
      const dc = Math.hypot(getRoomCenter(r).x - corner.x, getRoomCenter(r).y - corner.y)
      const db = Math.hypot(getRoomCenter(best).x - corner.x, getRoomCenter(best).y - corner.y)
      return dc < db ? r : best
    })
  ).map(r => getRoomCenter(r))
  return { tiles, rooms, spawnPoints, reactorPos }
}

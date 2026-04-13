import { TILE, MAP_W, MAP_H } from '../mapgen/BSPGenerator.js'

export class PathGrid {
  constructor(tiles) {
    this.tiles = tiles
    this.w = MAP_W
    this.h = MAP_H
  }

  isWalkable(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false
    return this.tiles[y * this.w + x] === TILE.FLOOR
  }

  // 八方向邻居，对角线需要两个基础方向都可走（避免穿墙角）
  getNeighbors(x, y) {
    const result = []
    const dirs = [
      [0, 1, false], [0, -1, false], [1, 0, false], [-1, 0, false],
      [1, 1, true], [1, -1, true], [-1, 1, true], [-1, -1, true]
    ]
    for (const [dx, dy, diag] of dirs) {
      const nx = x + dx, ny = y + dy
      if (!this.isWalkable(nx, ny)) continue
      if (diag && (!this.isWalkable(x + dx, y) || !this.isWalkable(x, y + dy))) continue
      result.push({ x: nx, y: ny, cost: diag ? Math.SQRT2 : 1 })
    }
    return result
  }
}

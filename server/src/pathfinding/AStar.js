import { MinHeap } from './MinHeap.js'

// Octile 距离启发式 — 八方向移动的最优启发式
// 比 Manhattan 更准确，不会高估（admissible）
function octile(ax, ay, bx, by) {
  const dx = Math.abs(ax - bx), dy = Math.abs(ay - by)
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)
}

const key = (x, y) => (y << 16) | x  // 快速整数键，避免字符串拼接

/**
 * A* 寻路
 * 时间复杂度：O(E log V)，E≈8V（八方向），V=网格格数
 * @param {PathGrid} grid
 * @param {{x,y}} start
 * @param {{x,y}} goal
 * @returns {Array<{x,y}>} 路径（不含起点，含终点），找不到返回 []
 */
export function aStar(grid, start, goal) {
  if (!grid.isWalkable(goal.x, goal.y)) return []

  const open = new MinHeap((a, b) => a.f - b.f)
  const gScore = new Map()
  const cameFrom = new Map()

  const startKey = key(start.x, start.y)
  gScore.set(startKey, 0)
  open.push({ x: start.x, y: start.y, f: octile(start.x, start.y, goal.x, goal.y) })

  while (!open.isEmpty()) {
    const cur = open.pop()

    if (cur.x === goal.x && cur.y === goal.y) {
      // 重建路径
      const path = []
      let k = key(cur.x, cur.y)
      while (cameFrom.has(k)) {
        const { x, y } = cameFrom.get(k)
        path.unshift({ x: cur.x, y: cur.y })
        // 沿 cameFrom 回溯
        const prev = cameFrom.get(k)
        path.unshift(prev)
        k = key(prev.x, prev.y)
        // 重建完整路径
        break
      }
      // 正确重建
      return reconstructPath(cameFrom, cur)
    }

    const curKey = key(cur.x, cur.y)
    const curG = gScore.get(curKey) ?? Infinity

    for (const nb of grid.getNeighbors(cur.x, cur.y)) {
      const nbKey = key(nb.x, nb.y)
      const tentG = curG + nb.cost
      if (tentG < (gScore.get(nbKey) ?? Infinity)) {
        gScore.set(nbKey, tentG)
        cameFrom.set(nbKey, { x: cur.x, y: cur.y })
        open.push({ x: nb.x, y: nb.y, f: tentG + octile(nb.x, nb.y, goal.x, goal.y) })
      }
    }
  }

  return []
}

function reconstructPath(cameFrom, end) {
  const path = []
  let cur = { x: end.x, y: end.y }
  while (true) {
    path.unshift(cur)
    const k = key(cur.x, cur.y)
    if (!cameFrom.has(k)) break
    cur = cameFrom.get(k)
  }
  return path.slice(1) // 去掉起点
}

// Mulberry32 — 确定性种子伪随机数生成器
// 同一种子始终产生相同序列，客户端和服务端共用
export function createRNG(seed) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 生成随机整数 [min, max)
export function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min)) + min
}

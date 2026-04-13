// 实体插值缓冲区 — 将远程实体渲染延迟 100ms
// 使 20Hz 服务器更新看起来流畅
const BUFFER_MS = 100

export class Interpolator {
  constructor() {
    this._buffers = new Map()  // entityId -> [{time, state}]
  }

  push(id, state) {
    if (!this._buffers.has(id)) this._buffers.set(id, [])
    const buf = this._buffers.get(id)
    buf.push({ time: Date.now(), state })
    // 只保留最近 10 帧
    if (buf.length > 10) buf.shift()
  }

  get(id) {
    const buf = this._buffers.get(id)
    if (!buf || buf.length === 0) return null

    const renderTime = Date.now() - BUFFER_MS

    // 找到 renderTime 前后的两帧
    let before = null, after = null
    for (let i = 0; i < buf.length; i++) {
      if (buf[i].time <= renderTime) before = buf[i]
      else { after = buf[i]; break }
    }

    if (!before) return buf[0].state
    if (!after) return before.state

    // 线性插值
    const t = (renderTime - before.time) / (after.time - before.time)
    return {
      ...before.state,
      x: before.state.x + (after.state.x - before.state.x) * t,
      y: before.state.y + (after.state.y - before.state.y) * t,
    }
  }

  remove(id) { this._buffers.delete(id) }

  clear() { this._buffers.clear() }
}

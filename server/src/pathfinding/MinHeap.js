// 二叉最小堆 — A* open set 的核心数据结构
// 时间复杂度：push/pop O(log n)，peek O(1)
export class MinHeap {
  constructor(compareFn) {
    this.data = []
    this.compare = compareFn
  }

  get size() { return this.data.length }
  isEmpty() { return this.data.length === 0 }
  peek() { return this.data[0] }

  push(item) {
    this.data.push(item)
    this._bubbleUp(this.data.length - 1)
  }

  pop() {
    const top = this.data[0]
    const last = this.data.pop()
    if (this.data.length > 0) {
      this.data[0] = last
      this._sinkDown(0)
    }
    return top
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.compare(this.data[i], this.data[parent]) < 0) {
        ;[this.data[i], this.data[parent]] = [this.data[parent], this.data[i]]
        i = parent
      } else break
    }
  }

  _sinkDown(i) {
    const n = this.data.length
    while (true) {
      let smallest = i
      const l = 2 * i + 1, r = 2 * i + 2
      if (l < n && this.compare(this.data[l], this.data[smallest]) < 0) smallest = l
      if (r < n && this.compare(this.data[r], this.data[smallest]) < 0) smallest = r
      if (smallest === i) break
      ;[this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]]
      i = smallest
    }
  }
}

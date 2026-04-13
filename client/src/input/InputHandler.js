export class InputHandler {
  constructor(canvas) {
    this.keys = { w: false, a: false, s: false, d: false }
    this.mouseAngle = 0
    this.shooting = false
    this._canvas = canvas
    this._seq = 0

    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase()
      if (k in this.keys) this.keys[k] = true
    })
    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase()
      if (k in this.keys) this.keys[k] = false
    })
    window.addEventListener('mousedown', e => { if (e.button === 0) this.shooting = true })
    window.addEventListener('mouseup', e => { if (e.button === 0) this.shooting = false })
    window.addEventListener('mousemove', e => this._onMouseMove(e))
    window.addEventListener('contextmenu', e => e.preventDefault())
  }

  _onMouseMove(e) {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2
    this.mouseAngle = Math.atan2(e.clientY - cy, e.clientX - cx)
  }

  getInput() {
    return {
      seq: this._seq++,
      keys: { ...this.keys },
      mouseAngle: this.mouseAngle,
      shooting: this.shooting
    }
  }
}

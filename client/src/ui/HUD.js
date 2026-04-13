export class HUD {
  constructor() {
    this._el = document.getElementById('hud')
    this._el.innerHTML = `
      <div id="hud-score" style="position:absolute;top:20px;left:24px;color:#0ff;font-size:1.4rem;font-weight:700;letter-spacing:0.1em;text-shadow:0 0 12px #0ff"></div>
      <div id="hud-timer" style="position:absolute;top:20px;left:50%;transform:translateX(-50%);color:#fff;font-size:1.1rem;letter-spacing:0.2em;text-shadow:0 0 8px #fff8"></div>
      <div id="hud-reactor" style="position:absolute;top:52px;left:50%;transform:translateX(-50%);color:#fa0;font-size:0.75rem;letter-spacing:0.15em;text-shadow:0 0 8px #fa08"></div>
      <div id="hud-hp" style="position:absolute;bottom:28px;left:24px">
        <div style="color:#0ff;font-size:0.7rem;letter-spacing:0.15em;margin-bottom:4px;text-shadow:0 0 8px #0ff">SHIELD</div>
        <div id="hud-hp-bar" style="width:160px;height:8px;background:#0ff2;border:1px solid #0ff4;position:relative">
          <div id="hud-hp-fill" style="height:100%;background:#0ff;box-shadow:0 0 8px #0ff;transition:width 0.1s"></div>
        </div>
      </div>
      <div id="hud-room" style="position:absolute;bottom:28px;right:24px;color:#0ff4;font-size:0.7rem;letter-spacing:0.1em"></div>
      <div id="hud-scoreboard" style="position:absolute;top:20px;right:24px;color:#fff;font-size:0.75rem;line-height:1.8;text-align:right"></div>
    `
  }

  show() { this._el.style.display = 'block' }
  hide() { this._el.style.display = 'none' }

  update(state, localId, roomId) {
    const local = state.players.find(p => p.id === localId)

    if (local) {
      document.getElementById('hud-score').textContent = `SCORE  ${local.score}`
      const hpPct = Math.max(0, (local.hp / local.maxHp) * 100)
      document.getElementById('hud-hp-fill').style.width = hpPct + '%'
      const hue = hpPct > 50 ? 180 : hpPct > 25 ? 60 : 0
      document.getElementById('hud-hp-fill').style.background = `hsl(${hue},100%,60%)`
      document.getElementById('hud-hp-fill').style.boxShadow = `0 0 8px hsl(${hue},100%,60%)`
    }

    const mins = Math.floor(state.timer / 60)
    const secs = String(state.timer % 60).padStart(2, '0')
    document.getElementById('hud-timer').textContent = `${mins}:${secs}`

    const reactorPct = Math.round((state.reactorHp / state.reactorMaxHp) * 100)
    document.getElementById('hud-reactor').textContent = `REACTOR  ${reactorPct}%`

    document.getElementById('hud-room').textContent = `ROOM: ${roomId}`

    const board = state.players
      .slice().sort((a, b) => b.score - a.score)
      .map(p => `<div style="color:${p.id === localId ? '#0ff' : '#fff8'}">${p.name}  ${p.score}</div>`)
      .join('')
    document.getElementById('hud-scoreboard').innerHTML = board
  }

  showEndScreen(data) {
    const scores = data.scores.sort((a, b) => b.score - a.score)
    const reason = data.reason === 'reactor' ? 'REACTOR DESTROYED' : 'TIME UP'
    this._el.innerHTML = `
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#0ff">
        <div style="font-size:2.5rem;font-weight:900;letter-spacing:0.2em;text-shadow:0 0 30px #0ff;margin-bottom:1rem">${reason}</div>
        <div style="font-size:0.9rem;letter-spacing:0.2em;margin-bottom:2rem;color:#0af">FINAL SCORES</div>
        ${scores.map((s, i) => `
          <div style="font-size:${i === 0 ? '1.3rem' : '1rem'};color:${i === 0 ? '#ff0' : '#fff'};margin:0.3rem 0;text-shadow:0 0 ${i === 0 ? 20 : 8}px currentColor">
            ${i + 1}. ${s.name}  —  ${s.score}
          </div>
        `).join('')}
        <div style="margin-top:2rem;font-size:0.75rem;color:#0ff6;letter-spacing:0.2em">REFRESH TO PLAY AGAIN</div>
      </div>
    `
  }
}

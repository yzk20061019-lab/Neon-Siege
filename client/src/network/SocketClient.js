import { io } from 'socket.io-client'

export class SocketClient {
  constructor() {
    this.socket = io()
    this.localId = this.socket.id
    this._handlers = {}

    this.socket.on('connect', () => {
      this.localId = this.socket.id
      this._emit('connect')
    })
    this.socket.on('state', data => this._emit('state', data))
    this.socket.on('explosion', data => this._emit('explosion', data))
    this.socket.on('hit', data => this._emit('hit', data))
    this.socket.on('matchEnd', data => this._emit('matchEnd', data))
  }

  on(event, fn) {
    this._handlers[event] = fn
  }

  _emit(event, data) {
    if (this._handlers[event]) this._handlers[event](data)
  }

  createRoom(playerName) {
    return new Promise(resolve => {
      this.socket.emit('createRoom', playerName, resolve)
    })
  }

  joinRoom(roomId, playerName) {
    return new Promise(resolve => {
      this.socket.emit('joinRoom', { roomId, playerName }, resolve)
    })
  }

  sendInput(input) {
    this.socket.emit('input', input)
  }

  getId() { return this.socket.id }
}

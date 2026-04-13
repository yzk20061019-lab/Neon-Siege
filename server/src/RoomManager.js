import { GameRoom } from './GameRoom.js'

const ROOM_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function genRoomId() {
  let id = ''
  for (let i = 0; i < 6; i++)
    id += ROOM_ID_CHARS[Math.floor(Math.random() * ROOM_ID_CHARS.length)]
  return id
}

export class RoomManager {
  constructor(io) {
    this.io = io
    this.rooms = new Map()  // roomId -> GameRoom
    this.playerRoom = new Map()  // socketId -> roomId
  }

  createRoom() {
    let id
    do { id = genRoomId() } while (this.rooms.has(id))
    const seed = Math.floor(Math.random() * 0xFFFFFF)
    const room = new GameRoom(id, seed, this.io)
    this.rooms.set(id, room)
    return room
  }

  getRoom(id) { return this.rooms.get(id) }

  joinRoom(socket, roomId, playerName) {
    const room = this.rooms.get(roomId)
    if (!room) return { error: 'Room not found' }
    if (room.players.size >= 4) return { error: 'Room full' }
    if (room.phase === 'ended') return { error: 'Match ended' }

    socket.join(roomId)
    room.addPlayer(socket.id, playerName || 'GHOST')
    this.playerRoom.set(socket.id, roomId)

    // 当第一个玩家加入时启动游戏
    if (room.phase === 'waiting') room.start()

    return { ok: true, roomId, initData: room.getInitData() }
  }

  leaveRoom(socketId) {
    const roomId = this.playerRoom.get(socketId)
    if (!roomId) return
    const room = this.rooms.get(roomId)
    if (room) {
      room.removePlayer(socketId)
      if (room.players.size === 0) {
        room.stop()
        this.rooms.delete(roomId)
      }
    }
    this.playerRoom.delete(socketId)
  }

  handleInput(socketId, input) {
    const roomId = this.playerRoom.get(socketId)
    if (!roomId) return
    const room = this.rooms.get(roomId)
    if (room) room.handleInput(socketId, input)
  }
}

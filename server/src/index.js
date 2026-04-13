import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { RoomManager } from './RoomManager.js'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' }
})

const rooms = new RoomManager(io)

io.on('connection', socket => {
  console.log(`[+] ${socket.id} connected`)

  socket.on('createRoom', (playerName, cb) => {
    const room = rooms.createRoom()
    const result = rooms.joinRoom(socket, room.id, playerName)
    cb(result)
  })

  socket.on('joinRoom', ({ roomId, playerName }, cb) => {
    const result = rooms.joinRoom(socket, roomId, playerName)
    cb(result)
  })

  socket.on('input', input => {
    rooms.handleInput(socket.id, input)
  })

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id} disconnected`)
    rooms.leaveRoom(socket.id)
  })
})

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log(`Neon Siege server running on port ${PORT}`)
})

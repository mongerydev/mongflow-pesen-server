const { Server } = require('socket.io')

global.socketio = null

const connectSocket = (server) => {
    socketio = new Server(server, {
        cors: {
            origin:[process.env.CLIENT_ENDPOINT, process.env.CLIENT_ENDPOINT_2]
        }
    })
    console.log('Socket Connection is successful...')

    socketio.on('connection', (socket) => {
        console.log('New Connected...', socket.id)
    })
}

module.exports = {
    connectSocket
}

const { connectDB } = require('./db')
const { connectSocket } = require('./socket')

module.exports = async (server) => {
    console.log("The obtained server object is:", server);
    connectDB()
    connectSocket(server)
}

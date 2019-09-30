const yargs = require('yargs');

const options = yargs
  .usage('Usage: -p <server-port>')
  .option('p', {
    alias: 'port',
    describe: 'Port to connect to of the Diffie-Hellman server',
    type: 'int',
    demandOption: true })
  .option('m', {
    alias: 'message',
    describe: 'the message for the server to output with',
    type: 'string',
    demandOption: true
  })
  .argv;

console.log('listening on port ', options.port)

const app = require('http').createServer(handler);

const io = require('socket.io')(app);

app.listen(options.port);

function handler (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('hi there');
  res.end();

  io.on('connection', socket => {
    console.log(`new client connected: ${socket.id}`)
    socket.on('no_encryption', data => {
      socket.emit('no_encryption_response', { text: options.message });
    });
    socket.on('asymetric', data => {
      socket.emit('asymetric_response', { text: options.message });
    })
  });
}
const symmetric = require('../symmetric');
const hellman = require('../hellman');
const yargs = require('yargs');

const options = yargs
  .usage('Usage: -p <server-port>')
  .option('p', {
    alias: 'port',
    describe: 'Port to connect to of the Diffie-Hellman server',
    type: 'int',
    demandOption: true,
  })
  .option('m', {
    alias: 'message',
    describe: 'the message for the server to output with',
    type: 'string',
    demandOption: true,
  }).argv;

console.log('listening on port ', options.port);

const app = require('http').createServer(handler);

const io = require('socket.io')(app);

const symmetricKey = symmetric.getSuperSecretKey();

io.on('connection', socket => {
  console.log(
    `new client connected: ${socket.id}\nwaiting for diffie-hellman init`,
  );

  const prime = hellman.getPrime();
  console.log(prime);
  const coPrime = hellman.getPrimitiveRoot(prime);
  const partialKey = hellman.generatePartialKey(prime, coPrime);
  // console.log(prime);
  // send the client our computed partial key
  socket.emit('init-shared-key', {
    P: prime,
    G: coPrime,
    A: partialKey,
  });

  // wait for the clients reply before we construct our key
  socket.on('partial-key', data => {
    const clientPartial = data.B;
    const clientDHKey = hellman.computeKey(clientPartial, prime);
    console.log('initialised key, enabling channels');

    enableChannels(socket, clientDHKey);
  });
});

app.listen(options.port);

function handler(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('Basic Diffie-Hellman Example');
  res.end();
}

function enableChannels(socket, clientDHKey) {
  socket.on('plain-text', data => {
    console.log(`client said: ${data.message}`);
    socket.emit('plain-text', {
      text: 'idk what to write, this is plain text',
    });
  });

  socket.on('symmetric-encryption', data => {
    const encryptedMessage = data.message;
    const decryptedMessage = symmetric.xorWithKey(
      encryptedMessage,
      symmetricKey,
    );
    console.log(`symmetrically decrypted client message: ${decryptedMessage}`);
    socket.emit('symmetric-encryption', {
      text: symmetric.xorWithKey(options.message, symmetricKey),
    });
  });

  socket.on('diffie-hellman', data => {
    const encryptedMessage = data.message;
    const decryptedMessage = symmetric.xorWithKey(
      encryptedMessage,
      clientDHKey,
    );
    console.log(`DHE client message: ${decryptedMessage}`);
    socket.emit('diffie-hellman', { text: "wow that's very interesting!" });
  });
}

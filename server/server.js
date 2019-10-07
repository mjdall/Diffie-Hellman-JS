const symmetric = require('../symmetric');
const hellman = require('../hellman');
const yargs = require('yargs');

// cmd line args
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
let gEaHIdx = 0;
const greenEggsAndHam = getGreenEggsAndHam().split('\n');
const getGEaHLine = () => {
  const line = greenEggsAndHam[gEaHIdx];
  gEaHIdx += 1;
  if (gEaHIdx === greenEggsAndHam.length) gEaHIdx = 0;
  // skip empty line responses
  if (!line) return getGEaHLine();
  return line;
}

// loads symmetric key in from a file
const symmetricKey = symmetric.getSuperSecretKey();

io.on('connection', socket => {
  console.log(
    `new client connected: ${socket.id}\nwaiting for diffie-hellman init`,
  );

  // get a random prime
  const prime = hellman.getPrime();

  // get a prime root % prime
  const primRootModP = hellman.getPrimitiveRoot(prime);

  // compute our secret int
  const secretInt = hellman.getSecretInt(prime);

  // create the partial key to send to the client
  const partialKey = hellman.computeKey(prime, primRootModP, secretInt);

  // send the client the information they need
  socket.emit('init-shared-key', {
    P: prime,
    G: primRootModP,
    A: partialKey,
  });

  // wait for the clients reply before we construct our key
  socket.on('partial-key', data => {
    const clientPartial = data.B;
    const computedDHKey = hellman.computeKey(prime, clientPartial, secretInt);
    console.log(`initialised key: ${computedDHKey}, enabling channels`);

    // enable the communication "channels"
    enableChannels(socket, computedDHKey);
  });
});

app.listen(options.port);

// this will display if you open in browser
function handler(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('<h1>Basic Diffie-Hellman Example</h1>');
  res.end();
}

// this enable our communication channels
// they are essentially just socket events
function enableChannels(socket, clientDHKey) {
  // no encryption
  socket.on('plain-text', data => {
    console.log(`client said: ${data.message}`);
    socket.emit('plain-text', {
      text: getGEaHLine(),
    });
  });

  // symmetric encryption
  socket.on('symmetric-encryption', data => {
    const encryptedMessage = data.message;
    const decryptedMessage = symmetric.xorWithKey(
      encryptedMessage,
      symmetricKey,
    );
    console.log(`symmetrically decrypted client message: ${decryptedMessage}`);
    socket.emit('symmetric-encryption', {
      text: symmetric.xorWithKey(getGEaHLine(), symmetricKey),
    });
  });

  // DH encryped - uses passed in DH Key
  socket.on('diffie-hellman', data => {
    const encryptedMessage = data.message;
    const decryptedMessage = symmetric.xorWithKey(
      encryptedMessage,
      clientDHKey,
    );
    console.log(`DHE client message: ${decryptedMessage}`);
    socket.emit('diffie-hellman', { text: symmetric.xorWithKey(getGEaHLine(), clientDHKey) });
  });
}

function getGreenEggsAndHam() {
  return require('fs').readFileSync('./green_eggs_and_ham', 'utf8');
}

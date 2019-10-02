#!/usr/bin/env node

const symmetric = require('../symmetric');
const commands = require('../commands');
const hellman = require('../hellman');
const yargs = require('yargs');
const io = require('socket.io-client');
const prompts = require('prompts');

// checking command line args
const options = yargs
  .usage('Usage: -i <ip-address> -p <server-port>')
  .option('p', {
    alias: 'port',
    describe: 'Port to connect to of the Diffie-Hellman server',
    type: 'int',
    demandOption: true,
  })
  .option('i', {
    alias: 'ipAddress',
    describe: 'IP Address of the server (default: localhost)',
    type: 'string',
    demandOption: true,
  }).argv;

// socket io section
let server = options.ipAddress + ':' + options.port.toString();

if (server.substring(0, 7) !== 'http://') {
  server = 'http://' + server;
}

console.log('connecting to: ' + server);
const socket = io(server);
const currentChannel = 'plain-text';
let runProgram = true;

const symmetricKey = symmetric.getSuperSecretKey();
let encryptionMethods = {
  'plain-text': input => input,
  'diffie-hellman': undefined,
  'symmetric-encryption': input => symmetric.xorWithKey(input, symmetricKey),
};

socket.on('connect', () => {
  console.log('\ninitialising a share key with the server');

  socket.on('init-shared-key', data => {
    console.log(data);
    const primeP = data.P;
    // prime root modulo P
    const prmP = data.G;
    const serverPartialKey = data.A;

    const selfPartialKey = hellman.generatePartialKey(primeP, prmP);

    // share our partial key with the server
    socket.emit('partial-key', { B: selfPartialKey });

    const diffieHellmanKey = hellman.computeKey(serverPartialKey, primeP);
    encryptionMethods['diffie-hellman'] = input =>
      symmetric.xorWithKey(input, diffieHellmanKey);

    setUpSocketChannels(socket);
    allowUserInput(socket);
  });
});

function allowUserInput(socket) {
  console.log('initialised conversation');
  console.log('if you get stuck try ":h"');

  while (runProgram) {
    (async () => {
      const input = await prompts({
        type: 'string',
        name: 'message',
        message: 'Enter Message:',
      });
      handleUserInput(socket, input);
    })();
  }
  process.exit(0);
}

function handleUserInput(socket, input) {
  if (checkForCommands(input)) {
    return;
  }
  const encryptionMethod = encryptionMethods[currentChannel];
  if (encryptionMethod === undefined) {
    // shouldn't hit this, if we do, switch to symmetric encryption
    console.log('race condition hit - diffie hellman not set up');
    currentChannel = 'symmetric-encryption';
    handleUserInput(socket, input);
  }
  // encrypt the message and emit it
  const encryptedInput = encryptionMethod(input);
  socket.emit(currentChannel, { message: encryptedInput });
}

const changeChannel = newChannel => {
  if (newChannel === currentChannel) {
    console.log(`already using ${currentChannel}`);
    return;
  }
  console.log(`switching to ${newChannel}`);
  currentChannel = newChannel;
};

function checkForCommands(input) {
  const changingChannel = commands.checkUserChannelChange(input);
  if (changingChannel !== undefined) {
    changeChannel(changingChannel);
    return true;
  }
  const commandMap = {
    ':h': () => {
      console.log(commands.getHelpMessage());
    },
    ':v': () => {
      verbose = !verbose;
    },
    ':x': () => {
      runProgram = false;
    },
  };
  if (!(input in commandMap)) {
    return false;
  }
  commandMap[input]();
  return true;
}

// setup all of our socket channels once we've inited this conversation
function setUpSocketChannels(socket) {
  // receiveing a response
  socket.on('plain-text', data => {
    console.log(`server: ${data.text}`);
  });

  socket.on('symmetric-encryption', data => {
    const response = data.text;
    if (verbose) {
      console.log(`received symmetrically encrypted response:\n${response}`);
    }
    const decrypted = encryptionMethods['symmetric-encryption'](response);
    console.log(`server: ${decrypted}`);
  });

  socket.on('diffie-hellman', data => {
    const response = data.text;
    if (verbose) {
      console.log(`received diffie-hellman encrypted response:\n${response}`);
    }
    const decrypted = encryptionMethods['diffie-hellman'](response);
    console.log(`server: ${decrypted}`);
  });
}

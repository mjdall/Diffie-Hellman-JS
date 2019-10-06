#!/usr/bin/env node

const symmetric = require('../symmetric');
const commands = require('../commands');
const hellman = require('../hellman');
const yargs = require('yargs');
const io = require('socket.io-client');
const prompts = require('prompts');
const colours = require('colors');

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
let currentChannel = 'plain-text';
let verbose = false;
let runProgram = true;
let userInputEnabled = false;

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
    const secretInt = hellman.getSecretInt(prmP);
    const selfPartialKey = hellman.generatePartialKey(primeP, prmP, secretInt);
    // share our partial key with the server
    socket.emit('partial-key', { B: selfPartialKey });

    const diffieHellmanKey = hellman.generatePartialKey(
      primeP,
      serverPartialKey,
      secretInt,
    );
    console.log(`computed key: ${diffieHellmanKey}`);
    encryptionMethods['diffie-hellman'] = input =>
      symmetric.xorWithKey(input, diffieHellmanKey);

    setUpSocketChannels(socket);
    console.log('if you get stuck try ":h"');
    userInputEnabled = true;
    allowUserInput(socket);
  });
});

function allowUserInput(socket) {
  (async () => {
    if (!userInputEnabled) {
      setTimeout(() => allowUserInput(socket), 200);
      return;
    }
    const input = await prompts({
      type: 'text',
      name: 'message',
      message: 'Enter Message:',
    });
    userInputEnabled = false;
    handleUserInput(socket, input.message);
    if (!runProgram) {
      console.log('exiting...'.red);
      process.exit(0);
    }
    allowUserInput(socket);
  })();
}

const messagePrint = (message, switchInput) => {
  if (userInputEnabled) {
    setTimeout(() => messagePrint(message, switchInput), 200);
    return;
  }
  console.log(message.green);
  if (switchInput) {
    userInputEnabled = true;
  }
};

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
    messagePrint(`already using ${currentChannel}`, true);
    return;
  }
  messagePrint(`switching to ${newChannel}`, true);
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
      messagePrint(commands.getHelpMessage(), true);
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
  userInputEnabled = true;
  return true;
}

// setup all of our socket channels once we've inited this conversation
function setUpSocketChannels(socket) {
  // receiveing a response
  socket.on('plain-text', data => {
    messagePrint(`server: ${data.text}`, true);
  });

  socket.on('symmetric-encryption', data => {
    const response = data.text;
    if (verbose) {
      messagePrint(
        `received symmetrically encrypted response:\n${response}`,
        false,
      );
    }
    const decrypted = encryptionMethods['symmetric-encryption'](response);
    messagePrint(`server: ${decrypted}`, true);
  });

  socket.on('diffie-hellman', data => {
    const response = data.text;
    if (verbose) {
      messagePrint(
        `received diffie-hellman encrypted response:\n${response}`,
        false,
      );
    }
    const decrypted = encryptionMethods['diffie-hellman'](response);
    messagePrint(`server: ${decrypted}`, true);
  });
}

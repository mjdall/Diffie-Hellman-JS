const symmetric = require('../symmetric');
const hellman = require('../hellman');
const yargs = require('yargs');
const io = require('socket.io-client');
const prompts = require('prompts');
require('colors');

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

// communication channel to send messages to
let currentChannel = 'plain-text';

// flag for verbose mode
let verbose = false;

// flag for whether the user can type - used to sync message prints
let userInputEnabled = false;

// probably don't need this - stops us making more connections
let programStarted = false;

const symmetricKey = symmetric.getSuperSecretKey();
let encryptionMethods = {
  'plain-text': input => input,
  'diffie-hellman': undefined,
  'symmetric-encryption': input => symmetric.xorWithKey(input, symmetricKey),
};

socket.on('connect', () => {
  console.log('\ninitialising a share key with the server');
  // probably need a print statement here
  if (programStarted) return;

  socket.on('init-shared-key', data => {
    const serverPrime = data.P;
    const serverPRMP = data.G;
    const serverPartialKey = data.A;

    // our private int we use
    const secretInt = hellman.getSecretInt(serverPRMP);

    // compute our partial key to share with the server
    const selfPartialKey = hellman.computeKey(serverPrime, serverPRMP, secretInt);

    // share our partial key with the server
    socket.emit('partial-key', { B: selfPartialKey });

    // create the full key
    const diffieHellmanKey = hellman.computeKey(
      serverPrime,
      serverPartialKey,
      secretInt,
    );

    console.log(`computed key: ${diffieHellmanKey}`);

    // set up our encryption method
    encryptionMethods['diffie-hellman'] = input =>
      symmetric.xorWithKey(input, diffieHellmanKey);

    setUpSocketChannels(socket);
    console.log('if you get stuck try ":h"');
    userInputEnabled = true;
    programStarted = true;
    allowUserInput(socket);
  });
});

function allowUserInput(socket) {
  // run it asynchronously
  (async () => {
    // we're still printing messages, wait 1/5s and then
    // call this method again
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
    // user can type again now
    allowUserInput(socket);
  })();
}

const messagePrint = (message, switchInput, colour) => {
  // default the colour to green
  if (colour === undefined) colour = 'green';
  if (userInputEnabled) {
    setTimeout(() => messagePrint(message, switchInput), 200);
    return;
  }
  console.log(message[colour]);
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
  if (verbose) {
    messagePrint(`${currentChannel} encrypted message: ${encryptedInput}`, false, 'yellow');
  }
  socket.emit(currentChannel, { message: encryptedInput });
}

const changeChannel = newChannel => {
  if (newChannel === currentChannel) {
    messagePrint(`already using ${currentChannel}`, true, 'red');
    return;
  }
  messagePrint(`switched to ${newChannel}`, true, 'cyan');
  currentChannel = newChannel;
};

// the commands we use
function checkForCommands(input) {
  const flagMap = {
    ':d': 'diffie-hellman',
    ':s': 'symmetric-encryption',
    ':p': 'plain-text',
  };

  const helpMessage =
    'Commands:' +
    '\n\t:d - enable diffie hellman encryption with the server' +
    '\n\t:s - enable symmetrix encryption with the server' +
    '\n\t:p - switch to plain-text mode' +
    '\n\t:v - enable verbose mode' +
    '\n\t:h - command help (this message)' +
    '\n\t:x - exit the program';

  if (input in flagMap) {
    changeChannel(flagMap[input]);
    return true;
  }
  const commandMap = {
    ':h': () => {
      messagePrint(helpMessage, true, 'yellow');
    },
    ':v': () => {
      verbose = !verbose;
      let msg = verbose ? 'switched to verbose mode' : 'disabled verbose mode'
      messagePrint(msg, false, 'cyan');
    },
    ':x': () => {
      console.log('exiting...'.red);
      process.exit(0);
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
  // no encryption channel
  socket.on('plain-text', data => {
    messagePrint(`server: ${data.text}`, true);
  });

  // symmetric encryption channel
  socket.on('symmetric-encryption', data => {
    const response = data.text;
    if (verbose) {
      messagePrint(
        `received symmetrically encrypted response:\n${response}`,
        false,
        'yellow'
      );
    }
    const decrypted = encryptionMethods['symmetric-encryption'](response);
    messagePrint(`server: ${decrypted}`, true);
  });

  // dh encryption channel
  socket.on('diffie-hellman', data => {
    const response = data.text;
    if (verbose) {
      messagePrint(
        `received diffie-hellman encrypted response:\n${response}`,
        false,
        'yellow'
      );
    }
    const decrypted = encryptionMethods['diffie-hellman'](response);
    messagePrint(`server: ${decrypted}`, true);
  });
}

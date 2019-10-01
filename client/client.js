#!/usr/bin/env node

const symmetric = require('../symmetric');

const yargs = require('yargs');

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

let server = options.ipAddress + ':' + options.port.toString();

if (server.substring(0, 7) !== 'http://') {
  server = 'http://' + server;
}

console.log('connecting to: ' + server);

// socket io section
const socket = require('socket.io-client')(server);
const symKey = symmetric.get_super_secret_key();

socket.on('connect', () => {
  console.log('Sending event for no encryption response');
  socket.emit('no_encryption', {});

  // receiveing a response
  socket.on('no_encryption_response', data => {
    console.log('unencryped response: ', data.text);
    console.log('\nDoing symmetric encryption now.');
    socket.emit('symmetric', {
      message: symmetric.xorWithKey('lets test symmetric now', symKey),
    });
  });

  socket.on('symmetric_response', data => {
    const respText = data.text;
    const decryptedResponse = symmetric.xorWithKey(respText, symKey);
    console.log(`encrypted data: ${respText}`);
    console.log(`decrypted data: ${decryptedResponse}`);
  });
});

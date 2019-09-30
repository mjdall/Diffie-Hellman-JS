#!/usr/bin/env node

const asymetric = require('../asymetric');

const yargs = require('yargs');

const options = yargs
  .usage('Usage: -i <ip-address> -p <server-port>')
  .option('p', {
    alias: 'port',
    describe: 'Port to connect to of the Diffie-Hellman server',
    type: 'int',
    demandOption: true })
  .option('i', {
    alias: 'ipAddress',
    describe: 'IP Address of the server (default: localhost)',
    type: 'string',
    demandOption: true })
  .argv;

let server = options.ipAddress + ':' + options.port.toString();

if (server.substring(0, 7) !== 'http://') {
  server = 'http://' + server;
}

console.log('connecting to: ' + server);

// socket io section
const socket = require('socket.io-client')(server);

socket.on('connect', () => {
  // socket.emit('no_encryption', {});

  // receiveing a response 
  socket.on('no_encryption_response', data => {
    console.log('unencryped response: ', data);
    console.log('\nDoing asymetric encryption now.');
    // socket.emit('asymetric', { message: asymetric.encrypt('lets test asymetric now', null) });
  });

  socket.on('asymetric_response', data => {
    const respText = data.text;
    console.log('encypted data: ', respText);
    console.log('decrypted data: ', asymetric.decrypt(respText, null));
  });
});

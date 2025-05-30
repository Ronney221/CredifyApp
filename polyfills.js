global.Buffer = require('buffer').Buffer;
global.process = require('process');

if (typeof __dirname === 'undefined') global.__dirname = '/';
if (typeof __filename === 'undefined') global.__filename = '';

global.net = {
  createConnection: () => null,
  Socket: function() {},
  connect: () => null,
};

global.tls = {
  TLSSocket: function() {},
  connect: () => null,
};

global.dgram = {
  createSocket: () => null,
};

global.WebSocket = require('react-native-websocket').default; 
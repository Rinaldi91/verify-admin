const { SerialPort } = require('serialport');

console.log('Mencoba membuka COM3...');

const port = new SerialPort({
  path: 'COM3',
  baudRate: 9600
});

port.on('error', function(err) {
  console.error('Error: ', err.message);
});

port.on('open', function() {
  console.log('✅ Port COM3 berhasil dibuka!');
  port.close();
});
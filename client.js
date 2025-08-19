const net = require('net');

// Replace with your server's IP address and port number
const TCP_SERVER_HOST = 'localhost';
const TCP_SERVER_PORT = 3337;

const client = new net.Socket();

client.connect(TCP_SERVER_PORT, TCP_SERVER_HOST, () => {
  console.log('Connected to TCP server');

  // Send a JSON message to the server
 

      let count = 0;
      setTimeout(() => {
          setInterval(() => {
          if (count < 10) {
            client.write(JSON.stringify(count));
            count++;
          } 
        }
        , 1000);
      }, 55000);

//   client.write(JSON.stringify(message));
});

client.on('data', (data) => {
  console.log('Received from server:', data.toString());
});

client.on('close', () => {
  console.log('Connection closed');
});

client.on('error', (err) => {
  console.error('Error:', err);
});

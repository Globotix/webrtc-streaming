const WebSocket = require('ws');           // This is required to connect to a ROS Node on the robot
const path = require('path');              // ? What is this used for?
const config = require('dotenv').config(); //For sourcing .env config file
var express = require('express');          // This is used to serve up the html

// Constants
const robot_ip_addr = String(process.env.ROBOT_IP_ADDR) || "192.168.69.101";
const aws_ip_addr = String(process.env.AWS_IP_ADDR) || "52.74.175.195";
const http_server_port = process.env.HTTP_PORT || 8011;
const ws_server_port = process.env.WS_SERVER_PORT || 8012;
const webrtc_server_port = process.env.WEBRTC_SERVER_PORT || 8013;
const webrtc_ws_url = 'ws://' + robot_ip_addr + ":" + webrtc_server_port + '/webrtc';

// Set up clients
let webrtc_ws_client;
let webrtc_conn_timeout = 1000;
let timeout_function;

// Set up a websocket server on port 8012
const ws_router_server = new WebSocket.Server({
  port: ws_server_port,
});

// Set up express router
var app = express();                                      // Express is an open sourced server, it's the E --> (MERN)
app.set('view engine', 'ejs');                            // We are going to use ejs (nodejs)
app.use(express.static(path.join(__dirname, 'public')));  // Find all your resources in this folder
app.use(express.json());                                  // Parse requests of content-type - application/json
app.use(express.urlencoded({ extended: true }));          // Parse requests of content-type - appplication/x-www-form-urlencoded

// HTTP Request handling
app.get('/', function (req, res) {
  console.log(`UI Client with IP Address ${req.ip} is connected`);

  // As a matter of design define these variables here and pass them down to the javascript via ejs syntaxing
  addr_info = {
    aws_ip_addr: aws_ip_addr,
    robot_ip_addr: robot_ip_addr,
    ws_server_port: String(ws_server_port),
    http_server_port: String(http_server_port)
  };

  res.render('pages/index',
    { addr_info: addr_info });
})

app.get('/test', function (req, res) {
  const url = req.protocol + '://' + req.get('host') + req.originalUrl;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end(`Hello, how have you been dear user? You have requested ${url}`)
})

app.listen(http_server_port, () => {
  console.log(`webrtc_router HTTP Server listening on port ${http_server_port}`)
  console.log(`websocket server on port ${ws_server_port}`)
})

// Simply put, the websocket server receives messages on the socket and immediately relays them to any connected clients
ws_router_server.on('connection', function connection(ws) {
  // Connection to server can tested with "python3 -m websockets ws://localhost:7071"
  console.log(`[WS Router Server] Client connected to websocket port ${ws_server_port}`);

  ws.on('message', function message(message) {
    const [err, msg] = safeJsonParse(message);
    if (err) {
      console.log('[WS Router Server] Failed to parse JSON: ' + err.message);
    } else {
      console.log('[WS Router Server] Received data, relaying to [WS Webrtc server]: %s', msg);
      webrtc_ws_client.send(JSON.stringify(msg))
    }
  });

});

function connectToWebrtcServer() {
  webrtc_ws_client = new WebSocket(webrtc_ws_url);

  webrtc_ws_client.onopen = function () {
    console.log(`[WS WebRTC client] Connected to Websocket located on WebRTC Server on port: ${webrtc_server_port}`);
  }

  webrtc_ws_client.onmessage = function (message) {
    const [err, msg] = safeJsonParse(message.data);

    if (err) {
      console.log('[WS WebRTC client] Failed to parse JSON from WebRTC Server: ' + err.message);
      return;
    } else {
      console.log('[WS WebRTC client] Received data: %s via Websocket from WebRTC Server. Relaying this information to all Router clients', msg);

      ws_router_server.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          // Send the data received from 'WebRTC server' Websocket to all router clients
          client.send(JSON.stringify(msg));
        }
      })
    }
  }

  webrtc_ws_client.onclose = function (err) {
    console.log(`[WS WebRTC client] is closed. Attempting reconnection in ${webrtc_conn_timeout} seconds : ${err.reason}`);
    // WARNING! Delete won't free up memory but allows the garbage collector to find the deleted objects when the memory is low.
    // Refer to [https://stackoverflow.com/questions/11981634/understanding-object-creation-and-garbage-collection-of-a-nodejs-websocket-serve/11982071#11982071]
    delete webrtc_ws_client;

    // Clear any previous just in case this .onclose event triggers consecutively
    clearTimeout(timeout_function)
    timeout_function = setTimeout(function () {
      connectToWebrtcServer();
    }, webrtc_conn_timeout);
  };

  webrtc_ws_client.onerror = function (err) {
    console.error('[WS WebRTC client] encountered error: ', err.message, 'Closing connection');
    webrtc_ws_client.close();
  };
}

// Parse JSON into a list and catch errors if necessary
function safeJsonParse(data) {
  try {
    return [null, JSON.parse(data)];
  }
  catch (err) {
    return [err];
  }
}

// Establish Connections
connectToWebrtcServer();

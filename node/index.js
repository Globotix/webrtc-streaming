const WebSocket = require('ws');
const WebSocketClient = require('websocket').client;
const path = require('path');
const config = require('dotenv').config(); //For sourcing .env config file

var express = require('express');
var app = express();
app.set('view engine', 'ejs');

// Constants
const http_port = process.env.HTTP_PORT || 8002;
const ws_port = process.env.WS_PORT || 8001;

//Set up servers

const ws_router_server = new WebSocket.Server({
  port: ws_port,
});

//Set up clients

const ws_webrtc_client = new WebSocketClient();
let ws_webrtc_connection;
// const ws_webrtc_client = new WebSocket('ws://localhost:9091/webrtc');

app.use(express.static(path.join(__dirname, 'public'))); 
app.use(express.json());                        // Parse requests of content-type - application/json
app.use(express.urlencoded({ extended: true })); // Parse requests of content-type - appplication/x-www-form-urlencoded

/////////////////////////
//HTTP Request handling
/////////////////////////

/**
 * GET METHODS
 */

app.get('/', function (req, res){
    res.render('pages/index');
})


app.get('/suck_an_egg', function (req, res){
    const url = req.protocol + '://' + req.get('host') + req.originalUrl;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`User on requested url ${url} can go suck an egg`)
})


////////////////////
//Websocket handling
////////////////////

ws_router_server.on('connection', function connection(ws) {
  //Connection to server can tested with "python3 -m websockets ws://localhost:7071"
  console.log(`Client with connected websocket port ${ws_port}`);

  ws.on('message', function message(message) {
    const [err, msg] = safeJsonParse(message);
    if (err) {
      console.log('Failed to parse JSON: ' + err.message);
      // ws_webrtc_connection.send(JSON.stringify({error: "Failed to parse JSON, invalid JSON structure, go suck an egg."}));
    } else {
      console.log('[WS Router Server] Received data, relaying to [WS Webrtc server]: %s', msg);
      ws_webrtc_connection.send(JSON.stringify(msg))
    }
  });

});



ws_webrtc_client.on('connectFailed', function(error) {
  console.log('WS Client Connection to WebRTC Server failed: ' + error.toString());
})

ws_webrtc_client.on('connect', function(connection) {
  console.log('WS Client connected to WebRTC Server');

  ws_webrtc_connection = connection;

  connection.on('error', function (error) {
    console.log("Connection Error: " + error.toString());
  })

  connection.on('close', function() {
    console.log('echo-protocol Connection Closed');
  });

  connection.on('message', function(message) {
    const [err, msg] = safeJsonParse(message.utf8Data);

    if (err) {
      console.log('Failed to parse JSON: ' + err.message);
      // connection.send(JSON.stringify({error: "Failed to parse JSON, invalid JSON structure, go suck an egg."}));
    } else {
      console.log('[WS WebRTC client] Received data, relaying to [WS Router clients]: %s', msg);
      ws_router_server.clients.forEach( function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(msg));
        }
      })
    }
  });

})

////////////////////
//Helper methods
////////////////////

function safeJsonParse(data){
  try{
    return [null, JSON.parse(data)];
  }
  catch (err){
    return [err];
  }
}

ws_webrtc_client.connect('ws://localhost:9091/webrtc');


app.listen(http_port, () => {
    console.log(`webrtc_router listening on port ${http_port}`)
    console.log(`websocket server on port ${ws_port}`)
})


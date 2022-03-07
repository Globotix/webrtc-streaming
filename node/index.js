const WebSocket = require('ws');

const path = require('path');
const config = require('dotenv').config(); //For sourcing .env config file

var express = require('express');
var app = express();
app.set('view engine', 'ejs');

/////////////////
// Constants
/////////////////
const robot_ip_addr = String(process.env.ROBOT_IP_ADDR) || "192.168.69.101";
const aws_ip_addr = String(process.env.AWS_IP_ADDR) || "52.74.175.195";

const http_server_port = process.env.HTTP_PORT || 8011;
const ws_server_port = process.env.WS_SERVER_PORT || 8012;
const webrtc_server_port = process.env.WEBRTC_SERVER_PORT || 8013;

webrtc_ws_url = 'ws://' + robot_ip_addr + ":" + webrtc_server_port + '/webrtc';

//Set up servers
const ws_router_server = new WebSocket.Server({
  port: ws_server_port,
});

//Set up clients
let ws_webrtc_client;
let webrtc_conn_timeout = 1000;

//Set up express router
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

  addr_info = {aws_ip_addr: aws_ip_addr, 
              robot_ip_addr: robot_ip_addr,
              ws_server_port: String(ws_server_port), 
              http_server_port: String(http_server_port)};
  
  res.render('pages/index', 
              {addr_info: addr_info} );
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
  console.log(`[WS Router Server] Client with connected websocket port ${ws_server_port}`);

  ws.on('message', function message(message) {
    const [err, msg] = safeJsonParse(message);
    if (err) {
      console.log('[WS Router Server] Failed to parse JSON: ' + err.message);
      // ws_webrtc_connection.send(JSON.stringify({error: "Failed to parse JSON, invalid JSON structure, go suck an egg."}));
    } else {
      console.log('[WS Router Server] Received data, relaying to [WS Webrtc server]: %s', msg);
      ws_webrtc_client.send(JSON.stringify(msg))
    }
  });

});

function connectToWebrtcServer() {

  ws_webrtc_client = new WebSocket(webrtc_ws_url);

  ws_webrtc_client.onopen = function(){
    console.log(`[WS WebRTC client] connected to WebRTC Server on port ${webrtc_server_port}`);
  }
  
  ws_webrtc_client.onmessage = function(message){
    const [err, msg] = safeJsonParse(message.data); 

    if (err) {
      console.log('[WS WebRTC client] Failed to parse JSON: ' + err.message);
      // connection.send(JSON.stringify({error: "Failed to parse JSON, invalid JSON structure, go suck an egg."}));
    } else {
      console.log('[WS WebRTC client] Received data, relaying to [WS Router clients]: %s', msg);
      ws_router_server.clients.forEach( function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(msg));
        }
      })
    }
  }

  ws_webrtc_client.onclose = function(err) {
    console.log(`[WS WebRTC client] is closed. Attempting reconnection in ${webrtc_conn_timeout} seconds : ${err.reason}`);
    //WARNING! This won't free up memory but allows the garbage collector to find the deleted objects when the memory is low.
    //Refer to [https://stackoverflow.com/questions/11981634/understanding-object-creation-and-garbage-collection-of-a-nodejs-websocket-serve/11982071#11982071]
    delete ws_webrtc_client; 

    setTimeout(function() {
      connectToWebrtcServer();
    }, webrtc_conn_timeout += 1000);
  };

  ws_webrtc_client.onerror = function(err) {
    console.error('[WS WebRTC client] encountered error: ', err.message, 'Closing connection');
    ws_webrtc_client.close();
  };


}

////////////////////
//Helper methods
////////////////////

//Parse JSON into a dictionary object while
//catching errors
function safeJsonParse(data){
  try{
    return [null, JSON.parse(data)];
  }
  catch (err){
    return [err];
  }
}

//Create an IP Address that can be passed
//via embedded js (EJS) to the rendered html element 
function createEJSIPAddr(ip){
  let ip_replaced = ip;
  // Example: 192.168.1.23 => 192_168_1_23
  ip_replaced.replace(/./g, "_");
  return ip_replaced;
}

////////////////////
//Establish Connections
////////////////////


connectToWebrtcServer();

app.listen(http_server_port, () => {
    console.log(`webrtc_router HTTP Server listening on port ${http_server_port}`)
    console.log(`websocket server on port ${ws_server_port}`)
})


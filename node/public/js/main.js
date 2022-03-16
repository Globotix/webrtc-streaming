/**
 * This file contains client side javascript code
 *
 */

// Server/Client Addresses
let ws_url = null;
let websocket = null;

// Config 1: Cloud
let http_server_url = aws_ip_addr + ":" + http_server_port;
let ws_server_url = "ws://" + aws_ip_addr + ":" + ws_server_port;

// Config 2: Local
let http_server_url_local = "localhost" + ":" + http_server_port;
let ws_server_url_local = "ws://" + "localhost" + ":" + ws_server_port;

// Stun servers to be used. Using google because it's awesome
const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
const peer_connection = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;
let answer_sdp = null;
let offer_sdp = null;
let ice_candidate = null;

// DOM
const addStreamButton = document.getElementById('addStreamButton')
const removeStreamButton = document.getElementById('removeStreamButton')
const getVideoStream = document.getElementById('getVideoStream');
const remoteVideo = document.getElementById('remoteVideo');

// Event fires when the initial HTML document has been completely loaded and parsed, without waiting for stylesheets, images, and subframes to finish loading.
window.addEventListener("DOMContentLoaded", () => {
  // Step 1: Start a websocket connection to the router
  connectToWSServer();

  // Step 2: Set up 2 event listeners, one to send the ICE info and second to register successful connection
  peerConnectionICECallback();

});

// When the getVideoStream is clicked
getVideoStream.onclick = async () => {
  if (cameraTopic.value === "" || cameraTopic.value === null) {
    console.log("Please input camera ROS Topic if you want to add video stream");
    return;
  }

  if (videoStreamID.value === "" || videoStreamID.value === null) {
    console.log("Please input stream ID if you want to remove stream");
    return;
  }

  // Add Stream
  const cfg_add_stream = {
    type: "configure",
    actions: [{
      type: "add_stream",
      id: videoStreamID.value
    }],
  };

  console.log("[addStreamButton.onclick()] Sending Configure/add_stream")

  websocket.send(JSON.stringify(cfg_add_stream));

  // Add Video Track to Stream
  const cfg_add_video_track = {
    type: "configure",
    actions: [{
      type: "add_video_track",
      stream_id: videoStreamID.value,
      id: videoTrackID.value,
      src: "ros_image:" + cameraTopic.value
    }], // Example ros_image:/ip_front/image_raw_repub
  };
  
  console.log("[getVideoStream.onclick()] Sending Configure/add_video_track");
  console.log(`streamID.value: ${videoStreamID.value}, videoTrackID.value: ${videoTrackID.value}`);

  websocket.send(JSON.stringify(cfg_add_video_track));
}

// addStreamButton.onclick = async () => {
//   if (streamID.value == "" || streamID.value == null){
//     console.log("Please input stream ID if you want to remove stream");
//     return;
//   }

//   const cfg_add_stream = {
//     type: "configure",
//     actions: [{type: "add_stream", 
//               id: streamID.value }],
//   };
//   console.log("[addStreamButton.onclick()] Sending Configure/add_stream")

//   websocket.send(JSON.stringify(cfg_add_stream));

// }

// removeStreamButton.onclick = async () => {
//   if (streamID.value == "" || streamID.value == null){
//     console.log("Please input stream ID if you want to remove stream");
//     return;
//   }

//   const cfg_remove_stream = {
//     type: "configure",
//     actions: [{type: "remove_stream", 
//               id: streamID.value }],
//   };
//   console.log("[removeStreamButton.onclick()] Sending Configure/remove_stream")
//   websocket.send(JSON.stringify(cfg_remove_stream));
// }

// Open the websocket connection and register event handlers
function connectToWSServer() {

  // This is to support both aws and localhost testing
  if (window.location.host === http_server_url) {
    // If AWS is used then the websocket is aws' websocket url
    ws_url = ws_server_url;
  } else if (window.location.host === http_server_url_local) {
    // If localhost is used then the websocket is localhost's websocket url
    ws_url = ws_server_url_local;
  } else {
    throw new Error(`Unsupported host: ${window.location.host}`);
  }

  websocket = new WebSocket(ws_url);

  websocket.onopen = function (data) {
    console.log(`Connected to router's ws via (${ws_url}) `)
  }

  websocket.onclose = function (data) {
    console.log(`Connection to router's ws via (${ws_url}) is now closed`)
  }

  websocket.onerror = function (data) {
    console.log(`Error. Unable to connect to router's ws via (${ws_url})`)
  }

  //! Do not name your argument "evt" or "event", you will receive a lot of problems that way
  websocket.addEventListener("message", async ({ data }) => {

    // Check the data to make sure it is not malformed
    const [err, msg] = safeJsonParse(data);

    if (err) {
      console.log('[WS Client] Failed to parse JSON: ' + err.message);
      // connection.send(JSON.stringify({error: "Failed to parse JSON, invalid JSON structure, go suck an egg."}));
      return;
    }

    console.log(`[WS Client] received Message of type: ${msg.type}`);
    switch (msg.type) {
      case "offer":
        // This is what an offer looks like
        //{"type": "offer", 
        // "sdp": <string>}

        const offerDescription = msg;

        peer_connection.setRemoteDescription(new RTCSessionDescription(offerDescription));
        const answerDescription = await peer_connection.createAnswer();
        await peer_connection.setLocalDescription(answerDescription);

        const answer = {
          type: "answer",
          sdp: answerDescription.sdp,
        }

        console.log(`[wsCallback] Sent answer to Caller`);

        // Send the answer to the caller
        websocket.send(JSON.stringify(answer));

        break;

      case "ice_candidate":

        // This is what an example ice candidate looks like
        //{"type": "ice_candidate", 
        // "sdp_mid": <string>, 
        // "sdp_mline_index": <int>, 
        // "candiate": <string>,  

        const ice_candidate = {
          type: msg.type,
          candidate: msg.candidate,
          sdpMid: msg.sdp_mid,
          sdpMLineIndex: msg.sdp_mline_index,
        };

        // Add candidate to peer connection
        try {
          console.log("[wsCallback] Received Remote Ice candidate!");
          peer_connection.addIceCandidate(new RTCIceCandidate(ice_candidate));
        }
        catch (e) {
          console.error('[wsCallback] Error adding received remote ice candidate', e);
        }
        break;

      case "answer":
        console.log("[wsCallback] Received answer, ignoring")
        break;

      default:
        console.error(`[wsCallback] Unrecognized Message of type ${msg.type}`);
    }

  });

}

////////////////////////////
// Helper Functions
////////////////////////////
// Parse JSON into a list object while catching errors
function safeJsonParse(data) {
  try {
    return [null, JSON.parse(data)];
  }
  catch (err) {
    return [err, null];
  }
}

// Listens for local ICE Candidates on the local RTCPeerConnection
function peerConnectionICECallback() {

  // This first listener is to send the ice candidate information
  peer_connection.addEventListener('icecandidate', event => {

    if (event.candidate) {

      // This is an example of what an ice candidate would look like
      // {"candidate":"candidate:4260616049 1 udp 2113937151 f300c8fb-9f2e-4cba-b591-7fb32d6bdbbf.local 35096 typ host generation 0 ufrag QF1E network-cost 999",
      // "sdpMid":"video",
      // "sdpMLineIndex":0}

      const ice_candidate = {
        type: "ice_candidate",
        candidate: event.candidate.candidate,
        sdp_mid: event.candidate.sdpMid,
        sdp_mline_index: event.candidate.sdpMLineIndex,
      };

      console.log("[peerConnectionICECallback] Sent Ice candidate to receiver!")
      websocket.send(JSON.stringify(ice_candidate));
    }

  });

  // Confirm that a successful connection has been made
  peer_connection.addEventListener('connectionstatechange', event => {
    if (peer_connection.connectionState === 'connected') {
      console.log("Peers are connected. The video feed should appear on the screen now!");
    }
  });

  peer_connection.addEventListener('track', async (event) => {
    const [remoteStream] = event.streams;
    remoteVideo.srcObject = remoteStream;
  });

}

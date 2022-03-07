// Webbrowser to local websocket broadcaster

//Config 1: Cloud
let http_server_url = "http://"  + ip_addr + ":" + http_port;
let ws_server_url = "ws://" + ip_addr + ":" + ws_port;  

//Config 1: Local
let http_server_url_local = "http://"  + "localhost" + ":" + http_port;
let ws_server_url_local = "ws://" + "localhost" + ":" + ws_port;  


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
let websocket = null;
let answer_sdp = null;
let offer_sdp = null;
let ice_candidate = null;

// HTML elements
// const webcamButton = document.getElementById('webcamButton');
const addStreamButton = document.getElementById('addStreamButton')
const removeStreamButton = document.getElementById('removeStreamButton')
const askOfferButton = document.getElementById('askOfferButton');
const remoteVideo = document.getElementById('remoteVideo');



function getWebSocketServer() {
  let ws_url;
  if (window.location.host === http_server_url) {
    ws_url =  ws_server_url;
  } else if (window.location.host === http_server_url_local) {
    ws_url =  ws_server_url_local;
  } else {
    throw new Error(`Unsupported host: ${window.location.host}`);
  }

  console.log(`Connecting to ws: ${ws_url}`)
  return ws_url;
}




window.addEventListener("DOMContentLoaded", () => {
  //Open the websocket connection and register event handlers
  websocket = new WebSocket(ws_server_url);
  wsCallback(websocket);
  peerConnectionICECallback(websocket);

  peer_connection.addEventListener('track', async (event) => {
      const [remoteStream] = event.streams;
      remoteVideo.srcObject = remoteStream;
  });

});

//Listens to message coming in on websockets
function wsCallback(websocket){
  websocket.addEventListener("message", async ({data}) => {
    const event = JSON.parse(data);

    console.log(`[wsCallback] Client received WS Message of type: ${event.type}`);

    switch (event.type){

    case "offer":
      //Of the format: 
      //{"type": "offer", 
      // "sdp": <string>}

      const offerDescription = event;

      peer_connection.setRemoteDescription(new RTCSessionDescription(offerDescription));
      const answerDescription = await peer_connection.createAnswer();
      await peer_connection.setLocalDescription(answerDescription);
    
      const answer = {
        type: "answer",
        sdp: answerDescription.sdp,
      }

      console.log(`[wsCallback] Sent answer to Caller`);

      //Send answer to caller
      websocket.send(JSON.stringify(answer));

      break;

    case "ice_candidate":
      //Of the format: 
      //{"type": "ice_candidate", 
      // "sdp_mid": <string>, 
      // "sdp_mline_index": <int>, 
      // "candiate": <string>,  
      // }

      const ice_candidate = {
        type: event.type,
        candidate: event.candidate,
        sdpMid: event.sdp_mid,
        sdpMLineIndex: event.sdp_mline_index,
      };

      //Add candidate to peer connection
      try {
        console.log("[wsCallback] Received Remote Ice candidate!");
        peer_connection.addIceCandidate(new RTCIceCandidate(ice_candidate));
      }
      catch (e){
        console.error('[wsCallback] Error adding received remote ice candidate', e);
      }
      break;
    
    case "answer":
      console.log("[wsCallback] Received answer, ignoring")
      break;
    
    default:
      console.error(`[wsCallback] Unrecognized Message of type ${event.type}`);
    }
     
  });
}

//Listens for local ICE Candidates on the local RTCPeerConnection
function peerConnectionICECallback(websocket){
  peer_connection.addEventListener('icecandidate', event => {

    if (event.candidate) {
      // console.log("[peerConnectionICECallback] Received Ice candidate!")
      // console.log(JSON.stringify(event.candidate))

      // {"candidate":"candidate:4260616049 1 udp 2113937151 f300c8fb-9f2e-4cba-b591-7fb32d6bdbbf.
      // local 35096 typ host generation 0 
      // ufrag QF1E network-cost 999",
      // "sdpMid":"video",
      // "sdpMLineIndex":0}

      const ice_candidate = {
        type: "ice_candidate",
        candidate: event.candidate.candidate,
        sdp_mid: event.candidate.sdpMid,
        sdp_mline_index: event.candidate.sdpMLineIndex,
      };

      // console.log(JSON.stringify(ice_candidate))

      console.log("[peerConnectionICECallback] Sent Ice candidate!")
      websocket.send(JSON.stringify(ice_candidate));
    }
  });

  peer_connection.addEventListener('connectionstatechange', event => {
    if (peer_connection.connectionState === 'connected') {
      console.log("Peers connected!");
    }
});

}

addStreamButton.onclick = async () => {
  if (streamID.value == "" || streamID.value == null){
    console.log("Please input stream ID if you want to remove stream");
    return;
  }

  const cfg_add_stream = {
    type: "configure",
    actions: [{type: "add_stream", 
              id: streamID.value }],
  };
  console.log("[addStreamButton.onclick()] Sending Configure/add_stream")

  websocket.send(JSON.stringify(cfg_add_stream));

  //Enable/disable buttons
  askOfferButton.disabled = false;
  removeStreamButton.disabled = false;

}

removeStreamButton.onclick = async () => {
  if (streamID.value == "" || streamID.value == null){
    console.log("Please input stream ID if you want to remove stream");
    return;
  }

  const cfg_remove_stream = {
    type: "configure",
    actions: [{type: "remove_stream", 
              id: streamID.value }],
  };
  console.log("[removeStreamButton.onclick()] Sending Configure/remove_stream")
  websocket.send(JSON.stringify(cfg_remove_stream));
}

askOfferButton.onclick = async () => {
  if (cameraTopic.value == "" || cameraTopic.value == null){
    console.log("Please input camera ROS Topic if you want to add video stream");
    return;
  }

  const cfg_add_video_track = {
    type: "configure",
    actions: [{type: "add_video_track", 
              stream_id: streamID.value,
              id: streamID.value ,
              src: "ros_image:"+ cameraTopic.value}], // Example ros_image:/ip_front/image_raw_repub
  };
  console.log("[askOfferButton.onclick()] Sending Configure/add_video_track")
  websocket.send(JSON.stringify(cfg_add_video_track))
}



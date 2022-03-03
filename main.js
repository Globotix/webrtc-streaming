// import './style.css';

let web_ui_url = "https://globotix.github.io/webrtc-streaming/";
let global_ws_url = "wss://globotix-webrtc-streaming.herokuapp.com/";
// let local_ws_url = "ws://0.0.0.0:9090/webrtc";
let local_ws_url = "ws://0.0.0.0:8001";


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

const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const askOfferButton = document.getElementById('askOfferButton');

const offer_id = document.getElementById('offerID');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');

function getWebSocketServer() {
  if (window.location.host === "globotix.github.io") {
    return global_ws_url;
  } else if (window.location.host === "0.0.0.0:8000" || window.location.host === "localhost:8000") {
    return local_ws_url;
  } else {
    throw new Error(`Unsupported host: ${window.location.host}`);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  //Open the websocket connection and register event handlers
  websocket = new WebSocket(getWebSocketServer());
  wsCallback(websocket);
  peerConnectionICECallback(websocket);

  //Enable/disable buttons
  // callButton.disabled = false;
  // answerButton.disabled = false;
  // webcamButton.disabled = true;
  askOfferButton.disabled = false;

  peer_connection.addEventListener('track', async (event) => {
      const [remoteStream] = event.streams;
      remoteVideo.srcObject = remoteStream;
  });

});

//Listens to message coming in on websockets
function wsCallback(websocket){
  websocket.addEventListener("message", async ({data}) => {
    const event = JSON.parse(data);

    if (event.from_client == "True"){
      console.error("Message not meant for browser client")
      return;
    }

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
        from_client: "True",
        type: "answer",
        sdp: answerDescription.sdp
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
        console.error('[wsCallback] Error adding received Remote ice candidate', e);
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
        from_client: "True",
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
    from_client: "True",
    type: "configure",
    actions: [{type: "add_stream", 
              id: streamID.value }],
  };
  console.log("Configure/add_stream")
  websocket.send(JSON.stringify(cfg_add_stream));
}

removeStreamButton.onclick = async () => {
  if (streamID.value == "" || streamID.value == null){
    console.log("Please input stream ID if you want to remove stream");
    return;
  }

  const cfg_remove_stream = {
    from_client: "True",
    type: "configure",
    actions: [{type: "remove_stream", 
              id: streamID.value }],
  };
  console.log("Configure/remove_stream")
  websocket.send(JSON.stringify(cfg_remove_stream));
}

askOfferButton.onclick = async () => {

  const cfg_add_video_track = {
    from_client: "True",
    type: "configure",
    actions: [{type: "add_video_track", 
              stream_id: streamID.value,
              id: streamID.value ,
              src: "ros_image:/mjpeg_cam/image_repub" }],
  };
  console.log("Configure/add_video_track")
  websocket.send(JSON.stringify(cfg_add_video_track))

}

// Send configure/Add stream -> Get offer -> Send Answer -> 
// configure/add_video_track -> Get offer -> Get ICE Candidate -> Send Answer -> Send ICE Candidate 


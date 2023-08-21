# Introduction
ARCHIVED - Currently is not being used anymore in the Flexa Robot
Acts as a signalling server for WebRTC. Relays SDP and ICE Candidates between caller and answerers.

# Set-Up
```sh
#Install dependencies
pip install -r requirements.txt
```

# Quick Start
```sh
#Test 1: with locally hosted webpage and webrtc_ros only
rosrun webrtc_router local_simple_test.sh

#Test 2: with locally hosted webpage, robot_router.py, app.py (websocket broadcaster) and webrtc_ros only
rosrun webrtc_router local_router_test.sh

#Test 3: with cloud hosted webpage, robot_router.py, app.py (cloud hosted websocket broadcaster) and webrtc_ros only
rosrun webrtc_router web_no_vpn_test.sh

#Test 4: with local nodejs server, and webrtc_ros
rosrun webrtc_router local_nodejs_test.sh

```

# Deployment

## Deployment Method 1: Web without VPN 
```sh
# Can we remove this section if it is not in use
```
### (Only for First Time) Host Websocket broadcaster on Heroku
```sh
# Create heroku app
heroku create globotix-stream

# Push up to heroku git repo and server
git push heroku

# Test websocket server with interactive client
python -m websockets wss://globotix-stream.herokuapp.com/
```

### 4.1.2 Host your webpage (index.html) on github Pages
```sh
# Is this a real command?
Go figure
```

### 4.1.3 Testing Heroku deployment
1. Test websocket server with interactive client
```sh
python -m websockets wss://globotix-stream.herokuapp.com/
```

2. Send a JSON 
```sh
Connected to wss://globotix-stream.herokuapp.com/.
> {"type" : "configure", "actions": [{"type": "add_stream", "id": "flexa_robot" }]}
< 
Connection closed: 1000 (OK).
```


## 4.2 Deployment Method 2: Web with VPN 

### 4.2.1 Host cloud_router.py on AWS
1. 
```

```
### 4.2.2 Host your webpage (index.html) somewhere
```sh
Go figure
```



# 5 How to interface with webRTC ROS
Experienced users refer to `WEBRTC_ROS_SIGNALING_PROTOCOL.md` in the `webrtc_ros` package.

## Glossary:
1. **Caller** This is the webrtc_ros server
2. **Answerer** Anyone who wants to view the video stream from webrtc_ros server
   
The messages that are exchanged between the answerer and caller will be detailed below replete with examples so as to provide a reference for setting up your own answering client to webrtc_ros.

## 5.1 Adding a stream

1. **Answerer** sends request to **Caller** for offer : 
```json
{
    type: "configure",
    actions: [{ type: "add_stream", 
                id: <int> }],
}

//Example
{ "type": "configure", "actions": [{"type": "add_stream", "id": "admin" }]}
```

2. **Answerer** receives offer from **Caller**:
```json
{ 
    type: "offer",
    sdp: <string>
}
```

3. **Answerer** creates localDescription and sends answer:
```json
{ 
    type: "answer",
    sdp: <string>
}
```


## 5.2 Adding video track
1. **Answerer** sends request to **Caller** for offer : 
```json
{
    type: "configure",
    actions: [{ type: "add_video_track", 
                stream_id: <int>,
                id: <int> ,
                src: "ros_image:/mjpeg_cam/image_repub" }],
}
```

2. **Answerer** receives offer from **Caller**:
```json
{ 
    type: "offer",
    sdp: <string>
}
```

3. **Answerer** receives ICE Candidate from **Caller**:
Receive the ICE Candidate and add to peer connection
**IMPORTANT: Note that the json keys for the ice_candidate from the webRTC Javascript API differs from what is sent/received from webrtc_ros, there is a need to process them properly**

```json
{
    type: "ice_candidate", 
    sdp_mid: <string>, 
    sdp_mline_index: <int>, 
    candiate: <string>,  
}
```

4. **Answerer** creates localDescription and sends answer to **Caller**:
```json
{ 
    type: "answer",
    sdp: <string>
}
```

5. **Answerer** sends ICE Candidate to **Caller**:
Sends the ICE Candidate to the **Caller** on generation after creating the localDescription
```json
{
    type: "ice_candidate", 
    sdp_mid: <string>, 
    sdp_mline_index: <int>, 
    candiate: <string>,  
}
```

At this point, the peers should be connected, and the **Answerer** should receive your video stream if added to the peerconnection and video html element.

# 6 Issues
1. Possible sources of error when testing locally, please ensure that you are accessing your local server via `http://localhost:8000/` and not `http://0.0.0.0:8000/` to avoid errors due to security, as we are not hosting it on https.



# 7 TODO
1. Add config file to store all the URLs and constants so that the python and js can refer to them
2. CHange webrtc server port to 9091

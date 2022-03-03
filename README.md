# 1. Introduction
Acts as a signalling server for WebRTC. Relays SDP and ICE Candidates between caller and answerers


# 2. Connection with webrtc_ros

```
python -m websockets ws://0.0.0.0:9090/webrtc
```

## 2.1 Sending ICE Candidates
ICE candidate messages are sent with ICE candidates that are used by WebRTC to establish connections. Messages take the form:
```json
{ "type": "ice_candidate", "sdp_mid": <string>, "sdp_mline_index": <int>, "candiate": <string>}
```

## 2.2 SDP Offer and Answer
Offer and Answer messages are exchanged by WebRTC to describe the capabilities and streams of the clients. They take the form:
```json
{ "type": "offer" | "answer",
  "sdp": <string>
}
```

## 2.3 Configure Message
Configure messages allow the clients to request actions of the other client. They can be used to ask a client to add a stream that is a republishing of a ROS topic, remove a stream, etc. Once a configure message is sent the receiver responds with an SDP offer, which is responded to with a SDP answer. Configure messages take the form:
```json
{ "type": "configure",
  "actions": [<action>]
}
```
An action is of the form:
```json
{ "type": <string> }
```

Action Types:
 * **add_stream** - Tell the remote client start a new stream
 * **remove_stream** - Tell the remote client to remove a stream
 * **add_video_track** - Add a video track to a remote client's stream
 * **add_audio_track** - Add a audio track to a remote client's stream
 * **expect_stream** - Tell the remote client to expect a stream
 * **expect_video_track** - Tell the remote client to expect a video track
    and what to do with the track it receives

### 2.3.1 add_stream

```json
{ "type": "add_stream",
  "id": <string>
}

//Example
{"type" : "configure", "actions": [{"type": "add_stream", "id": "flexa_robot" }]} 
```

### 2.3.2 remove_stream

```json
{ "type": "remove_stream",
  "id": <string>
}
```

### 2.3.3 add_video_track

```json
{ "type": "add_video_track",
  "stream_id": <string>,
  "id": <string>,
  "src": <string>
}
```

### 2.3.3 add_audio_track

```json
{ "type": "add_audio_track",
  "stream_id": <string>,
  "id": <string>,
  "src": <string>
}
```

When adding the stream the remote client uses the src field to determine where
to get the video from.

### 2.3.4 expect_stream

```json
{ "type": "expect_stream",
  "id": <string>
}
```

### 2.3.5 expect_video_track

```json
{ "type": "expect_video_track",
  "stream_id": <string>,
  "id": <string>,
  "dest": <string>
}
```



# Quick Start

## Local 

1. In terminal 1 run:
`python -m http.server`

2. In terminal 2:
`python app.py`

## Heroku hosting
1. Open the webpage
https://globotix.github.io/globotix-webrtc-streaming/

# Testing Heroku deployment
1. Test websocket server with interactive client
```sh
python -m websockets wss://globotix-webrtc-streaming.herokuapp.com/
```

2. Send a JSON 
```sh
Connected to wss://globotix-webrtc-streaming.herokuapp.com/.
> {"type": "init"}
< {"type": "init", "join": "54ICxFae_Ip7TJE2", "watch": "634w44TblL5Dbd9a"}
Connection closed: 1000 (OK).
```


# Deployment to Heroku
```sh

#Create heroku ap
heroku create globotix-webrtc-streaming

#Push up to heroku git repo and server
git push heroku

#Test websocket server with interactive client
python -m websockets wss://globotix-webrtc-streaming.herokuapp.com/
```

# Issues
1. Possible sources of error when testing locally, please ensure that you are accessing your local server via `http://localhost:8000/` and not `http://0.0.0.0:8000/` to avoid errors due to security, as we are not hosting it on https.







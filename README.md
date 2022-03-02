# Introduction
A multiplayer connect4 game from the [Python Websocket tutorial](https://websockets.readthedocs.io/en/stable/intro/tutorial1.html) that has been deployed on Heroku.


# Deployment to Heroku
```sh

#Create heroku ap
heroku create globotix-webrtc-streaming

#Push up to heroku git repo and server
git push heroku

#Test websocket server with interactive client
python -m websockets wss://globotix-webrtc-streaming.herokuapp.com/
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
python -m websockets wss://connect4-ws-tutorial.herokuapp.com/
```

2. Send a JSON 
```sh
python -m websockets wss://connect4-ws-tutorial.herokuapp.com/
Connected to wss://connect4-ws-tutorial.herokuapp.com/.
> {"type": "init"}
< {"type": "init", "join": "54ICxFae_Ip7TJE2", "watch": "634w44TblL5Dbd9a"}
Connection closed: 1000 (OK).
```

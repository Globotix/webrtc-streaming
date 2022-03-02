#!/usr/bin/env python

#Starts a web socket server

import asyncio
import websockets
import json
import secrets

import os 
import signal

JOIN = {}
WATCH = {}

from connect4 import PLAYER1, PLAYER2, Connect4

async def error(websocket, message):
    event = {
        "type": "error",
        "message": message,
    }
    await websocket.send(json.dumps(event))

async def replay(websocket, game):
    """
    Send previous moves.

    """
    # Make a copy to avoid an exception if game.moves changes while iteration
    # is in progress. If a move is played while replay is running, moves will
    # be sent out of order but each move will be sent once and eventually the
    # UI will be consistent.
    for player, column, row in game.moves.copy():
        event = {
            "type": "play",
            "player": player,
            "column": column,
            "row": row,
        }
        await websocket.send(json.dumps(event))

async def start(websocket):
    # Initialize a Connect Four game, the set of WebSocket connections
    # receiving moves from this game, and secret access token.
    game = Connect4()
    connected = {websocket}

    join_key = secrets.token_urlsafe(12)
    JOIN[join_key] = game, connected

    watch_key = secrets.token_urlsafe(12)
    WATCH[watch_key] = game, connected

    try: 
        # Send the secret access token to the browser of the first player, 
        # where it's used for building a "join" link
        event = {
            "type": "init",
            "join": join_key,
            "watch": watch_key,
        }
        await websocket.send(json.dumps(event)) #send to receiveMoves in main.js

        # Start game
        print("first player started game", id(game))
        await play(websocket, game, PLAYER1, connected)
        

    finally:
        del JOIN[join_key]
        del WATCH[join_key]

async def join(websocket, join_key):
    #find the connect four game
    try: 
        game, connected = JOIN[join_key]
    except KeyError:
        await error(websocket, "Game not found.")
        return
    
    #Register to receive moves from this game
    connected.add(websocket)
    try: 
        # Start game
        print("second player joined game", id(game))
        await play(websocket, game, PLAYER2, connected)
        async for message in websocket:
            print("second player sent", message)
    finally:
        connected.remove(websocket)


async def watch(websocket, watch_key):
    #Watch the game
    try:
        game, connected = WATCH[watch_key]
    except KeyError:
        await error(websocket, "Game not found.")
        return
    
    #Register to receive moves from this game
    connected.add(websocket)
    try: 
        print("player watching game", id(game))
        # Send previous moves, in case the game already started.
        await replay(websocket, game)
        # Keep the connection open, but don't receive any messages.
        await websocket.wait_closed()
    finally:
        connected.remove(websocket)


async def handler(websocket, path):
    # Receive and parse the "init" event from the UI.
    message = await websocket.recv()
    event = json.loads(message)
    assert event["type"] == "init"

    if "join" in event:
        #Second player joins an existing game
        await join(websocket, event["join"])
    elif "watch" in event:
        # Spectators watch a new game.
        await watch(websocket, event["watch"])
    else:
        # First player starts a new game.
        await start(websocket)


async def play(websocket, game, player, connected):

    async for message in websocket:
        #Parse a "play" event from the UI.
        event = json.loads(message)
        assert event["type"] == "play"
            
        try:
            row = game.play(player, event["column"])
        except RuntimeError as e: 
            await error(websocket, str(e))
            continue

        event = {
            "type": "play",
            "player": player,
            "column":  event["column"],
            "row":  row,
        }
        websockets.broadcast(connected, json.dumps(event))

        # Check if player has won
        if game.winner != None:
            event =  {
                "type": "win",
                "player": game.winner,
            }
            websockets.broadcast(connected, json.dumps(event))


async def main():
    #Set the stop condition when receiving SIGTERM  
    loop = asyncio.get_running_loop()

    #To catch the SIGTERM signal, main() creates a Future called stop 
    # #and registers a signal handler that sets the result of this future. 
    # The value of the future doesn’t matter; it’s only for waiting for SIGTERM.
    stop = loop.create_future()
    loop.add_signal_handler(signal.SIGTERM, stop.set_result, None)

    port = int(os.environ.get("PORT", "8001")) #get port from environment variable

    #Then, by using serve() as a context manager and exiting the context
    # when stop has a result, main() ensures that the server closes connections cleanly and exits on SIGTERM.
    async with websockets.serve(handler, "", port):
        await stop


if __name__ == "__main__":
    #creates an asyncio event loop, runs the main() coroutine, and shuts down the loop.
    asyncio.run(main()) #entry point
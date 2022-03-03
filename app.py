#!/usr/bin/env python

server_b_port = 9001

import asyncio
import websockets
import json

import os 
import signal

connected = {}

first_time = True

async def consumer_handler(websocket, connected):
    connected.add(websocket)

    # Receive and rebroadcast messages
    async for message in websocket:
        event = json.loads(message)
        print("[B-server] receives from [B-client]: ", event)

        websockets.broadcast(connected, json.dumps(event))

async def handler(websocket):
    global first_time, connected
    if first_time:
        connected = {websocket}
        first_time = False
    else:
        pass

    await asyncio.gather(
        consumer_handler(websocket, connected),
        # producer_handler(websocket)
    )

async def main():
    #Set the stop condition when receiving SIGTERM  
    loop = asyncio.get_running_loop()

    #To catch the SIGTERM signal, main() creates a Future called stop 
    # #and registers a signal handler that sets the result of this future. 
    # The value of the future doesn’t matter; it’s only for waiting for SIGTERM.
    stop = loop.create_future()
    loop.add_signal_handler(signal.SIGTERM, stop.set_result, None)

    port = int(os.environ.get("PORT", "8001")) #get port from environment variable

    print("[B] Hosting on port: ",port)

    async with websockets.serve(handler, "", port): #serve a websocket
        #A Future represents an eventual result of an asynchronous operation. Not thread-safe.
        await stop

if __name__ == "__main__":
    #creates an asyncio event loop, runs the main() coroutine, and shuts down the loop.
    asyncio.run(main())

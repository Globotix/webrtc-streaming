#!/usr/bin/env python

import asyncio
import websockets

async def echo(websocket):
    #Iterate through all messages in websocket
    async for message in websocket:
        await websocket.send("shut up!")

async def main():
    async with websockets.serve(echo, "localhost", 8765): #serve a websocket
        #A Future represents an eventual result of an asynchronous operation. Not thread-safe.
        await asyncio.Future() # Run forever

asyncio.run(main())


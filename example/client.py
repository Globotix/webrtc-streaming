#!/usr/bin/env python3

import asyncio
import websockets

async def hello():
    async with websockets.connect("ws://localhost:9090/webrtc") as websocket:
        await websocket.send("Hello world!")
        reply = await websocket.recv()
        print(f"Server replied: {reply}")
    
asyncio.run(hello())
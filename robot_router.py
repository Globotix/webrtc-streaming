#!/usr/bin/env python

server_b_port = 9001

webrtc_ros_url = "ws://0.0.0.0:9090/webrtc"

websocket_a = None
websocket_b = None

import asyncio
import websockets
import json


async def error(websocket, message):
    event = {
        "type": "error",
        "message": message,
    }
    await websocket.send(json.dumps(event))

async def listenClientB():
    global websocket_b
    """
    Client: Listens to 9001
    1. Receives message from [B-Server]
    2. Sends message to [A-Server/ webrtc_ros server]
    """

    print("listenClientB started!")

    async for websocket in websockets.connect("ws://localhost:"+str(server_b_port)):
        try: 
            websocket_b = websocket
            print("[B-Client] Connected to: ", "ws://localhost:"+str(server_b_port))

            async for message in websocket_b:
                event = json.loads(message)
                print("[B-Client] receives from [B-server]: ", event["type"])

                if "from_client" in event: #check if "from_client" key exists
                    if event["from_client"] == "True": 
                        #Send to webrtc server
                        if "type" in event: #Check if key exists 
                            if event["type"] == "configure":
                                pass
                            elif event["type"] == "answer":
                                pass
                            elif event["type"] == "ice_candidate":
                                pass
                            else:
                                print("message not meant for client robot")
                                continue 

                            if websocket_a != None:
                                del event["from_client"]
                                print("[A-Client]: sends to [A-Server]")
                                await websocket_a.send(json.dumps(event))
                    else:
                        print("[B-Client]: Message not from client")
                        #Ignore
                        continue
                else:
                    print("[B-Client]: Message missing the 'from_client' key, not sending a message")

        except websockets.ConnectionClosed as ws_err:
            print(f"Exception connecting to {server_b_port}: {ws_err}")
            continue

async def listenClientA():
    global websocket_a
    """
    Client: Listens to 8001
    1. Receives message from [A-Server/ webrtc_ros server]
    2. Sends message to [B-Server]
    """

    print("listenClientA started!")

    async for websocket in websockets.connect(webrtc_ros_url):
        try: 
            websocket_a = websocket
            print("[A-Client] Connected to: ", webrtc_ros_url)

            # Listen to messages from A
            async for message in websocket_a:
                event = json.loads(message)
                print("[A-Client] receives from [A-server]: ", event["type"])

                if websocket_b != None:
                    event["from_client"] = "False"
                    print("[B-Client] sends to [B-server]: ", event["type"])
                    print(event)
                    await websocket_b.send(json.dumps(event))

                # async for websocket2 in websockets.connect("ws://localhost:"+str(server_b_port)):
                #     try :
                #         print("[A-Client] sends to [B-server] ", event)
                #         await websocket2.send(json.dumps(event))
                #     except websockets.ConnectionClosed as ws2_err:
                #         print(f"Exception connecting to {server_b_port}: {ws2_err}")
                #         continue
        except websockets.ConnectionClosed as ws_err:
            print(f"Exception connecting to {webrtc_ros_url}: {ws_err}")
            continue


async def main():
    listenClientA_task = asyncio.create_task(listenClientA())
    listenClientB_task = asyncio.create_task(listenClientB())

    done, pending = await asyncio.wait(
        [listenClientA_task, 
        listenClientB_task],
        return_when=asyncio.FIRST_COMPLETED,
    )
    
    for task in pending:
        task.cancel()



    # listenClientB_task = asyncio.create_task(listenClientB())
    # done, pending = await asyncio.wait(
    #     [listenClientB_task],
    #     return_when=asyncio.FIRST_COMPLETED,
    # )

    # for task in pending:
    #     task.cancel()



if __name__ == "__main__":
    #creates an asyncio event loop, runs the main() coroutine, and shuts down the loop.
    asyncio.run(main()) #entry point
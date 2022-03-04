#!/usr/bin/env python

import sys, signal
import asyncio, websockets, json

import rospy

#Global Constants to be assigned at runtime
ws_server_url,  = ""
ws_webrtc_url = ""

ws_webrtc = None
ws_server = None

async def listenWebrtcRos():
    global ws_webrtc
    """
    Client: Listens to webrtc_ros websocket server
    1. Receives message from [A-Server/ webrtc_ros server]
    2. Sends message to [B-Server]
    """

    print("listenWebrtcRos started!")

    #ping_timeout is set to None so that it is kept alive
    async for websocket in websockets.connect(ws_webrtc_url, ping_timeout=None):
        try: 
            ws_webrtc = websocket
            print("[A-Client] Connected to: ", ws_webrtc_url)

            # Listen to messages from A
            async for message in ws_webrtc:
                event = json.loads(message)
                print("[A-Client] receives from [A-server]: ", event["type"])

                if ws_server != None:
                    event["from_client"] = "False"
                    print("[B-Client] sends to [B-server]: ", event["type"])
                    print(event)
                    await ws_server.send(json.dumps(event))

        except websockets.ConnectionClosed as ws_err:
            print(f"Exception connecting to {ws_webrtc_url}: {ws_err}")
            continue

async def listenServer():
    global ws_server
    """
    Client: Listens to Websocker Server (typically hosted on the cloud)
    1. Receives message from [WS-Server]
    2. Sends message to [ webrtc_ros server]
    """

    print("listenServer started!")

    #ping_timeout is set to None so that it is kept alive
    async for websocket in websockets.connect(ws_server_url, ping_timeout=None):
        try: 
            ws_server = websocket
            print("[B-Client] Connected to: ", ws_server_url)

            async for message in ws_server:
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

                            if ws_webrtc != None:
                                del event["from_client"]
                                print("[A-Client]: sends to [A-Server]")
                                await ws_webrtc.send(json.dumps(event))
                    else:
                        print("[B-Client]: Message not from client")
                        #Ignore
                        continue
                else:
                    print("[B-Client]: Message missing the 'from_client' key, not sending a message")

        except websockets.ConnectionClosed as ws_err:
            print(f"Exception connecting to {ws_server_url}: {ws_err}")
            continue

async def main():
    global ws_server_url, ws_webrtc_url

    rospy.init_node('robot_router')

    rospy.loginfo("Webrtc router started up!")

    ws_server_url = rospy.get_param("~ws_server_url", "ws://localhost:8001/")
    ws_webrtc_url = rospy.get_param("~ws_webrtc_url", "ws://0.0.0.0:9091/webrtc")

    listenWebrtcRos_task = asyncio.create_task(listenWebrtcRos())
    listenServer_task = asyncio.create_task(listenServer())

    #Runs both listeners in async fashion, without one blocking the other
    done, pending = await asyncio.wait(
        [listenWebrtcRos_task, 
        listenServer_task],
        return_when=asyncio.FIRST_COMPLETED,
    )
    
    for task in pending:
        task.cancel()

    while (not rospy.is_shutdown()):
        rospy.spin()    

def keyboard_interrupt_handler(signal, frame):
    print("Keyboard interrupt detected. Exiting gracefully...")
    sys.exit(0)

if __name__ == "__main__":

    signal.signal(signal.SIGINT, keyboard_interrupt_handler)

    #creates an asyncio event loop, runs the main() coroutine, and shuts down the loop.
    asyncio.run(main()) #entry point
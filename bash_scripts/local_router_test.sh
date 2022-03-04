#!/bin/bash

#This is script is for testing browser and webrtc_ros server only

##########################
###### Useful flags ######
##########################
## -d detached mode    ###
## -v split vertically ###
## -h split horizontally #
## -s name the session ###
## -n name the window ####
## C-m enter a command ###
##########################

#var for session name
sn=local_router_test

# Start the session and name it according to the variable $sn, name the window etc
tmux new-session -s "$sn" -n local_router_test -d

# If -d is given, the session does not make the new window the current window
# -v: vertical split
# -h: horizontal split
# -t: target pane (followed by desired pane)

tmux split-window -dh $TMUX_PANE
tmux split-window -v $TMUX_PANE
tmux split-window -v -t 0.2 $TMUX_PANE
tmux split-window -v -t $TMUX_PANE

#Host the "cloud" web socket server
tmux send-keys -t 0.0 "roscd webrtc_router/scripts && python3 ws_broadcaster.py" C-m

#Launch webrtc_ros server and robot_router
tmux send-keys -t 0.1 "roslaunch webrtc_router webrtc_test_web.launch" C-m

#Host the webpage
tmux send-keys -t 0.2 "roscd webrtc_router && python3 -m http.server" C-m

#For debugging directly
tmux send-keys -t 0.3 "python3 -m websockets ws://0.0.0.0:9090/webrtc" 

tmux -2 attach-session -d

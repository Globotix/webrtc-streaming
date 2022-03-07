#!/bin/bash

#This is script is for testing video streaming with a cloud hosted websocket broadcaster and webpage

#var for session name
sn=web_no_vpn_test

# Start the session and name it according to the variable $sn, name the window etc
tmux new-session -s "$sn" -n web_no_vpn_test -d

# If -d is given, the session does not make the new window the current window
# -v: vertical split
# -h: horizontal split
# -t: target pane (followed by desired pane)

tmux split-window -dh $TMUX_PANE
tmux split-window -v $TMUX_PANE
tmux split-window -v -t 0.2 $TMUX_PANE

#Open the webpage hosted on a cloud
tmux send-keys -t 0.0 "google-chrome http://localhost:8011" C-m

#Launch webrtc server and robot_router
tmux send-keys -t 0.1 "roslaunch webrtc_router webrtc_test_node.launch" C-m

# sleep 3;

#For Websocket debugging
tmux send-keys -t 0.2 "roscd webrtc_router/node && npm run start" C-m

tmux -2 attach-session -d

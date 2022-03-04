#!/bin/bash

#This is script is for testing browser and webrtc_ros server only

#var for session name
sn=local_simple_test

# Start the session and name it according to the variable $sn, name the window etc
tmux new-session -s "$sn" -n local_simple_test -d

# If -d is given, the session does not make the new window the current window
# -v: vertical split
# -h: horizontal split
# -t: target pane (followed by desired pane)

tmux split-window -dh $TMUX_PANE
tmux split-window -v $TMUX_PANE

#Host the webpage
tmux send-keys -t 0.0 "roscd webrtc_router && python3 -m http.server" C-m

#Launch webrtc_ros server
tmux send-keys -t 0.1 "roslaunch webrtc_router webrtc_test.launch" C-m

tmux -2 attach-session -d

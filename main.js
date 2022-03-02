import { createBoard, playMove } from "./connect4.js";

let join_url = "";
let watch_url = "";

//Client that receives messages and manipulates the UI based on the message

function getWebSocketServer() {
    if (window.location.host === "globotix.github.io") {
      return "wss://globotix-webrtc-streaming.herokuapp.com/";
    } else if (window.location.host === "localhost:8000") {
      return "ws://localhost:8001/";
    } else {
      throw new Error(`Unsupported host: ${window.location.host}`);
    }
}


window.addEventListener("DOMContentLoaded", () => {
  // Initialize the UI.
  const board = document.querySelector(".board");
  createBoard(board);
  //Open the websocket connection and register event handlers
  const websocket = new WebSocket(getWebSocketServer());
  initGame(websocket);
  receiveMoves(board, websocket);
  sendMoves(board, websocket); //event listener to send play msg over WS when UI is clicked

  document.getElementById("join_game_button").addEventListener("click", joinGameButton, false)
  document.getElementById("watch_game_button").addEventListener("click", watchGameButton, false)

});

function initGame(websocket) {
    // Send an "init" event according to who is connecting.
    websocket.addEventListener("open", ()=> {
        const params = new URLSearchParams(window.location.search);

        let event = {type: "init"};

        if (params.has("join")){
            //second player joins an existing game
            event.join = params.get("join")
        } 
        else if (params.has("watch")){
            //Spectators joins an existing game
            event.watch = params.get("watch")
        }   
        else {
            //First player starts a new game
        }
        websocket.send(JSON.stringify(event));
    });
}


function sendMoves(board, websocket) {
    
    // When clicking a column, send a "play" event for a move in that column.
    board.addEventListener("click", ({target}) => {
        const column = target.dataset.column;
        //ignore clicks outside a column
        if (column === undefined){
            return;
        }
        const event = {
            type: "play",
            column: parseInt(column, 10),
        };
        websocket.send(JSON.stringify(event));
    });
}

function showMessage(message) {
    //When playMove() modifies the state of the board, the browser renders changes asynchronously. 
    //Conversely, window.alert() runs synchronously and blocks rendering while the alert is visible.
    //We use timeout because
    //If you called window.alert() immediately after playMove(), the browser could display 
    //the alert before rendering the move. You could get a “Player red wins!” alert without seeing red’s last move.
    window.setTimeout(() => window.alert(message), 50);
}
  
function receiveMoves(board, websocket) {
    websocket.addEventListener("message", ({ data }) => {
        const event = JSON.parse(data);

        console.log(`receiveMoves: ${event.type}`);

        switch (event.type) {
        case "init":
            // Create link for inviting the second player.
            if (event.hasOwnProperty("join")){
                document.querySelector(".join").href = "?join=" + event.join;
                
                document.getElementById("join_url").innerHTML = "join_url";
                document.getElementById("join_url").href = "?join=" + event.join;
                join_url = "?join=" + event.join
            }
            if (event.hasOwnProperty("watch")){
                document.getElementById("watch_url").innerHTML = "watch_url";
                document.getElementById("watch_url").href = "?watch=" + event.watch;
                watch_url = "?watch=" + event.watch
            }
            break;

        case "play":
            // Update the UI with the move.
            playMove(board, event.player, event.column, event.row);
            break;
        case "win":
            showMessage(`Player ${event.player} wins!`);
            // No further messages are expected; close the WebSocket connection.
            websocket.close(1000);
            break;
        case "error":
            showMessage(event.message);
            break;
        default:
            throw new Error(`Unsupported event type: ${event.type}.`);
        }
    });
}

function joinGameButton(){
    console.log("Join game button pressed! Opening new tab");

    window.open(join_url);
}

function watchGameButton(){
    console.log("Watch game button pressed! Opening new tab");

    window.open(watch_url);
}

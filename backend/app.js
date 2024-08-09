import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
const app = express();
const port = 3000;
const server = createServer(app);
let users = {};
let socketids = [];
const roomuser = [];
const messageshistory = [];
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.get("/", (req, res) => {
  res.send("Hiiiiiiiiiiiiii");
});
const roomtohost = {};
const socketidtoRoomMap = new Map();
const socketidToUserMap = new Map();
const socketidToUserNameMap = new Map();


io.on("connection", (socket) => {
  socket.on("username", (m) => {
    if (m.userName.length == 0) {
      socket.emit("duplicate username", m)
    } else if (!nameTaken(m.userName)) {
      socketidToUserNameMap.set(socket.id, m.userName);
      socket.emit("username approved");
    } else {
      socket.emit("duplicate username", m)
    }
  });

  socket.on("join-room", (roomId, userId) => {
    console.log(`a new user ${userId} joined room ${roomId} & ${socket.id}`);
    socket.join(roomId);
    socket.emit("history", messageshistory);
    socketidToUserMap.set(socket.id, userId);
    socketidtoRoomMap.set(socket.id, roomId);
    const uname = socketidToUserNameMap.get(socket.id);
    if (uname) {
      roomuser.push({
        room: roomId,
        userid: userId,
        sId: socket.id,
        usname: uname,
        video: true,
        audio: true,
        screenshare: false,
      });
    }
    if (!roomtohost[roomId]) {
      roomtohost[roomId] = socket.id;
    }
    io.in(roomId).emit("user-connected", userId, roomtohost, roomuser); // tell all participant in room that a new user is connected to the room
    io.in(roomId).emit("host-user", roomtohost[roomId], roomuser); // tell the room participant that who is the host
  });


  socket.on("user-toggle-audio", (userId, roomId) => {
    socket.join(roomId);
    for (let i = 0; i < roomuser.length; i++) {
      if (userId === roomuser[i].userid) {
        roomuser[i].audio = !roomuser[i].audio;
      }
    }
    socket.broadcast.to(roomId).emit("user-toggle-audio", userId, roomuser);
  });

  socket.on("host-toggle-audio", (userid, roomId) => {
    for (let i = 0; i < roomuser.length; i++) {
      if (roomuser[i].userid === userid) {
        roomuser[i].audio = !roomuser[i].audio;
      }
    }
    io.in(roomId).emit("user-toggle-audio", userid, roomuser);
  })

  socket.on("user-toggle-video", (userId, roomId) => {
    socket.join(roomId);
    for (let i = 0; i < roomuser.length; i++) {
      if (userId === roomuser[i].userid) {
        roomuser[i].video = !roomuser[i].video;
      }
    }
    socket.broadcast.to(roomId).emit("user-toggle-video", userId);
  });

  socket.on("user-leave", (userId, roomId) => {
    let screenstatus = false;
    if (roomtohost[roomId] === socket.id) {
      for (let [key, value] of socketidtoRoomMap) {
        if (value === roomId && key != socket.id) {
          socketidtoRoomMap.delete(socket.id);
          roomtohost[roomId] = key;
          break;
        }
      }
    }
    for (let i = 0; i < roomuser.length; i++) {
      if (roomuser[i].userid === userId) {
        screenstatus = roomuser[i].screenshare
        console.log("leave ka check", screenstatus)
        roomuser.splice(i, 1);
      }
    }
    if (screenstatus === true) {
      io.in(roomId).emit("screen-off", roomId);
    }
    socket.leave(roomId);
    socket.broadcast.to(roomId).emit("user-leave", userId);
    io.in(roomId).emit("data-update", roomuser, delete_socketid);
  });

  socket.on("removeuser", (userid, roomId) => {
    const x = userid;
    let delete_socketid;
    let screenstatus = false;
    for (let i = 0; i < roomuser.length; i++) {
      if (roomuser[i].userid === x) {
        screenstatus = roomuser[i].screenshare
        console.log("remove ka check", screenstatus)
        delete_socketid = roomuser[i].sId;
        roomuser.splice(i, 1);
      }
    }
    if (screenstatus === true) {
      io.in(roomId).emit("screen-off", roomId);
    }

    if (roomtohost[roomId] === delete_socketid) {
      for (let [key, value] of socketidtoRoomMap) {
        if (value === roomId && key != delete_socketid) {
          socketidtoRoomMap.delete(socket.id);
          roomtohost[roomId] = key;
          break;
        }
      }
      io.in(roomId).emit("host-user", roomtohost[roomId], roomuser);
    }

    io.in(roomId).emit("user-leave", userid);
    io.in(roomId).emit("data-update", roomuser, delete_socketid);
  });


  socket.on("back-button-leave", (sid) => {
    let uid;
    let screenstatus = false;
    let myroom;
    for (let i = 0; i < roomuser.length; i++) {
      if (roomuser[i].sId === sid) {
        uid = roomuser[i].userid;
        myroom = roomuser[i].room;
        screenstatus = roomuser[i].screenshare
        console.log("back ka check", screenstatus)
        roomuser.splice(i, 1);
      }
    }
    if (roomtohost[myroom] === sid) {
      for (let [key, value] of socketidtoRoomMap) {
        if (value === myroom && key != sid) {
          socketidtoRoomMap.delete(socket.id);
          roomtohost[myroom] = key;
          break;
        }
      }
      io.in(myroom).emit("host-user", roomtohost[myroom], roomuser);
    }
    if (screenstatus === true) {
      socket.broadcast.to(myroom).emit("screen-off", myroom);
    }
    io.in(myroom).emit("user-leave", uid);
    io.in(myroom).emit("data-update", roomuser, sid);
  });


  socket.on("disconnect", () => {
    const curr_room = socketidtoRoomMap.get(socket.id);
    const userId = socketidToUserMap.get(socket.id);
    let screenstatus = false;
    let delete_socketid;
    if (roomtohost[curr_room] === socket.id) {
      let found = false;
      for (let [key, value] of socketidtoRoomMap) {
        if (value === curr_room && key != socket.id) {
          socketidtoRoomMap.delete(socket.id);
          roomtohost[curr_room] = key;
          found = true;
          break;
        }
      }
      if (!found) {
        delete roomtohost[curr_room];
      }
    }
    for (let i = 0; i < roomuser.length; i++) {
      if (roomuser[i].userid === userId) {
        delete_socketid = roomuser[i].sId;
        screenstatus = roomuser[i].screenshare;
        console.log("value check", screenstatus)
        roomuser.splice(i, 1);
      }
    }
    if (screenstatus === true) {
      socket.broadcast.to(curr_room).emit("screen-off", curr_room);
    }

    socket.broadcast.to(curr_room).emit("user-leave", userId);
    io.in(curr_room).emit("host-user", roomtohost[curr_room], roomuser);
  });

  // socket.on("fetch history", () => {
  //   console.log("iiiiiiiiiiiiiiiiiii");
  //   socket.emit("history", messageshistory);
  // });

  socket.on("message", ({ message, roomId, userName }) => {
    console.log({ roomId, message, userName });
    // messageshistory.push({ nmessages: message, ruser: userName, newroom: roomId });
    if (roomId) {
      // const x = messageshistory.length;
      io.to(roomId).emit("receive-message", {
        message,
        userName,
        // messageshistory,
      });
      // console.log("Emitting Recieve Message",roomId, message, userName, messageshistory)
    } else {
      io.emit("receive-message", message);
    }
  });
  
  // socket.on('screen-share-started', (roomId, myId) => {
  //   const screenId = myId                           // gives the screenId to myID it represent the Id of user who started
  //   console.log("sharescreeen", roomId, myId);
  //   io.in(roomId).emit("share-screen", screenId)   //emit share screen in the room to the user
  //   for (let i = 0; i < roomuser.length; i++) {    //check roomuser array if userid matches myIdvsets screenshare value true
  //     if (roomuser[i].userid === myId) {
  //       roomuser[i].screenshare = true;
  //     }
  //   }
  // });

  socket.on("stream-off", (roomId) => {
    io.in(roomId).emit("screen-off", roomId);
    for (let i = 0; i < roomuser.length; i++) {
      if (roomuser[i].room === roomId) {
        roomuser[i].screenshare = false;
      }
    }
  })

  // socket.on("check-screen",(roomId)=>{
  //   let screenstatus = false;
  //   console.log("10",screenstatus)
  //   for(let i= 0; i< roomuser.length; i++){
  //     if(roomuser[i].room === roomId && roomuser[i].screenshare){        // Check if the user is in the same room and is currently sharing their screen
  //       screenstatus = true;
  //       console.log("1",screenstatus)
  //     }
  //   }
  //   io.in(roomId).emit("answer",screenstatus)      // Emit an "answer" event to all users in the room with the screen sharing status
  // })


  socket.on('screen-share-started', (roomId, myId) => {
    const screenId = myId                           // gives the screenId to myID it represent the Id of user who started
    let allow= true;     
    let index =0;
    for(let i = 0; i <roomuser.length; i++){
      if(roomuser[i].screenshare&&roomId===roomuser[i].room){
        allow=false;
      }
      if(roomuser[i].userid === myId){   // Find the index of the user who started the screen sharing
        index = 1;
      }
    }
    if(allow){       // If no one is currently sharing their screen
      roomuser[index].screenshare = true;   // Set the screenshare property of the user to true
      io.in(roomId).emit("share-screen", screenId)   //emit share screen in the room to the user
    }
    io.in(roomId).emit("answer",allow,myId)  // Emit "can-share" event to all users inroom providing the roomId, userId, and screen availability status
  });

});

function nameTaken(userName) {
  for (const socketid in users) {
    if (users[socketid].userName === userName) {
      return true;
    }
  }
  return false;
}

server.listen(port, () => {
  console.log(`server is running on ${port}`);
});

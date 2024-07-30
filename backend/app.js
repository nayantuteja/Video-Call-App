import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
const app = express();
const port = 3000;
const server = createServer(app);
let users = {};
let socketids = [];
const roomuser = [];
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
    if (!nameTaken(m.userName)) {
      users[socket.id] = m;
      socketids.push(socket.id);
      socketidToUserNameMap.set(socket.id, m.userName);
      socket.emit("approved username");
    } else {
      socket.emit("duplicate username", m);
    }
  });

  socket.on("join-room", (roomId, userId) => {
    console.log(`a new user ${userId} joined room ${roomId} & ${socket.id}`);
    socket.join(roomId);
    socketidToUserMap.set(socket.id, userId);
    socketidtoRoomMap.set(socket.id, roomId);
    const uname = socketidToUserNameMap.get(socket.id);
    roomuser.push({ room: roomId, userid: userId, sId: socket.id, usname: uname, video: true, audio: true });

    if (!roomtohost[roomId]) {
      roomtohost[roomId] = socket.id;
    }
    console.log("host", roomtohost);
    io.in(roomId).emit("user-connected", userId, roomtohost, roomuser);
    io.in(roomId).emit("host-user", roomtohost[roomId], roomuser);

  });

  socket.on("user-toggle-audio", (userId, roomId) => {
    socket.join(roomId);
    for (let i = 0; i < roomuser.length; i++) {
      if (userId === roomuser[i].userid) {
        roomuser[i].audio = !roomuser[i].audio;
      }
    }
    socket.broadcast.to(roomId).emit("user-toggle-audio", userId,roomuser);
  });

  socket.on ("host-toggle-audio",(userid,roomId)=>{
    for (let i = 0; i < roomuser.length; i++) {
      if (roomuser[i].userid === userid) {
        roomuser[i].audio = !roomuser[i].audio;
      }
    }
    io.in(roomId).emit("user-toggle-audio",userid,roomuser);
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
  
    for (let i = 0; i < roomuser.length; i++) {
      if (roomuser[i].userid === userId) {
        roomuser.splice(i, 1);
      }
    }
    socket.broadcast.to(roomId).emit("user-leave", userId);
    io.in(roomId).emit("data-update", roomuser, delete_socketid);
  });

  socket.on("removeuser", (userid, roomId) => {
    const x = userid
    let delete_socketid;
    for (let i = 0; i < roomuser.length; i++) {
      if (roomuser[i].userid === x) {
        delete_socketid = roomuser[i].sId;
        console.log("deleting", roomuser[i]);
        roomuser.splice(i, 1);
      }
    }

    io.in(roomId).emit("user-leave", userid);
    io.in(roomId).emit("data-update", roomuser, delete_socketid);
  })
  socket.on("disconnect", () => {
    console.log("byeee", socket.id);
    const curr_room = socketidtoRoomMap.get(socket.id);
    const userId = socketidToUserMap.get(socket.id);
    let delete_socketid;
    if (roomtohost[curr_room]) {
      for (let [key, value] of socketidtoRoomMap) {
        if (value === curr_room && key != socket.id) {
          roomtohost[curr_room] = key;
          break;
        }
      }
    }
    for (let i = 0; i < roomuser.length; i++) {
      if (roomuser[i].userid === userId) {
        delete_socketid = roomuser[i].sId;
        console.log("bye user", roomuser[i]);
        roomuser.splice(i, 1);
      }
    }

    socket.broadcast.to(curr_room).emit("user-leave", userId);
    io.in(curr_room).emit("host-user", roomtohost[curr_room], roomuser);

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







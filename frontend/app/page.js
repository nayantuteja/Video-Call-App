"use client"; 
import React, { useEffect, useState } from "react"; 
import { useRouter } from "next/navigation";  
import socket from "./connection/connect"; 
 
export default function Home() {
  const [roomName, setRoomName] = useState("");
  const [userName, setUsername] = useState("");
  const [takenName, setTakenName] = useState(true);   

  const router = useRouter();

  function userjoin() {
    if (userName) {
      // socket.emit("username", { userName });
      // socket.on("approved username", () => {
        router.push(`/Chatroom?user=${userName}&room=${roomName}`);
      // });
      // socket.on("duplicate username", (m) => {
      //   setTakenName(`username ${m.userName} is taken`);
      // });
    }
  }
  

  return (
    <>
      <div className="bg-gray-600 h-[100vh]">   
        <div className="flex flex-col justify-center h-screen mx-auto w-max ">
          <div className="flex flex-col items-center justify-center gap-3 ">
            <input

              className="p-2 m-2 text-black bg-white rounded-lg w-1/8 shadow-m"
              type="text"
              name="userName"
              placeholder="Enter your User name..."
              value={userName}
              maxLength={10}
              onChange={(e) => {
                setUsername(e.target.value);
              }}
            />

            <input
              className="p-2 m-2 text-black bg-white rounded-lg w-1/8 shadow-m"
              type="text"
              name="userName"
              placeholder="Enter Room "
              value={roomName}
              maxLength={8}
              onChange={(e) => {
                setRoomName(e.target.value);
              }}
            />
            {!takenName ? (
              ""
            ) : (
              <span className="p-2 text-wrap text-white">{takenName}</span>
            )}

            <button
              className="w-40 p-3 m-2 font-semibold text-white bg-black rounded-lg shadow-md hover:bg-blue-700"
              onClick={() => userjoin()}
            >
              Enter
            </button>
          </div>
        </div>
      </div>
    </>
  );
} 

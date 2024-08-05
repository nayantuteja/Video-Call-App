"use client";
import React, { useEffect, useState } from "react";
import socket from "../connection/connect";
import { useSearchParams } from "next/navigation";
import usePeer from "../hooks/usePeer";
import useMediaStream from "../hooks/useMediaStream";
import usePlayer from "../hooks/usePlayer";
import Player from "../component/Player";
import Bottom from "../component/Bottom";
import CopySection from "../component/CopySection";
import styles from "./Chatroom.module.css";
import { cloneDeep } from "lodash";
import { useRouter } from "next/navigation";

function Chatroom() {
   const searchParams = useSearchParams();
   const user = searchParams.get("user");
   const newroom = searchParams.get("room");
   const [roomId, setRoomId] = useState(newroom);
   const [data, setData] = useState([]);
   const { peer, myId } = usePeer();
   const router = useRouter();
   const [length, setLength] = useState(0);
   const { stream } = useMediaStream();
   const [roomhost, setRoomhost] = useState();
   const [showDataList, setShowDataList] = useState(false);
   const {
      players,
      setPlayers,
      playerHighlighted,
      nonHighlightedPlayers,
      toggleAudio,
      toggleVideo,
      leaveRoom,
   } = usePlayer(myId, roomId, peer);

   const [users, setUsers] = useState([]);
   const [myIdnew, setmyIdnew] = useState("");

   useEffect(() => {
      console.log("myid", myId);
      if (myId) {
         setmyIdnew(myId);
         console.log("My id new", myIdnew);
      }
   }, [myId, myIdnew]);

   useEffect(() => {
      if (!socket || !peer || !stream) return;
      const handleUserConnected = (newUser, roomtohost, roomuser) => {
         const call = peer.call(newUser, stream);

         call.on("stream", (incomingStream) => {
            setPlayers((prev) => ({
               ...prev,
               [newUser]: {
                  url: incomingStream,
                  muted: true,
                  playing: true,
               },
            }));

            setUsers((prev) => ({
               ...prev,
               [newUser]: call,
            }));
         });
      };
      socket.on("user-connected", handleUserConnected);

      return () => {
         socket.off("user-connected", handleUserConnected);
      };
   }, [peer, setPlayers, socket, stream]);

   const handleUserLeave = (userId) => {
      console.log(`user ${userId} is leaving the room`);

      users[userId]?.close();
      const playersCopy = cloneDeep(players);
      delete playersCopy[userId];

      setPlayers(playersCopy);
   };

   useEffect(() => {

      if (!socket) return;
      const handleToggleAudio = (userId, roomuser) => {
         console.log(`user with id ${userId} toggled audio`);
         setData(roomuser);
         setPlayers((prev) => {
            const copy = cloneDeep(prev);
            copy[userId].muted = !copy[userId].muted;
            return { ...copy };
         });
      };

      const handleToggleVideo = (userId) => {
         console.log(`user with id ${userId} toggled video`);
         setPlayers((prev) => {
            const copy = cloneDeep(prev);
            copy[userId].playing = !copy[userId].playing;
            return { ...copy };
         });
      };
      const handleDataUpdate = (roomuser, delete_socketid) => {
         setData(roomuser);
         if (socket.id === delete_socketid) {
            peer.disconnect();
            router.push(`/`);
         }
      };

      socket.on("user-toggle-audio", handleToggleAudio);
      socket.on("user-toggle-video", handleToggleVideo);
      socket.on("user-leave", handleUserLeave);
      socket.on("data-update", handleDataUpdate);

      return () => {
         socket.off("user-toggle-audio", handleToggleAudio);
         socket.off("user-toggle-video", handleToggleVideo);
         socket.off("user-leave", handleUserLeave);
         socket.off("data-update", handleDataUpdate);
      };
   }, [players, setPlayers, stream]);

   useEffect(() => {
      if (!peer || !stream) return;
      peer.on("call", (call) => {
         const { peer: callerId } = call;
         call.answer(stream);

         call.on("stream", (incomingStream) => {
            if (myId && callerId !== myIdnew) {
               console.log(`incoming stream from ${callerId}`);
               console.log("myID", myIdnew);

               let curraudio;
               let currvideo;
               for (let i = 0; i < data.length; i++) {
                  if (callerId === data[i].userid) {
                     curraudio = data[i].audio;
                     currvideo = data[i].video;
                  }
               }
               setPlayers((prev) => ({
                  ...prev,
                  [callerId]: {
                     url: incomingStream,
                     muted: curraudio,
                     playing: currvideo,
                  },
               }));

               setUsers((prev) => ({
                  ...prev,
                  [callerId]: call,
               }));
            }
         });
      });
   }, [peer, setPlayers, stream, players, myIdnew, data]);

   useEffect(() => {
      if (!stream || !myId) return;
      console.log(`setting my stream ${myId}`);
      setPlayers((prev) => ({
         ...prev,
         [myId]: {
            url: stream,
            muted: true,
            playing: true,
         },
      }));
   }, [myId, setPlayers, stream]);

   useEffect(() => {
      const handlehostuser = (host, ruser) => {
         setData(ruser);
         setRoomhost(host);
      };
      socket.on("host-user", handlehostuser);
   }, [data]);

   const removeuser = (userid) => {
      socket.emit("removeuser", userid, roomId);
   };

   const mictoggleuser = (userid) => {
      socket.emit("host-toggle-audio", userid, roomId);
   }

   const toggleDataList = () => {
      setShowDataList((prev) => !prev);
   };

   const getPlayerContainerClass = () => {
      const numUsers =
         Object.keys(nonHighlightedPlayers).length + (playerHighlighted ? 1 : 0);
      if (numUsers === 1) return styles.oneUser;
      if (numUsers === 2) return styles.twoUsers;
      if (numUsers === 3) return styles.threeUsers;
      if (numUsers === 4) return styles.fourUsers;
      if (numUsers === 5) return styles.fiveUsers;
      return styles.moreUsers;
   };

   return (
      <>
         <div className={styles.main}>
            <div className={styles.container}>
               <div
                  className={`${styles.activePlayerContainer
                     } ${getPlayerContainerClass()}`}
               >
                  {Object.keys(nonHighlightedPlayers).map((playerId) => {
                     const { url, muted, playing } = nonHighlightedPlayers[playerId];
                     return (
                        <Player
                           key={playerId}
                           url={url}
                           muted={muted}
                           playing={playing}
                           isActive={false}
                           username={
                              playerId === myId
                                 ? "Me"
                                 : data.find((item) => item.userid === playerId)?.usname
                           }
                        />
                     );
                  })}
                  {playerHighlighted && (
                     <Player
                        url={playerHighlighted.url}
                        muted={playerHighlighted.muted}
                        playing={playerHighlighted.playing}
                        isActive
                        username="Me"
                     />
                  )}
               </div>

               {showDataList && (
                  <div className={styles.data}>
                     <div className="h-full  text-wrap overflow-auto border-black border-[2px] rounded-lg scrollbar-thin scrollbar-thumb-rounded-sm scrollbar-thumb-black">
                        {data.map(
                           (item, index) =>
                              item.room === roomId && (
                                 <div key={index} className="data-item">
                                    <div className="flex flex-row p-2 ">
                                       {
                                          item.sId === roomhost ? (
                                             item.sId === socket.id ? (
                                                <p className="text-black">Host(Me) : {item.usname}</p>
                                             ) : (
                                                <p className="text-black">Host   : {item.usname}</p>
                                             )
                                          ) :
                                             (
                                                item.sId === socket.id ? (
                                                   <p className="text-black">Me   : {item.usname}</p>
                                                ) : (
                                                   <p className="text-black">User : {item.usname}</p>
                                                )
                                             )
                                       }
                                       {socket.id === roomhost &&
                                          item.sId != socket.id && (
                                             <div>
                                                <button className="bg-buttonPrimary rounded-full w-[25px] items-center p-1  cursor-pointer right-8 absolute" onClick={() => removeuser(item.userid)}>
                                                   <img
                                                      src="https://www.svgrepo.com/show/487730/remove-profile.svg"

                                                      className={styles.White}
                                                   ></img>
                                                </button>
                                                {
                                                   item.audio === false && (
                                                      <button className="bg-blue-700 hover:bg-buttonPrimary rounded-full w-[25px] justify-between p-[5px] text-white cursor-pointer right-16 absolute" onClick={() => mictoggleuser(item.userid)}>
                                                         <img
                                                            src="https://www.svgrepo.com/show/491673/mic.svg"
                                                            className={styles.White}
                                                         ></img>
                                                      </button>

                                                      // <Mic
                                                      //    size={25}
                                                      //    className="bg-buttonPrimary rounded-full p-[5px] justify-between mx-2 text-white cursor-pointer right-12 absolute"
                                                      //    onClick={() => mictoggleuser(item.userid)}
                                                      // />
                                                   )
                                                }
                                             </div>
                                          )}
                                    </div>
                                 </div>
                              )
                        )}
                     </div>
                  </div>
               )}
            </div>

            <div>
               <div className="pl-[225px]">
                  <CopySection roomId={roomId} />
               </div>
               <div>
                  <Bottom
                     muted={playerHighlighted?.muted}
                     playing={playerHighlighted?.playing}
                     toggleAudio={toggleAudio}
                     toggleVideo={toggleVideo}
                     leaveRoom={leaveRoom}
                     toggleDataList={toggleDataList}
                     showDataList={showDataList}
                  />
               </div>
            </div>
         </div>
      </>
   );
}

export default Chatroom;

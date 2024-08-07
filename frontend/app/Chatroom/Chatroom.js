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
import { createBrowserHistory } from "history";


function Chatroom() {

   const [mesuser, setMesuser] = useState([]);
   const [messages, setMessages] = useState([]);
   const [message, setMessage] = useState("");
   const [receiveuser, setReceiveuser] = useState("");


   const searchParams = useSearchParams();
   const userName = searchParams.get("user");
   const newroom = searchParams.get("room");
   const [roomId, setRoomId] = useState(newroom);
   const [data, setData] = useState([]);
   const { peer, myId } = usePeer();
   const [allow, setAllow] = useState(false);
   const [usernameApproved, setUsernameApproved] = useState(false);
   const history = createBrowserHistory();
   const [length, setLength] = useState(0);
   const { stream } = useMediaStream();
   const [roomhost, setRoomhost] = useState();
   const [showDataList, setShowDataList] = useState(false);
   const [users, setUsers] = useState([]);
   const [myIdnew, setMyIdNew] = useState("");
   const router = useRouter();
   const [scrShare, setScrShare] = useState(false);
   let check = true;
   const [screenStream, setScreenStream] = useState(null);
   const [screenpeer, setScreenPeer] = useState()
   const [showChat, setShowChat] = useState(false);

   const {
      players,
      setPlayers,
      playerHighlighted,
      nonHighlightedPlayers,
      toggleAudio,
      toggleVideo,
      leaveRoom,
   } = usePlayer(myId, roomId, peer);
   //
   const handleSubmit = (e) => {
      e.preventDefault();
      if (message) {
         socket.emit("message", { message, roomId, userName });
      }
      setMessage("");
   };

   useEffect(() => {
      socket.on("connect", () => {
         // setSocketID(socket.id);
         console.log("hiiii");
      });

      socket.emit("join-room", roomId);

      socket.on("history", (messageshistory) => {
         let mes = [];
         for (let i = 0; i < messageshistory.length; i++) {
            if (messageshistory[i].newroom == roomId) {
               mes.push(messageshistory[i]);
            }
         }

         setMesuser(mes);
         console.log("MesUser", mesuser);
      });
      socket.on("welcome", (s) => { });
   }, []);

   useEffect(() => {
      console.log("Hiii", receiveuser);
      socket.on("receive-message", ({ message, userName, messageshistory }) => {
         console.log("Message recieved", message, userName);
         let mes = mesuser;
         mes.push({ nmessages: message, ruser: userName });
         setMesuser(mes);
         setMessages((messages) => [...messages, message]);
         setReceiveuser(userName);
      });
   }, [mesuser]);


   useEffect(() => {
      history.listen((update) => {
         if (update.action === 'POP') {
            if (screenStream) {
               screenStream.getTracks().forEach((track) => track.stop());
               setScreenStream(null);
               setScrShare(false);
            }
            socket.emit("back-button-leave", socket.id);
         }
      });
   }, [screenStream]);

   useEffect(() => {
      socket.emit("username", { userName });
      socket.on("duplicate username", (m) => {
         router.push(`/`);
         setAllow(false);
      });

      socket.on("username approved", () => {
         setUsernameApproved(true);
         setAllow(true);
      });
      return () => {
         socket.off("duplicate username");
         socket.off("username approved");
      };
   }, [userName, router]);

   useEffect(() => {
      console.log("myid", myId);
      if (myId) {
         setMyIdNew(myId);
         console.log("My id new", myIdnew);
      }
   }, [myId, myIdnew]);


   useEffect(() => {
      if (!socket || !peer || !stream || !usernameApproved) return;
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
   }, [peer, setPlayers, socket, stream, usernameApproved]);

   const handleUserLeave = (userId) => {
      users[userId]?.close();
      const playersCopy = cloneDeep(players);
      delete playersCopy[userId];
      setPlayers(playersCopy);
   };

   useEffect(() => {
      if (!socket || !usernameApproved) return;
      const handleToggleAudio = (userId, roomuser) => {
         setData(roomuser);
         setPlayers((prev) => {
            const copy = cloneDeep(prev);
            copy[userId].muted = !copy[userId].muted;
            return { ...copy };
         });
      };

      const handleToggleVideo = (userId) => {
         setPlayers((prev) => {
            const copy = cloneDeep(prev);
            copy[userId].playing = !copy[userId].playing;
            return { ...copy };
         });
      };
      setLength(Object.keys(nonHighlightedPlayers).length + 1);
      const handleDataUpdate = (roomuser, delete_socketid) => {
         setData(roomuser);
         if (socket.id === delete_socketid) {
            peer.disconnect();
            router.push(`/`);
         }
      };

      const handleScreenShare = (screenId) => {
         console.log("sssssss", screenId, myId);
         if (screenId != myId) {
            check = false;
         }
         setScreenPeer(screenId);
         console.log("screen Id", screenId);
      };

      const handleStreamOff = (roomId) => {
         console.log("sss", screenStream);
         if (screenStream) {
            screenStream.getTracks().forEach((track) => track.stop());
            setScreenStream(null);
            setScrShare(false);
         }
      }
      socket.on("share-screen", handleScreenShare);
      socket.on("user-toggle-audio", handleToggleAudio);
      socket.on("user-toggle-video", handleToggleVideo);
      socket.on("user-leave", handleUserLeave);
      socket.on("data-update", handleDataUpdate);
      socket.on("screen-off", handleStreamOff)
      return () => {
         socket.off("user-toggle-audio", handleToggleAudio);
         socket.off("user-toggle-video", handleToggleVideo);
         socket.off("user-leave", handleUserLeave);
         socket.off("data-update", handleDataUpdate);
         socket.off("screen-off", handleStreamOff);
      };
   }, [players, setPlayers, stream, players.playing, playerHighlighted, data, usernameApproved]);


   useEffect(() => {
      if (!usernameApproved || !peer || !stream) return;
      peer.on("call", (call) => {
         const { peer: callerId } = call;
         call.answer(stream);

         call.on("stream", (incomingStream) => {
            console.log("aa rahiiii", incomingStream, check)

            if (!check) {
               setScreenStream(incomingStream);
               console.log("settting", incomingStream);
               check = true;
            } else {
               if (myId && callerId !== myIdnew) {
                  let currvideo;
                  let curraudio;
                  for (let i = 0; i < data.length; i++) {
                     if (data[i].userid === callerId) {
                        currvideo = data[i].video;
                        curraudio = data[i].audio;
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
            }
         });
      });
   }, [usernameApproved, peer, setPlayers, stream, players, myIdnew, data]);


   useEffect(() => {
      if (!usernameApproved || !stream || !myId) return;
      setPlayers((prev) => ({
         ...prev,
         [myId]: {
            url: stream,
            muted: true,
            playing: true,
         },
      }));
   }, [usernameApproved, myId, setPlayers, stream]);


   useEffect(() => {
      if (!usernameApproved) return;
      const handlehostuser = (host, ruser) => {
         let x = 0;
         for (let i = 0; i < ruser.length; i++) {
            if (ruser[i].room == roomId) {
               x++;
            }
         }
         setLength(x);
         setData(ruser);
         setRoomhost(host);
      };
      socket.on("host-user", handlehostuser);
      return () => {
         socket.off("host-user", handlehostuser);
      };
   }, [usernameApproved, data, length]);

   const removeuser = (userid) => {
      socket.emit("removeuser", userid, roomId);
   };

   const mictoggleuser = (userid) => {
      socket.emit("host-toggle-audio", userid, roomId);
   };

   const toggleDataList = () => {
      if(showChat){
         setShowChat((prev) => !prev)
      }
      setShowDataList((prev) => !prev); // Toggle the visibility state 
   };

   const toggleChat = () => {
      setShowChat((prev) => !prev)
      if(showDataList){
         setShowDataList((prev) => !prev)
      }
   }


   const shareScreen = async () => {
      if (screenStream) {
         console.log("fed", screenpeer, myId);
         if (screenpeer === myId) {
            screenStream.getTracks().forEach((track) => track.stop());
            setScreenStream(null);
            socket.emit("stream-off", roomId);
            setScrShare(false);
         }

         return;
      }
      else {
         try {
            const screenStreame = await navigator.mediaDevices.getDisplayMedia({
               video: true,
            });
            setScreenStream(screenStreame);
            console.log("screeeen", screenStream);
            setScrShare(true);
         } catch (error) {
            console.error("Error sharing screen:", error);
         }
      }
   };

   useEffect(() => {
      if (scrShare) {
         console.log("Screen Share", screenStream);
         socket.emit("screen-share-started", roomId, myId);
         console.log("rrr", myId);
         for (let i = 0; i < data.length; i++) {
            if (data[i].userid != myId) {
               console.log("calling");
               const call = peer.call(data[i].userid, screenStream);
            }
         }
      }
   }, [scrShare, players]);

   const getPlayerContainerClass = () => {
      const numUsers =
         Object.keys(nonHighlightedPlayers).length + (playerHighlighted ? 1 : 0);
      if (numUsers === 1 && !screenStream) { return styles.oneUser; }
      else if ((numUsers === 2 && !screenStream) ||
         (numUsers === 1 && screenStream)) {
         return styles.twoUsers;
      } else if (
         (numUsers === 3 && !screenStream) ||
         (numUsers === 2 && screenStream)
      ) {
         return styles.threeUsers;
      } else if (
         (numUsers === 4 && !screenStream) ||
         (numUsers === 3 && screenStream)
      ) {
         return styles.fourUsers;
      } else if (numUsers === 5) {
         return styles.fiveUsers;
      } else if (numUsers === 6) {
         return styles.moreUsers;
      }
   };



   return (
      <>
         <div className={styles.main}>
            <div className={styles.container}>
               <div className={`${styles.activePlayerContainer} ${getPlayerContainerClass()}`}>
                  {screenStream && (
                     <Player
                        url={screenStream}
                        playing={true}
                     />
                  )}
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
                     <div className="h-full text-wrap overflow-auto border-black border-[2px] rounded-lg scrollbar-thin scrollbar-thumb-rounded-sm scrollbar-thumb-black">
                        {data.map(
                           (item, index) =>
                              item.room === roomId && (
                                 <div key={index} className="data-item">
                                    <div className="flex flex-row p-2 ">
                                       {item.sId === roomhost ? (
                                          item.sId === socket.id ? (
                                             <p className="text-black">Host(Me) : {item.usname}</p>
                                          ) : (
                                             <p className="text-black">Host : {item.usname}</p>
                                          )
                                       ) : item.sId === socket.id ? (
                                          <p className="text-black">Me : {item.usname}</p>
                                       ) : (
                                          <p className="text-black">User : {item.usname}</p>
                                       )}
                                       {socket.id === roomhost && item.sId !== socket.id && (
                                          <div>
                                             <button className="bg-buttonPrimary rounded-full w-[25px] items-center p-1 cursor-pointer right-8 absolute" onClick={() => removeuser(item.userid)}>
                                                <img
                                                   src="https://www.svgrepo.com/show/487730/remove-profile.svg"
                                                   className={styles.White}
                                                   alt="Remove User"
                                                />
                                             </button>
                                             {item.audio === false && (
                                                <button className="bg-blue-700 hover:bg-buttonPrimary rounded-full w-[25px] justify-between p-[5px] text-white cursor-pointer right-16 absolute" onClick={() => mictoggleuser(item.userid)}>
                                                   <img
                                                      src="https://www.svgrepo.com/show/491673/mic.svg"
                                                      className={styles.White}
                                                      alt="Toggle Microphone"
                                                   />
                                                </button>
                                             )}
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              )
                        )}
                     </div>
                  </div>
               )}

               {showChat && (
                  <div className={styles.chat}>
                     <div className="flex flex-col  border-black border-[2px] rounded-lg justify-end  w-full h-full ">
                        <div className=" h-full text-wrap overflow-auto scrollbar-thin scrollbar-thumb-rounded-sm scrollbar-thumb-black">
                           <div className="flex flex-col gap-3 p-3">
                              {mesuser.map((m, i) =>
                                 m.ruser == userName ? (
                                    <div className="flex flex-col self-end max-w-xs border-2  border-black rounded-md">
                                       <div className="bg-gray-800 text-white pl-2 pr-3 py-1 text-wrap h-auto word rounded-[4px]">
                                          {m.nmessages}
                                       </div>
                                    </div>
                                 ) : (
                                    <div
                                       key={i}
                                       className="flex flex-col max-w-xs border-2 border-black word rounded-md w-fit"
                                    >
                                       <span className={`pl-2 pr-3 text-sm font-bold`}>
                                          {m.ruser}
                                       </span>
                                       <span className=" bg-gray-700 text-white pl-2 pr-3 py-1  text-wrap h-auto ">
                                          {m.nmessages}
                                       </span>
                                    </div>
                                 )
                              )}
                           </div>
                        </div>
                        <form onSubmit={handleSubmit}>
                           <div
                              className="flex gap-[3px] w-full pt-[2px] px-2 py-2 rounded-3xl">
                              <input
                                 className="w-full px-4 py-1 bg-gray-800 text-white rounded-3xl focus:outline-none "
                                 // style={{ border: "0.5px solid black" }}
                                 placeholder="Enter Message"
                                 value={message}
                                 onChange={(e) => setMessage(e.target.value)}
                              />
                              <button className="w-20 p-2 m-0  bg-gray-800 text-white input shadow-md hover:bg-gray-600 rounded-3xl border-radius: 50%">
                                 Send
                              </button>
                           </div>
                        </form>
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
                     shareScreen={shareScreen}
                     toggleChat={toggleChat}
                  />
               </div>
            </div>
         </div>
      </>
   );
}

export default Chatroom;
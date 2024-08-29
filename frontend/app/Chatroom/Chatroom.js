"use client";
import React, { useEffect, useState, useRef } from "react";
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
   const [currscreenstream, setCurrScreenStream] = useState(null);
   const [images, setImages] = useState([]);
   const [imagePreviews, setImagePreviews] = useState([]);
   const [viewingImage, setViewingImage] = useState(null);
   const [zoom, setZoom] = useState(1);
   const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
   const [maxZoom, setMaxZoom] = useState(2);
   const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
   const contentEditableRef = useRef(null);
   const imageRef = useRef(null);
   const [isHolding, setIsHolding] = useState(false);
   const [dragStartPoint, setDragStartPoint] = useState({ x: 0, y: 0 });
   const [imageDragging, setImageDragging] = useState(false);



   const {
      players,
      setPlayers,
      playerHighlighted,
      nonHighlightedPlayers,
      toggleAudio,
      toggleVideo,
      leaveRoom,
   } = usePlayer(myId, roomId, peer);





   useEffect(() => {
      console.log("1")
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      console.log("Mobile", isMobile)
      setMaxZoom(isMobile ? 10 : 2);
   }, []);

   //console.log("imgaeeee", imagePosition,setImagePosition)
   useEffect(() => {
      console.log("2")
      socket.on("connect", () => {
         console.log("Connected to socket");
      });

      socket.emit("join-room", newroom);

      socket.on("history", (messageshistory) => {
         const filteredMessages = messageshistory.filter(msg => msg.newroom === roomId);
         setMesuser(filteredMessages);
      });

      socket.on("receive-message", ({ message, userName, images }) => {
         setMesuser(prevMesuser => [
            ...prevMesuser,
            { nmessages: message, ruser: userName, images }
         ]);
         setMessages(prevMessages => [...prevMessages, message]);
         setReceiveuser(userName);
      });

      return () => {
         socket.off("connect");
         socket.off("history");
         socket.off("receive-message");
      };
   }, [newroom, roomId]);


   useEffect(() => {                      // Centers the image when it is viewed and adjusts the position on window resize.
      console.log("3")
      if (viewingImage) {
         const handleResize = () => {
            console.log("chalaaa")
            if (imageRef.current) {                // check if the image element is available
               // imgRect will be an object containing properties like width and height.
               const imgRect = imageRef.current.getBoundingClientRect();  //getBoundingClientRect() provides the size of the image and its position relative to the viewport.
               const viewportWidth = window.innerWidth;
               const viewportHeight = window.innerHeight;
               const imgWidth = imgRect.width;
               const imgHeight = imgRect.height;
               console.log("check", viewportWidth, viewportHeight)
               console.log("check2", imgWidth, imgHeight)
               console.log("container pos x, y", (viewportWidth - imgWidth) / 2, (viewportHeight - imgHeight) / 2)
               console.log("container pos x, y", (viewportWidth - imgWidth), (viewportHeight - imgHeight))
               setImagePosition({                        // Calculate initial position to center the image
                  x: (viewportWidth - imgWidth) / 2,
                  y: (viewportHeight - imgHeight) / 2
               });

            }
         };
         handleResize();
         window.addEventListener('resize', handleResize);
         return () => {
            window.removeEventListener('resize', handleResize);
         };
      }
   }, [viewingImage]);




   useEffect(() => {
      console.log("4")
      const handleScroll = (e) => {
         if (viewingImage) {
            e.preventDefault();
            const zoomChange = e.deltaY < 0 ? 1.1 : 0.9;  // for virtical scroll direction if scroll up increase by 1.1 zoom in and scroll sown with 0.9 zoom out
            setZoom(prevZoom => {
               const newZoom = Math.max(1, Math.min(prevZoom * zoomChange, maxZoom)); // prevzoom is current zoom level it will not go below 1 and above the maxZoom
               return newZoom;
            });
         }
      };

      window.addEventListener('wheel', handleScroll);  // calls the handlescroll when the wheel is moved
      return () => {
         window.removeEventListener('wheel', handleScroll);
      };
   }, [viewingImage, maxZoom]);


   const insertImageIntoContentEditable = (imageUrl) => {
      if (contentEditableRef.current) {
         const img = document.createElement("img");
         img.src = imageUrl;
         img.style.maxWidth = "100%";
         img.style.maxHeight = "150px";
         img.style.paddingTop = "2px"; // Add padding to the top
         img.style.paddingBottom = "2px"; // Add padding to the bottom

         const range = document.createRange();
         const sel = window.getSelection();
         range.selectNodeContents(contentEditableRef.current);
         range.collapse(false);
         range.insertNode(img);
         range.setStartAfter(img);  // Move the cursor after the image
         range.collapse(true);
         sel.removeAllRanges();
         sel.addRange(range);
         contentEditableRef.current.focus();  // Focus the contentEditable element
      }
   };

   const handleSubmit = (e) => {
      e.preventDefault();

      if (contentEditableRef.current) {  // get the inner Html of the div and set the div to contenteditable = true

         const contentHtml = contentEditableRef.current.innerHTML.trim(); // Trim whitespace from both ends
         const messageData = { message: contentHtml, roomId, userName };

         // Check if there are any images to process
         if (images.length > 0) {
            const readers = images.map((img) => {
               const reader = new FileReader();         //FileReader is used to read each image file
               return new Promise((resolve) => {
                  reader.onloadend = () => resolve(reader.result);
                  reader.readAsDataURL(img);           // readAsDataURL converts the file into data URL string
               });
            });
            Promise.all(readers).then((imageResults) => {          // when promise is resolved then executes the callback function .then part
               // Send the message with images included as HTML
               socket.emit("message", { ...messageData, images: imageResults });      // send mwssage data and image data URL (imageresult)
               setMessage("");
               setImages([]);
               setImagePreviews([]);
               contentEditableRef.current.innerHTML = ""; // Clear the contentEditable div
            });
         } else if (contentHtml !== "" && contentHtml.replace(/<[^>]*>/g, '').trim() !== "") {    // to check its valid message or empty html
            // Send the content with text only
            socket.emit("message", messageData);
            setMessage("");
            contentEditableRef.current.innerHTML = ""; // Clear the contentEditable div
         } else {
            return;           // If there's no content and no images, do nothing
         }
      }
   };

   const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
         const newImages = [...images, ...files];             // creates a array of existing image and newly dropped files
         setImages(newImages);
         const readers = files.map((file) => {
            const reader = new FileReader();
            return new Promise((resolve) => {
               reader.onloadend = () => resolve(reader.result);
               reader.readAsDataURL(file);
            });
         });

         Promise.all(readers).then((previews) => {
            setImagePreviews([...imagePreviews, ...previews]);
            previews.forEach((preview) => insertImageIntoContentEditable(preview));     //ittrates over the perview anf insert each emage into the contentEditable div
         });
      }
   };

   const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
   };



   const handleImageLoad = (e) => {
      const { naturalWidth, naturalHeight } = e.target;
      setOriginalSize({ width: naturalWidth, height: naturalHeight });
   };


   // we wala
   const handleContentChange = (e) => {
      const contentEditableElement = e.currentTarget;
      const selection = window.getSelection();
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : document.createRange();

      // Save the current cursor position
      const cursorPosition = {
         offset: range.startOffset,
         container: range.startContainer,
      };

      // Function to color URLs in the text
      const colorUrls = (text) => {
         const urlRegex = /https:\/\/([^\/\.]+)\.([^\/\s]+(?:\/[^\s]*)?)/gi;
         return text;
      };

      const processNodes = (node) => {
         if (node.nodeType === Node.TEXT_NODE) {
            // Replace text content with colored URLs
            const newTextContent = colorUrls(node.textContent);
            if (newTextContent !== node.textContent) {
               // Replace text node with a new span containing the formatted text
               const newSpan = document.createElement('span');
               newSpan.innerHTML = newTextContent;
               node.replaceWith(...newSpan.childNodes);
            }
         } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.nodeName === 'IMG') {
               // Do nothing, preserve <img> tags as HTML
               return;
            } else {
               // Convert element's content to plain text
               const plainText = node.innerText;

               // Process the plain text to color URLs
               const coloredText = colorUrls(plainText);

               // Replace the element with a new text node containing the colored text
               const newTextNode = document.createTextNode(coloredText);
               node.replaceWith(newTextNode);
            }
         }
      };

      // Process the content without replacing the entire innerHTML
      Array.from(contentEditableElement.childNodes).forEach(processNodes);



      // Restore cursor position
      const restoreCursor = () => {
         const newRange = document.createRange();
         newRange.setStart(cursorPosition.container, cursorPosition.offset);
         newRange.collapse(true);

         selection.removeAllRanges();
         selection.addRange(newRange);
      };

      restoreCursor();
   };



   const handleFiles = (files) => {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));    // chechks the MIME type that starts with '/image"

      if (imageFiles.length === 0) {
         console.log("No valid image files selected");
         return;
      }

      const newImages = [...images, ...imageFiles];
      setImages(newImages);

      const readers = imageFiles.map((file) => {
         const reader = new FileReader();
         return new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
         });
      });

      Promise.all(readers).then((previews) => {
         setImagePreviews([...imagePreviews, ...previews]);
         previews.forEach((preview) => insertImageIntoContentEditable(preview));
      });
   };

   const handlePaste = (e) => {
      const items = e.clipboardData.items;
      const files = [];

      for (let i = 0; i < items.length; i++) {
         const item = items[i];
         if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            files.push(file);
         }
      }

      if (files.length > 0) {
         handleFiles(files);
         e.preventDefault(); // Prevent the default paste behavior
         contentEditableRef.current.focus();
      }
   };

   const handleImageChange = (e) => {
      const files = Array.from(e.target.files);
      handleFiles(files);
   };


   const handleMouseDown = (e) => {
      e.preventDefault();
      setIsHolding(true);
      setDragStartPoint({ x: e.clientX, y: e.clientY });
      setImageDragging(false);
      console.log("Hold chexk", isHolding)
   };

   const handleMouseMove = (e) => {
      if (!isHolding) return;
      console.log("holding check agian", isHolding)

      const dx = e.clientX - dragStartPoint.x;
      const dy = e.clientY - dragStartPoint.y;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
         setImageDragging(true);
      }

      if (imageDragging) {
         setImagePosition(prevPosition => ({
            x: prevPosition.x + dx,
            y: prevPosition.y + dy
         }));
         setDragStartPoint({ x: e.clientX, y: e.clientY });
      }
   };

   const handleMouseUp = () => {
      console.log("working")
      if (isHolding && !imageDragging) {
         // This was a click, not a drag
         setZoom(1);
      }
      setIsHolding(false);
      setImageDragging(true);
   };

   useEffect(() => {
      window.addEventListener('mouseup', handleMouseUp);

      return () => {

         window.removeEventListener('mouseup', handleMouseUp);
      };
   }, [isHolding, imageDragging]); // Dependencies for the effect


   const handleKeyDown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
         // Prevent the default action for Enter key (adding a new line)
         e.preventDefault();
         handleSubmit(e);
      }
   };

   const renderMessage = (text, images) => {

      console.log("texttt", text)
      text = text.replace(/&nbsp;/g, ' ');
      const urlPattern = /\b(?:https?|ftp|file):\/\/[^\s<>"'()]+(?=\s|$|(?=<))|(?<![\w.-])www\.[^\s<>"'()]+(?=\s|$|(?=<))/gi;
      let parts = [];       // used to store text,link and images
      let lastIndex = 0;
      let match;            // used to store the url patterns

      // Function to add onClick to images in the text and style them as block elements
      const addOnClickToImages = (html) => {
         return html.replace(/<img\s([^>]*?)src=["']([^"']*)["']([^>]*?)>/gi, (match, p1, src, p2) => {
            return `<img ${p1}src="${src}"${p2} style="display:block;cursor:pointer;max-width:100%;max-height:150px;" onclick="window.handleImageClick('${src}')" />`;
         });
      };



      while ((match = urlPattern.exec(text)) !== null) {       // iterates through message searching for URL using the URLPatern
         const url = match[0];
         if (match.index > lastIndex) {                      // if there is text betwwen 2 image it pushes the message in parts array
            parts.push(text.substring(lastIndex, match.index));
         }

         const href = url.startsWith('www.') ? `http://${url}` : url;
         parts.push(
            <a
               key={url}
               href={href}
               target="_blank"
               rel="noopener noreferrer"
               style={{ color: 'blue', textDecoration: 'underline' }}
            >
               {url}
            </a>
         );
         lastIndex = match.index + match[0].length;               //check if there is text after last url match it pushes to parts
      }

      if (lastIndex < text.length) {
         parts.push(text.substring(lastIndex));
      }

      return (
         <div>
            {parts.map((part, index) => {
               if (typeof part === 'string' && !urlPattern.test(part)) {
                  // Render non-URL parts as HTML with onclick for images
                  const htmlWithOnClick = addOnClickToImages(part);
                  return (
                     <span key={index} dangerouslySetInnerHTML={{ __html: htmlWithOnClick }} />
                  );
               } else {
                  // Render URLs directly
                  return part;
               }
            })}
         </div>
      );
   };


   // Global handler for image click
   window.handleImageClick = (src) => {
      // Your logic to handle image click, e.g., set viewing state
      setViewingImage(src);
      setZoom(1);
   };




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
         console.log("share", screenId, myId);
         if (screenId != myId) {
            check = false;
         }
         setScreenPeer(screenId);
         console.log("screen Id", screenId);
      };

      const handleStreamOff = (roomId) => {
         if (screenStream) {
            screenStream.getTracks().forEach((track) => track.stop());
            setScreenStream(null);
            setCurrScreenStream(null);
            setScrShare(false);
         }
      };

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
               console.log("incoming tream", incomingStream);
               setScreenStream(incomingStream);
               setCurrScreenStream(incomingStream);
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
      if (showChat) {
         setShowChat((prev) => !prev)
      }
      setShowDataList((prev) => !prev); // Toggle the visibility state 
   };

   const toggleChat = () => {
      setShowChat((prev) => !prev)
      if (showDataList) {
         setShowDataList((prev) => !prev)
      }
   }


   let xstream = null;
   const shareScreen = async () => {
      if (screenStream) {                                    //check if the screen is already shared
         console.log("Checking", screenpeer, myId);
         if (screenpeer === myId) {                          // checks if already shared screen is shared from the same peer
            screenStream.getTracks().forEach((track) => track.stop()); // if its from same peer it will stop the screen share
            setScreenStream(null);
            setCurrScreenStream(null);
            socket.emit("stream-off", roomId);      //emit screen off and tells everyone in the room
            setScrShare(false);                   // set screen share value to false
         }
         return;
      }
      else {

         try {
            const screenStreame = await navigator.mediaDevices.getDisplayMedia({ video: true, });  // it calls and start the screen share
            setScreenStream(screenStreame);                   // Sets screenStream to the newly obtained screen stream (screenStreame).
            xstream = screenStreame;
            console.log("screeeen", screenStream);
            setScrShare(true);                               // set screen share value to true
         } catch (error) {
            console.error("Error sharing screen:", error);
         }
      }
   };

   if (screenStream) {
      screenStream.getVideoTracks()[0].onended = function () {
         screenStream.getTracks().forEach((track) => track.stop());
         setScreenStream(null);
         setCurrScreenStream(null)
         socket.emit("stream-off", roomId)
         setScrShare(false);
         // doWhatYouNeedToDo();
      };
   }
   useEffect(() => {
      if (scrShare) {
         if (currscreenstream != screenStream && currscreenstream) {
            screenStream.getTracks().forEach((track) => track.stop());
            setScreenStream(currscreenstream);
         }
         socket.emit("screen-share-started", roomId, myId);
         socket.on("answer", (allow, uid) => {
            console.log("ansss", allow);
            if (allow && uid === myId) {
               for (let i = 0; i < data.length; i++) {
                  if (data[i].userid != myId && data[i].room === roomId) {
                     const call = peer.call(data[i].userid, screenStream)
                  }
               }
            }
            else {
               // remove();
               console.log("acceess denied");
               return;
            }
         })
      }
      return () => {
         socket.off("answer")
      }
   }, [scrShare, players]);


   const getPlayerContainerClass = () => {
      const numUsers =
         Object.keys(nonHighlightedPlayers).length + (playerHighlighted ? 1 : 0);
      if (numUsers === 1 && !screenStream) { return styles.oneUser; }
      else if (numUsers === 1 && screenStream) {
         return styles.screenOne
      }
      else if (numUsers === 2 && screenStream) {
         return styles.screenTwo
      }
      else if (numUsers === 2 && !screenStream) {
         return styles.twoUsers;
      }
      else if (numUsers === 3 && screenStream) {
         return styles.screenThree
      } else if (
         (numUsers === 3 && !screenStream)
      ) {
         return styles.threeUsers;
      } else if (numUsers === 4 && screenStream) {
         return styles.screenFour
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
                        muted={true}
                        username="Screen Share"
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
                        className={screenStream ? "smallVideo" : ""}
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
                                       <div className="bg-white text-black pl-2 pr-3 py-1 preserve-whitespace rounded-[4px]">
                                          {renderMessage(m.nmessages, m.images)}
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
                                       <span className="bg-white text-black pl-2 pr-3 py-1 preserve-whitespace rounded-[4px]">
                                          {renderMessage(m.nmessages, m.images)}
                                       </span>
                                    </div>
                                 )
                              )}
                           </div>
                        </div>
                        <form onSubmit={handleSubmit} onDrop={handleDrop} onDragOver={handleDragOver}>
                           <div className=" w-full flex p-3 items-end space-x-1">
                              <input
                                 type="file"
                                 multiple
                                 id="fileInput"
                                 onChange={handleImageChange}
                                 className="hidden"
                              />
                              <div
                                 ref={contentEditableRef}
                                 contentEditable
                                 onInput={handleContentChange}
                                 onDrop={handleDrop}
                                 onPaste={handlePaste}
                                 onKeyDown={handleKeyDown}
                                 onDragOver={handleDragOver}
                                 className=" w-full bg-white border rounded-lg px-4 py-2"
                                 placeholder="Type your message..."
                                 style={{
                                    whiteSpace: 'break-spaces',
                                    overflowWrap: 'break-word',
                                    overflowY: 'auto',
                                    maxHeight: '100px', // Adjust the max height to fit your needs
                                 }}
                              />
                              <label htmlFor="fileInput" className="cursor-pointer flex-shrink-0">
                                 <img src="https://www.svgrepo.com/show/506113/attachment.svg" alt="Attachment" width={40} height={20} />
                              </label>
                              <button type="submit" className=" text-white px-1 py-2 rounded-lg flex-shrink-0">
                                 <img
                                    src="https://www.svgrepo.com/show/502826/send-1.svg"
                                    height={30}
                                    width={30}
                                    className="inline"
                                 />
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
         {viewingImage && (
            <div
               className="image-viewer-overlay"
               onClick={(e) => e.currentTarget === e.target && setViewingImage(null)}
               onMouseUp={handleMouseUp}
            >
               <div
                  className="image-viewer-container "
                  style={{

                     // cursor: "pointer",
                  }}
                  onMouseUp={handleMouseUp}
                  onClick={(e) => e.currentTarget === e.target && setViewingImage(null)}
               >
                  <img
                     ref={imageRef}
                     src={viewingImage}
                     alt="Viewing"
                     className="image-viewer-img"
                     style={{
                        position: 'absolute',
                        top: `${imagePosition.y}px`,
                        left: `${imagePosition.x}px`,
                        transform: `scale(${zoom})`,
                        cursor: isHolding ? 'grabbing' : 'grab',
                     }}
                     onMouseDown={handleMouseDown}
                     onMouseMove={handleMouseMove}
                     // onMouseUp={handleMouseUp}
                     onLoad={handleImageLoad}
                  />
               </div>
            </div>
         )}
      </>
   );
}

export default Chatroom;
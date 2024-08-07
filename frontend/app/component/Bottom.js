

import cx from "classnames";
import { Mic, Video, PhoneOff, MicOff, VideoOff, User } from "lucide-react";

import styles from "./index.module.css"

const Bottom = (props) => {
  const { muted, playing, toggleAudio, toggleVideo, leaveRoom,toggleDataList,shareScreen,toggleChat} = props;
  return (
    <div className={styles.bottomMenu}>
      {muted ? (
        <button className="rounded-full w-[55px] bg-buttonPrimary items-center p-3.5 " onClick={toggleAudio}>
          <img 
          src="https://www.svgrepo.com/show/491674/mic-slash.svg"
          className={styles.White}
          ></img>

        </button>
  
      ) : (
        <button className="rounded-full w-[55px] item-center bg-secondary hover:bg-buttonPrimary p-3.5 " onClick={toggleAudio}>
          <img src="https://www.svgrepo.com/show/491673/mic.svg"
                  className={styles.White}></img>
        </button>

      )}
      {playing ? (
         <button className="rounded-full w-[55px] item-center bg-secondary p-3 hover:bg-buttonPrimary " onClick={toggleVideo}>
         <img src="https://www.svgrepo.com/show/506776/video.svg"
                 className={styles.White}></img>
       </button>
       
      ) : (
        <button className="rounded-full w-[55px] item-center bg-buttonPrimary p-3 " onClick={toggleVideo}>
         <img src="https://www.svgrepo.com/show/506775/video-off.svg"
                 className={styles.White}></img>
       </button>
      )}
         <button className="rounded-full w-[55px] item-center bg-buttonPrimary p-3.5 " onClick={leaveRoom}>
         <img src="https://www.svgrepo.com/show/533302/phone-slash.svg"
                 className={styles.White}></img>
       </button>

      <button className="rounded-full w-[55px] item-center bg-secondary p-3 hover:bg-gray-800" onClick={toggleDataList}>
         <img src="https://www.svgrepo.com/show/505539/users.svg"
                 className={styles.White}></img>
       </button>

       <button className="rounded-full w-[55px] item-center bg-secondary p-2.5 hover:bg-gray-800" onClick={toggleChat}>
         <img src="https://www.svgrepo.com/show/529477/chat-line.svg"
                 className={styles.White}></img>
       </button>
    
       <button className="rounded-full w-[55px] item-center bg-secondary p-2 hover:bg-gray-800" onClick={shareScreen}>
         <img src="https://www.svgrepo.com/show/309961/share-screen.svg"
                 className={styles.White}></img>
       </button>
    

    </div>
  );
};

export default Bottom;

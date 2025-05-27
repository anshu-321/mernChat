import React from "react";
import Avatar from "./Avatar"; // Assuming onlinePeople is exported from Chat.jsx

const Contact = ({
  userId,
  selectedUserId,
  setSelectedUserId,
  onlinePeople,
  onlineStatus,
}) => {
  return (
    <div
      key={userId}
      onClick={() => setSelectedUserId(userId)}
      className={
        "border-b border-gray-300 flex items-center gap-2 my-2 cursor-pointer hover:bg-blue-200 rounded-lg h-12" +
        (userId === selectedUserId ? "bg-blue-400" : "")
      }
    >
      {userId === selectedUserId ? (
        <div className="border-l border-4 border-amber-800 h-12 rounded-r-full"></div>
      ) : (
        ""
      )}
      <Avatar
        online={onlineStatus}
        username={onlinePeople[userId]}
        userId={userId}
      />
      <span>{onlinePeople[userId]}</span>
    </div>
  );
};

export default Contact;

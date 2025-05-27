import { useContext, useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import { uniqBy } from "lodash";
import axios from "axios";

export default function Chat() {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const { username, id } = useContext(UserContext);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const messageEndRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4040");
    setWs(ws);
    ws.addEventListener("message", handleMessage); // for incoming messages
    ws.addEventListener("close", () => {
      // for connection close , to reconnect when connection is closed
      setTimeout(() => {
        console.log("Connection closed, reconnecting...");
      }, 1000);
    });
  }, []);

  function showOnlinePeople(peopleArr) {
    const people = {};
    peopleArr.forEach(({ userId, username }) => {
      people[userId] = username;
    });
    setOnlinePeople(people);
  }

  function handleMessage(e) {
    //for incoming messages
    const messageData = JSON.parse(e.data);
    console.log({ e, messageData });
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      setMessages((prev) => [...prev, { ...messageData }]);
    }
  }

  function sendMessage(ev) {
    ev.preventDefault();
    if (newMessageText == "") {
      return;
    }
    ws.send(
      JSON.stringify({
        recipient: selectedUserId,
        text: newMessageText,
      })
    );
    setNewMessageText("");
    setMessages((prev) => [
      ...prev,
      {
        text: newMessageText,
        sender: id,
        recipient: selectedUserId,
        _id: Date.now(), // Temporary ID for the message
      },
    ]);
  }

  const onlinePeopleExceptCurrUser = { ...onlinePeople };
  delete onlinePeopleExceptCurrUser[id];

  //lodAsh is a library having common functions , like using filtering uniqueBY Id in our case
  const messageWithoutDuplicates = uniqBy(messages, "_id");

  useEffect(() => {
    //scroll to the bottom of the chat when new messages are added
    // This effect runs whenever new message added to array change
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // for fetching the messages from the server
  useEffect(() => {
    if (selectedUserId) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data);
      });
    }
  }, [selectedUserId]);

  return (
    <div className="flex h-screen ">
      <div className="bg-blue-100 w-1/3 pl-4 pr-1">
        <Logo />
        {Object.keys(onlinePeopleExceptCurrUser).map((userId) => (
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
            <Avatar username={onlinePeople[userId]} userId={userId} />
            <span>{onlinePeople[userId]}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col bg-blue-200 w-2/3 p-2">
        <div className="flex-grow">
          {!selectedUserId && (
            <div className="flex h-full items-center justify-center text-gray-400">
              No selected User
            </div>
          )}
          {selectedUserId && (
            <div className="relative h-full">
              <div className="overflow-y-scroll absolute inset-0 p-2">
                {messageWithoutDuplicates.map((messages) => (
                  <div
                    className={
                      "mb-2 p-2 rounded-md " +
                      (messages.sender === id
                        ? "bg-gray-400 mr-80"
                        : "bg-blue-500 ml-80 text-indigo-100 ")
                    }
                    key={messages._id}
                  >
                    {messages.text}
                  </div>
                ))}
                <div ref={messageEndRef} />
                {/* useRef Hook used to reference to */}
                {/* the bottom most message */}
              </div>
              <div
                className="absolute bottom-2 right-0 bg-white p-2 rounded-full cursor-pointer hover:bg-green-300"
                onClick={() => {
                  if (messageEndRef.current) {
                    messageEndRef.current.scrollIntoView({
                      behavior: "smooth",
                    });
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
        {selectedUserId && (
          <form className="flex gap-2 " onSubmit={sendMessage}>
            <input
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="Type message"
              className="bg-white border p-2 flex flex-grow"
            />
            <button className="bg-blue-500 text-white p-2 cursor-pointer">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

import React from "react";

const Avatar = ({ username, userId, online }) => {
  const colors = [
    "bg-red-200",
    "bg-blue-200",
    "bg-green-200",
    "bg-yellow-200",
    "bg-purple-200",
    "bg-pink-200",
    "bg-indigo-200",
    "bg-gray-200",
    "bg-teal-200",
    "bg-orange-200",
    "bg-lime-200",
    "bg-amber-200",
    "bg-cyan-200",
    "bg-rose-200",
    "bg-violet-200",
    "bg-fuchsia-200",
    "bg-emerald-200",
    "bg-sky-200",
  ];
  const usedIdBase10 = parseInt(userId, 16);
  const colorInd = usedIdBase10 % colors.length;
  return (
    <>
      <div
        className={
          "w-10 h-10 rounded-full flex items-center justify-center text-center relative " +
          colors[colorInd]
        }
      >
        <div className="w-full opacity-60">{username[0].toUpperCase()}</div>
        <div
          className={
            "absolute w-3 h-3 bottom-0 right-0 rounded-full border-1 border-white " +
            (online === true ? "bg-green-600" : "bg-red-600")
          }
        ></div>
      </div>
    </>
  );
};

export default Avatar;

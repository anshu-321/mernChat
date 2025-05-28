const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Message = require("./models/Message");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const ws = require("ws");

dotenv.config();
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));
const jwtSecret = process.env.JWT_TOKEN;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.get("/test", (req, res) => {
  res.json("Hello World");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username });
  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password);
    if (passOk) {
      jwt.sign(
        { userId: foundUser._id, username },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err;
          res.cookie("token", token).json({
            id: foundUser._id,
          });
        }
      );
    }
  }
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    // Check if the username already exists
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);

    // Create a new user with the hashed password
    const createdUser = await User.create({
      username: username,
      password: hashedPassword,
    });
    jwt.sign(
      { userId: createdUser._id, username },
      jwtSecret,
      {},
      (err, token) => {
        if (err) throw err;
        res.cookie("token", token).status(201).json({
          id: createdUser._id,
        });
      }
    );
  } catch (err) {
    if (err) throw err;
    res.status(500).json("Error");
  }
});

async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
      reject("No token");
    }
  });
}

app.get("/messages/:userId", async (req, res) => {
  const { userId } = req.params;
  const userData = await getUserDataFromRequest(req);
  const ourUserId = userData.userId;
  const messages = await Message.find({
    sender: { $in: [userId, ourUserId] }, // Find messages where the sender is either the userId or ourUserId
    recipient: { $in: [userId, ourUserId] },
  })
    .sort({ createdAt: 1 }) // Sort messages by creation date in ascending order
    .exec(); // Execute the query to get the messages
  res.json(messages);
});

// Route to get the profile of the currently authenticated user
app.get("/profile", (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    // Verify the token using the secret key
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) throw err; // If token verification fails, throw an error
      res.json(userData); // Send the decoded user data as a JSON response
    });
  } else {
    res.status(401).json("No token");
  }
});

app.get("/people", async (req, res) => {
  const users = await User.find({}, { _id: 1, username: 1 });
  res.json(users);
});

//creating a web socket server for knowing the live status of the user
const server = app.listen(4040);

//wss is the web socket server - ws is the web socket library
const wss = new ws.WebSocketServer({ server });
wss.on("connection", (connection, req) => {
  function notifyAboutOnlinePeople() {
    //notify other people when someone connects
    [...wss.clients].forEach((client) => {
      //converting the wss.clients(object) to an array
      client.send(
        JSON.stringify({
          online: [...wss.clients].map((c) => ({
            userId: c.userId,
            username: c.username,
          })), //sending the userId and username of all the clients
        })
      );
    });
  }

  //to check if the connection is alive
  connection.isAlive = true;
  connection.timer = setInterval(() => {
    connection.ping(); // ping the connection to check if it is alive
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false; // if no pong is received, set isAlive to false
      connection.terminate();
      notifyAboutOnlinePeople();
    }, 1000);
  }, 5000);

  //for each ping we need to make pong
  connection.on("pong", () => {
    //pong is received from each browser connceted
    clearTimeout(connection.deathTimer); // clear the death timer if pong is received
  });

  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.startsWith("token="));
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) throw err;
          const { userId, username } = userData;
          connection.userId = userId; //connection is the web socket connection
          connection.username = username; //all conncetions are stored in the connection object in wss clients
        });
      }
    }
  }

  connection.on("message", async (message) => {
    const messageData = JSON.parse(message.toString());
    const { recipient, text } = messageData;

    if (recipient && text) {
      //message is saved on the database before sending it to the recipient
      const messageDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
      });
      //sending message to recipient with message ID
      [...wss.clients]
        .filter((c) => c.userId === recipient)
        .forEach((client) => {
          client.send(
            JSON.stringify({
              text,
              sender: connection.userId,
              recipient,
              _id: messageDoc._id,
            })
          );
        });
    }
  });

  notifyAboutOnlinePeople(); // notify about online people when a new connection is made
});

wss.on("close", (connection) => {
  console.log("Connection closed", connection);
});

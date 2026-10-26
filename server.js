const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const USERS_FILE = path.join(__dirname, "users.json");

function readUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    if (!data.trim()) return [];
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

app.post("/api/signup", (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ success: false, error: "All fields are required." });
  }

  const users = readUsers();
  const exists = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (exists) {
    return res.status(400).json({ success: false, error: "Email already registered." });
  }

  const newUser = {
    id: Date.now(),
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    password: password,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeUsers(users);

  return res.json({
    success: true,
    message: "Account created successfully.",
    user: { id: newUser.id, fullName: newUser.fullName, email: newUser.email },
  });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email and password are required." });
  }

  const users = readUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(401).json({ success: false, error: "Invalid email or password." });
  }

  return res.json({
    success: true,
    message: "Login successful.",
    user: { id: user.id, fullName: user.fullName, email: user.email },
  });
});

// PUT - Update entire user
app.put("/api/users/:id", (req, res) => {
  const userId = parseInt(req.params.id);
  const { fullName, email, password } = req.body;

  let users = readUsers();
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ success: false, error: "User not found." });
  }

  // Check if email already taken by another user
  if (email) {
    const emailExists = users.find(
      (u) => u.id !== userId && u.email.toLowerCase() === email.toLowerCase()
    );
    if (emailExists) {
      return res.status(400).json({ success: false, error: "Email already taken." });
    }
  }

  users[userIndex] = {
    ...users[userIndex],
    fullName: fullName ? fullName.trim() : users[userIndex].fullName,
    email: email ? email.trim().toLowerCase() : users[userIndex].email,
    password: password || users[userIndex].password,
    updatedAt: new Date().toISOString(),
  };

  writeUsers(users);
  const { password: _, ...safeUser } = users[userIndex];
  res.json({ success: true, message: "User updated successfully.", user: safeUser });
});

// PATCH - Update user partially
app.patch("/api/users/:id", (req, res) => {
  const userId = parseInt(req.params.id);
  const updates = req.body;

  let users = readUsers();
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ success: false, error: "User not found." });
  }

  // Check if email already taken by another user
  if (updates.email) {
    const emailExists = users.find(
      (u) => u.id !== userId && u.email.toLowerCase() === updates.email.toLowerCase()
    );
    if (emailExists) {
      return res.status(400).json({ success: false, error: "Email already taken." });
    }
  }

  if (updates.fullName) updates.fullName = updates.fullName.trim();
  if (updates.email) updates.email = updates.email.trim().toLowerCase();

  users[userIndex] = {
    ...users[userIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  writeUsers(users);
  const { password: _, ...safeUser } = users[userIndex];
  res.json({ success: true, message: "User updated successfully.", user: safeUser });
});

app.get("/api/users", (req, res) => {
  const users = readUsers();
  const safe = users.map(({ password, ...rest }) => rest);
  res.json({ success: true, users: safe });
});

app.get("/api/users/:id", (req, res) => {
  const userId = parseInt(req.params.id);
  const users = readUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({ success: false, error: "User not found." });
  }

  const { password, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

app.listen(PORT, () => {
  console.log(`SeatLock backend running at http://localhost:${PORT}`);
});

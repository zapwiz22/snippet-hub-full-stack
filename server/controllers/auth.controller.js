import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/generateToken.js";

export const signup = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    const findUser = await User.findOne({ username });
    if (findUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const findEmail = await User.findOne({ email: email });
    if (findEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // hashing the passwords
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    if (!newUser) {
      return res.status(400).json({ message: "User creation failed" });
    }

    // generating the jwt token here
    const user = await newUser.save();
    console.log(user);
    const token = generateToken(user._id, res);
    res.status(201).json({
      message: "User created successfully",
      token: token,
      id: user._id,
      username: newUser.username,
      email: newUser.email,
      //   password: newUser.password // just to check if the password is hashed or not
    });
  } catch (e) {
    console.error("Error during signup:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user?.password || ""
    );
    if (!user || !isPasswordCorrect) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const token = generateToken(user._id, res);
    res.status(200).json({
      token: token,
      id: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (e) {
    console.log("Error in login controller", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    // clearing the cookie
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (e) {
    console.log("Error in logout controller", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

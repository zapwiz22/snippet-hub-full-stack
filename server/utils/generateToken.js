import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  // generating the jwt token and saving the cookie too
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "15d",
  });
  res.cookie("jwt", token, {
    httpOnly: true, // prevent XSS attacks cross-site scripting attacks
    sameSite: "strict", // prevent CSRF: cross-site request forgery attacks
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days in milliseconds
  });
  return token;
};

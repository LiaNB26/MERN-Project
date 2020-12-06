const jsonWebToken = require("jsonwebtoken");

const HttpError = require("../models/http-error");
const { PRIVATE_KEY } = require("../util/config");

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      throw new Error("Authentication failed!");
    }

    // validating token and adding user data to request
    const decodedToken = jsonWebToken.verify(token, PRIVATE_KEY);
    req.userData = { userId: decodedToken.userId };
    next();
  } catch (err) {
    return next(new HttpError("Authentication failed!", 403));
  }
};

const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const fs = require("fs");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const cloudinary = require("../util/cloudinary");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;

  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(
      new HttpError("Something went wrong, counld not find place.", 500)
    );
  }

  if (!place) {
    return next(
      new HttpError("Could not find a place for the provided id.", 404)
    );
  }

  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let places;
  try {
    places = await Place.find({ creator: userId });

    // another way to fetch places
    // places = await User.findById(userId).populate("places");
  } catch (err) {
    return next(
      new HttpError("Fetching places failed, please try again later.", 500)
    );
  }

  //if (!places || places.length === 0)
  if (!places) {
    return next(
      new HttpError("Could not find places for the provided user id.", 404)
    );
  }

  if (places.length === 0) {
    return res.json({
      places: [],
    });
  }

  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
      // new HttpError("Failed.", 422)
    );
  }

  const { title, description, address } = req.body;

  const coordinates = getCoordsForAddress(address);

  // if using google api ->
  // let coordinates;
  // try {
  //   coordinates = await getCoordsForAddress(address);
  // } catch (error) {
  //   return next(error);
  // }

  // Upload image to cloudinary
  let result;
  try {
    result = await cloudinary.uploader.upload(req.file.path);
  } catch (err) {
    console.log("Uploading image to cloudinary failed.");
    console.log(err);
  }

  if (!result) {
    return next(
      new HttpError("Signing up failed, please try again later.", 500)
    );
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    creator: req.userData.userId,
    image: result.secure_url,
    cloudinary_id: result.public_id,
  });

  let user;

  try {
    user = await User.findById(req.userData.userId);

    if (!user) {
      return next(
        new HttpError("Could not find user for the provided id.", 404)
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    await createdPlace.save({ session: session });
    await user.places.push(createdPlace);
    await user.save({ session: session });

    await session.commitTransaction();
  } catch (err) {
    console.log(err);
    return next(
      new HttpError("Creating a new place failed, please try again.", 500)
    );
  }

  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let updatedPlace;

  try {
    updatedPlace = await Place.findById(placeId);

    if (updatedPlace.creator.toString() !== req.userData.userId) {
      return next(new HttpError("You are not allowed to edit this place", 401));
    }

    updatedPlace.title = title;
    updatedPlace.description = description;
    await updatedPlace.save();
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not update place.", 500)
    );
  }

  res.status(200).json({ place: updatedPlace.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place, imagePath;
  try {
    place = await Place.findById(placeId).populate("creator");

    if (!place) {
      return next(
        new HttpError("Could not find place for the provided id.", 404)
      );
    }

    if (place.creator.id !== req.userData.userId) {
      return next(
        new HttpError("You are not allowed to delete this place", 401)
      );
    }

    imagePath = place.image;

    const session = await mongoose.startSession();
    session.startTransaction();
    await place.remove({ session: session });
    place.creator.places.pull(place);
    await place.creator.save({ session: session });
    await session.commitTransaction();
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not delete place.", 500)
    );
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.status(200).json({ message: "Deleted place." });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;

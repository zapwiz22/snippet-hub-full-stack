import express from "express";
import {
  addCollection,
  deleteCollection,
  getCollections,
  getSnippetsInCollection,
  updateCollection,
} from "../controllers/collection.controller.js";
import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();

router.post("/add", protectRoute, addCollection); // for adding a new collection

router.delete("/delete/:id", protectRoute, deleteCollection); // for deleting a collection of id {id}

router.get("/get/:userId", protectRoute, getCollections); // for getting all collections of a user

router.get("/snippets/:id", protectRoute, getSnippetsInCollection); // for getting snippets in a collection

router.put("/edit/:id", protectRoute, updateCollection); // for updating a collection of id {id} i.e., adding or removing snippets from it

export default router;

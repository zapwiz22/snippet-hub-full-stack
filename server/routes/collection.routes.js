import express from "express";
import {
  addCollection,
  deleteCollection,
  getCollections,
  getSnippetsInCollection,
  updateCollection,
} from "../controllers/collection.controller.js";
import protectRoute from "../middlewares/protectRoute.js";
import { cacheCollections, cacheSnipsColl, delCollections, delSnipsColl } from "../middlewares/cacheData.js";

const router = express.Router();

router.post("/add", protectRoute,delCollections, addCollection); // for adding a new collection

router.delete("/delete/:id", protectRoute,delCollections, deleteCollection); // for deleting a collection of id {id}

router.get("/get/:userId", protectRoute,cacheCollections, getCollections); // for getting all collections of a user

router.get("/snippets/:id", protectRoute,cacheSnipsColl, getSnippetsInCollection); // for getting snippets in a collection

router.put("/edit/:id", protectRoute,delSnipsColl, updateCollection); // for updating a collection of id {id} i.e., adding or removing snippets from it

export default router;

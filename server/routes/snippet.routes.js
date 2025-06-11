import express from "express";
import {
  addSnippet,
  addSnippetToCollection,
  deleteSnippet,
  getPublicSnippet,
  getSnippets,
  reorderSnippets,
  starSnippet,
  updateSnippet,
} from "../controllers/snippet.controller.js";
import protectRoute from "../middlewares/protectRoute.js";
import { cacheAllSnippets, delAllSnips, delSnipsColl } from "../middlewares/cacheData.js";

const router = express.Router();

router.get("/get/:id", protectRoute, cacheAllSnippets, getSnippets);

router.post("/add/:id", protectRoute,delAllSnips, addSnippet);

router.put("/starred/:id/:snippetId", protectRoute,delAllSnips, starSnippet);

router.put("/edit/:id/:snippetId", protectRoute,delAllSnips, updateSnippet);

router.put("/reorder/:id", protectRoute,delAllSnips, reorderSnippets);

router.get("/public/:userId/:snippetId", getPublicSnippet);

// New route for adding snippets directly to collections
router.post(
  "/add-to-collection/:userId/:collectionId",
  protectRoute,
  delSnipsColl,
  addSnippetToCollection
);

router.delete("/delete/:id/:snippetId", protectRoute,delAllSnips, deleteSnippet);

export default router;

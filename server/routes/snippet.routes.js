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

const router = express.Router();

router.get("/get/:id", protectRoute, getSnippets);

router.post("/add/:id", protectRoute, addSnippet);

router.put("/starred/:id/:snippetId", protectRoute, starSnippet);

router.put("/edit/:id/:snippetId", protectRoute, updateSnippet);

router.put("/reorder/:id", protectRoute, reorderSnippets);

router.get("/public/:userId/:snippetId", getPublicSnippet);

// New route for adding snippets directly to collections
router.post(
  "/add-to-collection/:userId/:collectionId",
  protectRoute,
  addSnippetToCollection
);

router.delete("/delete/:id/:snippetId", protectRoute, deleteSnippet);

export default router;

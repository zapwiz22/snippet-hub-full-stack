import Snippet from "../models/snippet.model.js";
import Collection from "../models/collection.model.js";

// Helper function to check if user has access to modify a snippet
const canUserModifySnippet = async (snippetId, userId) => {
  const snippet = await Snippet.findById(snippetId);
  if (!snippet) {
    return { hasAccess: false, snippet: null, reason: "Snippet not found" };
  }

  // If it's a personal snippet, only the owner can modify
  if (!snippet.collectionId) {
    if (snippet.userId.toString() === userId.toString()) {
      return { hasAccess: true, snippet, reason: null };
    }
    return {
      hasAccess: false,
      snippet,
      reason: "Not the owner of this personal snippet",
    };
  }

  // If it's a collection snippet, check collection access
  const collection = await Collection.findById(snippet.collectionId);
  if (!collection) {
    return { hasAccess: false, snippet, reason: "Collection not found" };
  }

  const isCreator =
    collection.createdBy &&
    collection.createdBy.toString() === userId.toString();
  const isCollaborator =
    collection.users &&
    collection.users.some((user) => user.toString() === userId.toString());

  if (isCreator || isCollaborator) {
    return { hasAccess: true, snippet, reason: null };
  }

  return { hasAccess: false, snippet, reason: "No access to this collection" };
};

export const addSnippet = async (req, res) => {
  try {
    const { title, description, content, contentType, tags } = req.body;
    const userId = req.params.id;

    if (!title || !contentType || !userId) {
      return res
        .status(400)
        .json({ message: "Title, content type, and user ID are required." });
    }

    const newSnippet = new Snippet({
      title,
      description,
      content,
      contentType,
      tags: tags || [],
      userId,
      starred: false,
    });

    await newSnippet.save();

    res
      .status(201)
      .json({ message: "Snippet added successfully", snippet: newSnippet });
  } catch (e) {
    console.log("Error adding snippet:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addSnippetToCollection = async (req, res) => {
  try {
    const { title, description, content, contentType, tags } = req.body;
    const { userId, collectionId } = req.params;

    if (!title || !contentType || !userId || !collectionId) {
      return res.status(400).json({
        message:
          "Title, content type, user ID, and collection ID are required.",
      });
    }

    // Check if user has access to the collection
    const collection = await Collection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    const isCreator =
      collection.createdBy &&
      collection.createdBy.toString() === userId.toString();
    const isCollaborator =
      collection.users &&
      collection.users.some((user) => user.toString() === userId.toString());

    if (!isCreator && !isCollaborator) {
      return res
        .status(403)
        .json({ message: "Access denied to this collection" });
    }

    const newSnippet = new Snippet({
      title,
      description,
      content,
      contentType,
      tags: tags || [],
      userId,
      collectionId,
      starred: false,
    });

    await newSnippet.save();

    // Add snippet to collection
    collection.snippets.push(newSnippet._id);
    await collection.save();

    // Emit real-time update to all users in the collection
    const io = req.app.get("io");
    io.to(`collection-${collectionId}`).emit("snippet-added", {
      snippet: {
        id: newSnippet._id,
        title: newSnippet.title,
        description: newSnippet.description,
        content: newSnippet.content,
        contentType: newSnippet.contentType,
        tags: newSnippet.tags,
        starred: newSnippet.starred,
        createdAt: newSnippet.createdAt,
      },
      collectionId,
    });

    res.status(201).json({
      message: "Snippet added to collection successfully",
      snippet: newSnippet,
    });
  } catch (e) {
    console.log("Error adding snippet to collection:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSnippets = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // Get user's collections to check access
    const userCollections = await Collection.find({
      $or: [{ users: userId }, { createdBy: userId }],
    });

    const accessibleCollectionIds = userCollections.map((col) => col._id);

    // Find snippets that are either:
    // 1. Personal snippets created by the user (no collectionId)
    // 2. Any snippets from collections the user has access to
    const snippets = await Snippet.find({
      $or: [
        {
          userId,
          collectionId: null, // Personal snippets created by user
        },
        {
          collectionId: { $in: accessibleCollectionIds }, // All snippets in accessible collections
        },
      ],
    }).sort({
      position: 1,
      createdAt: 1,
    });

    res
      .status(200)
      .json({ message: "Snippets fetched successfully!", snippets });
  } catch (e) {
    console.log("Error getting snippets:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteSnippet = async (req, res) => {
  try {
    const userId = req.params.id;
    const snippetId = req.params.snippetId;
    if (!userId || !snippetId) {
      return res
        .status(400)
        .json({ message: "User ID and Snippet ID are required." });
    }

    // Check if user can modify this snippet
    const { hasAccess, snippet, reason } = await canUserModifySnippet(
      snippetId,
      userId
    );
    if (!hasAccess) {
      return res.status(404).json({ message: reason || "Snippet not found." });
    }

    // Delete the snippet
    await Snippet.findByIdAndDelete(snippetId);

    // If snippet belonged to a collection, emit real-time update
    if (snippet.collectionId) {
      const io = req.app.get("io");
      io.to(`collection-${snippet.collectionId}`).emit("snippet-deleted", {
        snippetId: snippet._id,
        collectionId: snippet.collectionId,
      });

      // Also remove from collection
      await Collection.findByIdAndUpdate(snippet.collectionId, {
        $pull: { snippets: snippet._id },
      });
    }

    res.status(200).json({ message: "Snippet deleted successfully", snippet });
  } catch (e) {
    console.log("Error deleting snippet:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const starSnippet = async (req, res) => {
  try {
    const userId = req.params.id;
    const snippetId = req.params.snippetId;
    if (!userId || !snippetId) {
      return res
        .status(400)
        .json({ message: "User ID and Snippet ID are required." });
    }

    // Check if user can modify this snippet
    const { hasAccess, snippet, reason } = await canUserModifySnippet(
      snippetId,
      userId
    );
    if (!hasAccess) {
      return res.status(404).json({ message: reason || "Snippet not found." });
    }

    snippet.starred = !snippet.starred;
    await snippet.save();
    res.status(200).json({ message: "Snippet starred successfully" });
  } catch (e) {
    console.log("Error while starring", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateSnippet = async (req, res) => {
  try {
    const userId = req.params.id;
    const snippetId = req.params.snippetId;
    const { title, description, content, contentType, tags } = req.body;

    // Check if user can modify this snippet
    const { hasAccess, snippet, reason } = await canUserModifySnippet(
      snippetId,
      userId
    );
    if (!hasAccess) {
      return res.status(404).json({ message: reason || "Snippet not found." });
    }

    // Update the snippet
    if (title) snippet.title = title;
    if (description) snippet.description = description;
    if (content) snippet.content = content;
    if (contentType) snippet.contentType = contentType;
    if (tags) snippet.tags = tags;
    await snippet.save();

    // If snippet belongs to a collection, emit real-time update
    if (snippet.collectionId) {
      const io = req.app.get("io");

      // Emit to collection room for list updates
      io.to(`collection-${snippet.collectionId}`).emit("snippet-updated", {
        snippet: {
          id: snippet._id,
          title: snippet.title,
          description: snippet.description,
          content: snippet.content,
          contentType: snippet.contentType,
          tags: snippet.tags,
          starred: snippet.starred,
          createdAt: snippet.createdAt,
        },
        collectionId: snippet.collectionId,
      });

      // Also emit to snippet editing room for real-time collaboration
      io.to(`snippet-edit-${snippet._id}`).emit("snippet-saved-by-server", {
        snippet: {
          id: snippet._id,
          title: snippet.title,
          description: snippet.description,
          content: snippet.content,
          contentType: snippet.contentType,
          tags: snippet.tags,
          starred: snippet.starred,
          createdAt: snippet.createdAt,
        },
        savedBy: userId,
        timestamp: Date.now(),
      });
    }

    res.status(200).json({ message: "Snippet updated successfully", snippet });
  } catch (e) {
    console.log("Error updating snippet:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const reorderSnippets = async (req, res) => {
  try {
    const userId = req.params.id;
    const { snippetOrders } = req.body;
    if (!userId || !snippetOrders || !Array.isArray(snippetOrders)) {
      return res.status(400).json({ message: "Invalid request data." });
    }
    const snippets = await Snippet.find({ userId: userId });
    const updatedSnippets = await Promise.all(
      snippetOrders.map(async (orderItem) => {
        const snippet = snippets.find((s) => s._id.toString() === orderItem.id);
        if (snippet) {
          snippet.position = orderItem.position;
          return await snippet.save();
        }
        return null;
      })
    );
    const validUpdatedSnippets = updatedSnippets.filter(
      (snippet) => snippet !== null
    );
    res.status(200).json({
      message: "Snippets reordered successfully",
      snippets: validUpdatedSnippets,
    });
  } catch (e) {
    console.log("Error reordering snippets:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getPublicSnippet = async (req, res) => {
  try {
    const { userId, snippetId } = req.params;

    const snippet = await Snippet.findOne({
      _id: snippetId,
      userId: userId,
    });

    if (!snippet) {
      return res.status(404).json({ message: "Snippet not found" });
    }

    res.status(200).json({
      message: "Snippet fetched successfully",
      snippet,
    });
  } catch (error) {
    console.error("Error fetching public snippet:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

import Collection from "../models/collection.model.js";

// add a new collection
export const addCollection = async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user._id;

  try {
    const newCollection = new Collection({
      name,
      description,
      users: [userId],
    });

    await newCollection.save();

    // Populate the users field to match frontend expectations
    await newCollection.populate("users", "email name");

    // Transform the response to match frontend expectations
    const responseCollection = {
      ...newCollection.toObject(),
      collaborators: newCollection.users,
    };

    res.status(201).json({
      message: "Collection created successfully",
      collection: responseCollection,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating collection", error: error.message });
  }
};

// delete a collection by id
export const deleteCollection = async (req, res) => {
  const { id } = req.params;

  try {
    const collection = await Collection.findByIdAndDelete(id);
    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }
    res.status(200).json({ message: "Collection deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting collection", error: error.message });
  }
};

// get all the collections to which the user belongs
export const getCollections = async (req, res) => {
  const userId = req.params.userId;

  try {
    const collections = await Collection.find({ users: userId })
      .populate("snippets")
      .populate("users", "email name");

    // Transform the data to match frontend expectations
    const transformedCollections = collections.map((collection) => ({
      ...collection.toObject(),
      collaborators: collection.users, // Rename users to collaborators for frontend
    }));

    res.status(200).json(transformedCollections);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching collections", error: error.message });
  }
};

// to get the snippets per collection
export const getSnippetsInCollection = async (req, res) => {
  try {
    const collectionId = req.params.id;
    const userId = req.user._id;

    const collection = await Collection.findById(collectionId)
      .populate("snippets")
      .populate("users", "username email");

    if (!collection) {
      return res.status(200).json({
        message: "Collection not found",
        name: "Collection",
        description: "",
        snippets: [],
        collaborators: [],
      });
    }

    // Check if user has access to this collection
    const isCreator = collection.createdBy
      ? collection.createdBy.toString() === userId.toString()
      : false;

    const isCollaborator =
      collection.users && collection.users.length > 0
        ? collection.users.some(
            (user) => user._id.toString() === userId.toString()
          )
        : false;

    const hasAccess = isCreator || isCollaborator;

    if (!hasAccess) {
      return res.status(200).json({
        message: "Access denied",
        name: "Collection",
        description: "",
        snippets: [],
        collaborators: [],
      });
    }

    const responseData = {
      _id: collection._id,
      name: collection.name || "Collection",
      description: collection.description || "",
      snippets: collection.snippets || [],
      collaborators: collection.users || [],
      createdBy: collection.createdBy,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching collection snippets:", error);
    res.status(200).json({
      message: "Server error",
      name: "Collection",
      description: "",
      snippets: [],
      collaborators: [],
    });
  }
};

// update a collection by id (add or remove snippets) or (add users by email (but id will be added to the users array))
export const updateCollection = async (req, res) => {
  const { id } = req.params;
  const { users, snippets } = req.body;

  try {
    const collection = await Collection.findById(id);
    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    const userId = req.user._id;
    const isCreator =
      collection.createdBy &&
      collection.createdBy.toString() === userId.toString();
    const isCollaborator =
      collection.users &&
      collection.users.some((user) => user.toString() === userId.toString());

    if (!isCreator && !isCollaborator) {
      return res
        .status(403)
        .json({ message: "Access denied to modify this collection" });
    }

    if (snippets) {
      collection.snippets = snippets;
    }
    if (users) {
      // Find users by email and add their IDs
      const User = (await import("../models/user.model.js")).default;
      const userEmails = Array.isArray(users) ? users : [users];
      const foundUsers = await User.find({ email: { $in: userEmails } });

      if (foundUsers.length === 0) {
        return res
          .status(404)
          .json({ message: "No users found with provided emails" });
      }

      const userIds = foundUsers.map((user) => user._id);
      collection.users = [...new Set([...collection.users, ...userIds])]; // Ensure unique users

      // Emit real-time update to all users in the collection
      const io = req.app.get("io");
      io.to(`collection-${id}`).emit("collection-updated", {
        collectionId: id,
        newCollaborators: foundUsers.map((user) => ({
          _id: user._id,
          email: user.email,
          username: user.username,
        })),
      });
    }

    await collection.save();
    res
      .status(200)
      .json({ message: "Collection updated successfully", collection });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating collection", error: error.message });
  }
};

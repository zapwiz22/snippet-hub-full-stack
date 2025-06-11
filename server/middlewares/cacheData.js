import { redisClient } from "../db/redis.js";

// cache function for all snippets
export async function cacheAllSnippets(req, res, next) {
  try {
    const userId = req.params.id;
    const cacheKey = `snippets:${userId}`;
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log("Cache data found");
      return res.status(200).json({
        message: "Snippets fetched from cache",
        snippets: JSON.parse(cachedData),
      });
    }
    next();
  } catch (e) {
    console.log("Error fetching snippets from cache:", e);
    res.status(500).json({ messaage: "Internal server error" });
  }
}

// deletion of all snips cache on change
export async function delAllSnips(req, res, next) {
  try {
    const userId = req.params.id;
    const cacheKey = `snippets:${userId}`;
    await redisClient.del(cacheKey);
    console.log("Cache cleared for snippets",userId);
    next();
  } catch (e) {
    console.log("Error clearing cache for snippets:", e);
    res.status(500).json({ message: "Internal server error" });
  }
}

// cache function for collections of a user 
export async function cacheCollections(req,res,next) {
    try {
        const userId = req.params.userId;
        const cacheKey = `collections:${userId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log("Cache data found for collections");
            return res.status(200).json(JSON.parse(cachedData));
        }
        next();
    } catch(e) {
        console.log("Error fetching collections from cache:", e);
        res.status(500).json({ message: "Internal server error" });
    }
}

// deletion of collections cache on change
export async function delCollections(req, res, next) {
  try {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    const cacheKey = `collections:${userId}`;
    await redisClient.del(cacheKey);
    console.log("Cache cleared for collections", userId);
    next();
  } catch (e) {
    console.log("Error clearing cache for collections:", e);
    res.status(500).json({ message: "Internal server error" });
  }
}

// cache function for snippets in a collection 
export async function cacheSnipsColl(req,res,next) {
    try {
        const collId = req.params.id;
        const cacheKey = `snippetsInCollection:${collId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log("Cache data found for snippets in collection");
            return res.status(200).json(JSON.parse(cachedData));
        }
    } catch(e) {
        console.log("Error fetching snippets in collection from cache:", e);
        res.status(500).json({ message: "Internal server error" });
    }
}

// deletion of snippets in collection cache on change
export async function delSnipsColl(req, res, next) {
  try {
    const collId = req.params.collectionId;
    const cacheKey = `snippetsInCollection:${collId}`;
    await redisClient.del(cacheKey);
    console.log("Cache cleared for snippets in collection", collId);
    next();
  } catch (e) {
    console.log("Error clearing cache for snippets in collection:", e);
    res.status(500).json({ message: "Internal server error" });
  }
}


import mongoose from "mongoose";

const snippetSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    contentType: {
      type: String,
      enum: ["code", "link", "text", "file"],
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    starred: {
      type: Boolean,
      default: false,
    },
    position: {
      type: Number,
      default: 0,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      default: null, // null means it's a personal snippet
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Snippet = mongoose.model("Snippet", snippetSchema);

export default Snippet;

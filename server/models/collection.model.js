import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    snippets: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Snippet",
      default: [],
    },
    users: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Collection = mongoose.model("Collection", collectionSchema);

export default Collection;

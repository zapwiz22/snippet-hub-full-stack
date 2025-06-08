import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSnippets } from "../hooks/useSnippets";
import { saveFile } from "../utils/fileStorage";

const Add = () => {
  const navigate = useNavigate();
  const { refreshSnippets } = useSnippets();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState("code");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [file, setFile] = useState(null);

  const authData = useMemo(() => {
    try {
      const userId = JSON.parse(localStorage.getItem("userId"));
      const token = localStorage.getItem("token");
      return { userId, token };
    } catch (error) {
      return { userId: null, token: null };
    }
  }, []);

  const handleTagInput = (e) => {
    if (e.key === "Enter" && tagInput.trim() !== "") {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }
    try {
      const { userId, token } = authData;
      if (!userId) {
        alert("User not authenticated");
        return;
      }
      const snippetData = {
        title,
        description,
        content: file ? "" : content,
        contentType,
        tags,
      };

      const response = await fetch(
        `https://snippet-hub-full-stack.onrender.com//api/snippet/add/${userId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(snippetData),
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        // if file upload save file to indexedDB
        if (file && contentType === "file") {
          await saveFile(data.snippet._id, file);
        }
        setTitle("");
        setDescription("");
        setContent("");
        setContentType("code");
        setTags([]);
        setFile(null);
        setSuccessMessage("Snippet added successfully!");

        await refreshSnippets();

        setTimeout(() => {
          setSuccessMessage("");
          navigate(`/snippet/${data.snippet._id}`, { replace: true });
        }, 1000);
      } else {
        alert(data.message || "Failed to add snippet");
      }
    } catch (error) {
      console.error("Error adding snippet:", error);
      alert("Network error. Please try again.");
    }
  };

  return (
    <div className="mt-5 mb-4">
      <h1 className="text-xl font-bold mb-4 text-purple-700">
        Add New Snippet
      </h1>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {successMessage}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500"
      >
        <div className="mb-4">
          <label
            className="block text-gray-700 font-medium mb-2"
            htmlFor="title"
          >
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter snippet title"
            required
          />
        </div>
        <div className="mb-4">
          <label
            className="block text-gray-700 font-medium mb-2"
            htmlFor="description"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter a brief description"
            rows="2"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Content Type
          </label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="code"
                checked={contentType === "code"}
                onChange={() => setContentType("code")}
                className="form-radio text-purple-500 focus:ring-purple-500"
              />
              <span className="ml-2 text-gray-700">Code</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="link"
                checked={contentType === "link"}
                onChange={() => setContentType("link")}
                className="form-radio text-purple-500 focus:ring-purple-500"
              />
              <span className="ml-2 text-gray-700">Link</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="text"
                checked={contentType === "text"}
                onChange={() => setContentType("text")}
                className="form-radio text-purple-500 focus:ring-purple-500"
              />
              <span className="ml-2 text-gray-700">Text</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="text"
                checked={contentType === "file"}
                onChange={() => setContentType("file")}
                className="form-radio text-purple-500 focus:ring-purple-500"
              />
              <span className="ml-2 text-gray-700">File</span>
            </label>
          </div>
        </div>
        <div className="mb-4">
          <label
            className="block text-gray-700 font-medium mb-2"
            htmlFor="content"
          >
            {contentType === "code"
              ? "Code"
              : contentType === "link"
              ? "URL"
              : contentType === "text"
              ? "Text"
              : "File Upload"}
          </label>
          {contentType === "code" ? (
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Write your code here"
              rows="7"
              required
            />
          ) : contentType === "link" ? (
            <input
              type="url"
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="https://example.com"
              required
            />
          ) : contentType === "text" ? (
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter your text"
              rows="5"
              required
            />
          ) : (
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
                 file:rounded-md file:border-0 file:text-sm file:font-semibold
                 file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200
                 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          )}
        </div>
        <div className="mb-4">
          <label
            className="block text-gray-700 font-medium mb-2"
            htmlFor="tags"
          >
            Tags
          </label>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-purple-100 text-purple-600 text-xs font-medium rounded-md flex items-center"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-purple-500 hover:text-purple-700 dark:hover:text-purple-400 focus:outline-none"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInput}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Add tags (press Enter after each tag)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Press Enter to add each tag
          </p>
        </div>
        <div className="mt-6">
          <button
            type="submit"
            className="px-4 py-2 bg-purple-500 text-white font-medium rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200"
          >
            Save Snippet
          </button>
        </div>
      </form>
    </div>
  );
};

export default Add;

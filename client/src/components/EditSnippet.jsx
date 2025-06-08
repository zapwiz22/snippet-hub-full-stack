import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useRecoilState } from "recoil";
import { snippetsAtom } from "../recoil/atoms/snippetsAtom";
import { saveFile, getFile } from "../utils/fileStorage";
import { useCollaborativeEdit } from "../hooks/useCollaborativeEdit.js";
import CollaborativeInput from "./CollaborativeInput";
import CollaborativeTextarea from "./CollaborativeTextarea";
import ConnectionMonitor from "./ConnectionMonitor";

const EditSnippet = () => {
  const { id } = useParams();
  const location = useLocation();
  const [snippets, setSnippets] = useRecoilState(snippetsAtom);
  const navigate = useNavigate();

  // whether edit has come from collection or not
  const isCollectionContext = useMemo(() => {
    const referrer = document.referrer;
    const isFromCollection =
      referrer.includes("/collections/") ||
      location.state?.fromCollection ||
      sessionStorage.getItem("editingFromCollection") === "true";

    return isFromCollection;
  }, [location.state]);

  const authData = useMemo(() => {
    try {
      const userId = JSON.parse(localStorage.getItem("userId"));
      const token = localStorage.getItem("token");
      return { userId, token };
    } catch (error) {
      return { userId: null, token: null };
    }
  }, []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState("code");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [file, setFile] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [replaceFile, setReplaceFile] = useState(false);

  const snippet = snippets.find((s) => s.id == id);

  // Initialize collaborative editing with context
  const {
    isConnected,
    activeUsers,
    remoteChanges,
    isSyncing,
    isLocallyEditing,
    sendContentChange,
    sendCursorPosition,
    sendSave,
    socket,
  } = useCollaborativeEdit(
    id,
    authData.userId,
    null, // Remove initialData dependency that causes re-renders
    {
      isCollectionContext,
    }
  );

  useEffect(() => {
    const fetchFileData = async () => {
      if (snippet && snippet.contentType === "file") {
        try {
          const fileData = await getFile(snippet.id);
          setCurrentFile(fileData);
        } catch (error) {
          console.error("Error fetching file:", error);
        }
      }
    };

    if (snippet) {
      setTitle(snippet.title);
      setDescription(snippet.description);
      setContent(snippet.content);
      setContentType(snippet.contentType || "code");
      setTags(snippet.tags || []);

      if (snippet.contentType === "file") {
        fetchFileData();
      }
    }
  }, [snippet]);

  // Handle collaborative field changes
  const handleTitleChange = useCallback(
    (newTitle) => {
      setTitle(newTitle);
      sendContentChange("title", newTitle);
    },
    [sendContentChange]
  );

  const handleDescriptionChange = useCallback(
    (newDescription) => {
      setDescription(newDescription);
      sendContentChange("description", newDescription);
    },
    [sendContentChange]
  );

  const handleContentChange = useCallback(
    (newContent) => {
      setContent(newContent);
      sendContentChange("content", newContent);
    },
    [sendContentChange]
  );

  const handleContentTypeChange = useCallback(
    (newType) => {
      setContentType(newType);
      sendContentChange("contentType", newType);
    },
    [sendContentChange]
  );

  const handleTagsChange = useCallback(
    (newTags) => {
      setTags(newTags);
      sendContentChange("tags", newTags);
    },
    [sendContentChange]
  );

  // Handle cursor position changes
  const handleCursorChange = useCallback(
    (field, position) => {
      sendCursorPosition(field, position);
    },
    [sendCursorPosition]
  );

  // Apply remote changes
  useEffect(() => {
    if (remoteChanges) {
      switch (remoteChanges.field) {
        case "title":
          setTitle(remoteChanges.value);
          break;
        case "description":
          setDescription(remoteChanges.value);
          break;
        case "content":
          setContent(remoteChanges.value);
          break;
        case "contentType":
          setContentType(remoteChanges.value);
          break;
        case "tags":
          setTags(remoteChanges.value);
          break;
        default:
          break;
      }
    }
  }, [remoteChanges]);

  // Get user color for active users
  const getUserColor = (userId) => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E9",
    ];
    const hash = userId
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Early return after all hooks
  if (!snippet) {
    return <div>Snippet not found.</div>;
  }

  const handleTagInput = (e) => {
    if (e.key === "Enter" && tagInput.trim() !== "") {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        const newTags = [...tags, tagInput.trim()];
        handleTagsChange(newTags);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    handleTagsChange(newTags);
  };

  const handleSave = async () => {
    const updatedSnippet = {
      ...snippet,
      title,
      description,
      content: contentType === "file" ? "" : content,
      contentType,
      tags,
    };

    const updatedSnippets = snippets.map((s) =>
      s.id === snippet.id ? updatedSnippet : s
    );

    setSnippets(updatedSnippets);

    try {
      const { userId } = authData;
      const response = await fetch(
        `https://snippet-hub-full-stack.onrender.com/api/snippet/edit/${userId}/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authData.token}`,
          },
          credentials: "include",
          body: JSON.stringify(updatedSnippet),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to update snippet:", errorData);
        alert("Failed to update snippet");
        return;
      }

      if (file && contentType === "file") {
        try {
          await saveFile(snippet.id, file);
        } catch (error) {
          console.error("Error saving file:", error);
        }
      }

      // Send save notification to other collaborative users
      sendSave(updatedSnippet);

      navigate(`/snippet/${id}`);
    } catch (error) {
      console.error("Error updating snippet:", error);
      alert("Network error. Please try again.");
    }
  };

  return (
    <div className="col-span-10 m-5">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-purple-700">Edit Snippet</h1>

        {/* Collaborative editing status */}
        <div className="flex items-center space-x-4">
          {activeUsers.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {activeUsers.length} other{activeUsers.length === 1 ? "" : "s"}{" "}
                editing
              </span>
              <div className="flex space-x-1">
                {activeUsers.map((user) => (
                  <div
                    key={user.userId}
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-white"
                    style={{
                      backgroundColor: getUserColor(user.userId),
                    }}
                    title={`User: ${
                      user.username || user.email || user.userId
                    }`}
                  >
                    {(user.username || user.email || user.userId)
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
        <div className="mb-4">
          <label
            className="block text-gray-700 font-medium mb-2"
            htmlFor="title"
          >
            Title
          </label>
          <CollaborativeInput
            id="title"
            value={title}
            onChange={handleTitleChange}
            onCursorChange={handleCursorChange}
            remoteChanges={remoteChanges}
            activeUsers={activeUsers}
            field="title"
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
          <CollaborativeTextarea
            id="description"
            value={description}
            onChange={handleDescriptionChange}
            onCursorChange={handleCursorChange}
            remoteChanges={remoteChanges}
            activeUsers={activeUsers}
            field="description"
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
                onChange={() => handleContentTypeChange("code")}
                className="form-radio text-purple-500 focus:ring-purple-500"
              />
              <span className="ml-2 text-gray-700">Code</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="link"
                checked={contentType === "link"}
                onChange={() => handleContentTypeChange("link")}
                className="form-radio text-purple-500 focus:ring-purple-500"
              />
              <span className="ml-2 text-gray-700">Link</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="text"
                checked={contentType === "text"}
                onChange={() => handleContentTypeChange("text")}
                className="form-radio text-purple-500 focus:ring-purple-500"
              />
              <span className="ml-2 text-gray-700">Text</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="file"
                checked={contentType === "file"}
                onChange={() => handleContentTypeChange("file")}
                className="form-radio text-purple-500 focus:ring-purple-500"
              />
              <span className="ml-2 text-gray-700">File</span>
            </label>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            {contentType === "code"
              ? "Code"
              : contentType === "link"
              ? "URL"
              : contentType === "text"
              ? "Text"
              : "File"}
          </label>

          {contentType === "code" ? (
            <CollaborativeTextarea
              id="content"
              value={content}
              onChange={handleContentChange}
              onCursorChange={handleCursorChange}
              remoteChanges={remoteChanges}
              activeUsers={activeUsers}
              field="content"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Write your code here"
              rows="7"
              required
            />
          ) : contentType === "link" ? (
            <CollaborativeInput
              type="url"
              id="content"
              value={content}
              onChange={handleContentChange}
              onCursorChange={handleCursorChange}
              remoteChanges={remoteChanges}
              activeUsers={activeUsers}
              field="content"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="https://example.com"
              required
            />
          ) : contentType === "text" ? (
            <CollaborativeTextarea
              id="content"
              value={content}
              onChange={handleContentChange}
              onCursorChange={handleCursorChange}
              remoteChanges={remoteChanges}
              activeUsers={activeUsers}
              field="content"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter your text"
              rows="5"
              required
            />
          ) : (
            <div className="space-y-3">
              {currentFile && !replaceFile && (
                <div className="bg-gray-100 p-4 rounded flex items-center justify-between">
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="size-6 text-purple-600 mr-2"
                    >
                      <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
                      <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
                    </svg>
                    <div>
                      <p className="font-medium">{currentFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(currentFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplaceFile(true)}
                    className="text-sm text-purple-600 hover:text-purple-800"
                  >
                    Replace
                  </button>
                </div>
              )}
              {(replaceFile || !currentFile) && (
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0 file:text-sm file:font-semibold
                    file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200
                    focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              )}
              {replaceFile && currentFile && (
                <button
                  type="button"
                  onClick={() => {
                    setReplaceFile(false);
                    setFile(null);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel replacement
                </button>
              )}
            </div>
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

        <button
          onClick={handleSave}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          Save
        </button>
      </div>

      {/* Connection Monitor for debugging - can be removed in production */}
      {process.env.NODE_ENV === "development" && (
        <ConnectionMonitor socket={socket} type="collaborative" />
      )}
    </div>
  );
};

export default EditSnippet;

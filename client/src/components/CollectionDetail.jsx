import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecoilState } from "recoil";
import { snippetsAtom } from "../recoil/atoms/snippetsAtom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Card from "./Card";
import { useWebSocket } from "../hooks/useWebSocket.js";

const CollectionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [snippets, setSnippets] = useRecoilState(snippetsAtom);
  const [collectionSnippets, setCollectionSnippets] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddSnippetModal, setShowAddSnippetModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingSnippet, setAddingSnippet] = useState(false);

  // Add snippet form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState("code");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
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

  // WebSocket event handlers
  const handleSnippetAdded = useCallback((snippet) => {
    setCollectionSnippets((prev) => [...prev, snippet]);
  }, []);

  const handleSnippetUpdated = useCallback((snippet) => {
    setCollectionSnippets((prev) =>
      prev.map((s) => (s.id === snippet.id ? snippet : s))
    );
  }, []);

  const handleSnippetDeleted = useCallback((snippetId) => {
    setCollectionSnippets((prev) => prev.filter((s) => s.id !== snippetId));
  }, []);

  const handleCollectionUpdated = useCallback((data) => {
    if (data.newCollaborators) {
      setCollection((prev) => ({
        ...prev,
        collaborators: [
          ...(prev?.collaborators || []),
          ...data.newCollaborators,
        ],
      }));
    }
  }, []);

  // Initialize WebSocket connection
  useWebSocket(
    id,
    handleSnippetAdded,
    handleSnippetUpdated,
    handleSnippetDeleted,
    handleCollectionUpdated
  );

  // Fetch collection details and snippets
  useEffect(() => {
    const fetchCollectionData = async () => {
      if (!authData.userId || !authData.token) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log(`Fetching collection ${id}`);

        const response = await fetch(
          `http://localhost:3000/api/collection/snippets/${id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authData.token}`,
            },
            credentials: "include",
          }
        );

        // Check if response is actually JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Server returned non-JSON response");
        }

        const data = await response.json();
        console.log("Received data:", data); // Debug log

        // Always treat as success if we get valid JSON, handle empty data gracefully
        setCollection({
          _id: data._id || id,
          name: data.name || "Collection",
          description: data.description || "",
          collaborators: data.collaborators || [],
          createdBy: data.createdBy,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });

        // Handle snippets array
        const snippetsArray = data.snippets || [];
        const transformedSnippets = snippetsArray.map((snippet) => ({
          id: snippet._id,
          title: snippet.title || "Untitled",
          description: snippet.description || "",
          content: snippet.content || "",
          contentType: snippet.contentType || "code",
          tags: snippet.tags || [],
          starred: snippet.starred || false,
          createdAt: snippet.createdAt,
        }));

        setCollectionSnippets(transformedSnippets);
      } catch (error) {
        console.error("Error fetching collection:", error);

        // Set a default collection state instead of error
        setCollection({
          _id: id,
          name: "Collection",
          description: "",
          collaborators: [],
        });
        setCollectionSnippets([]);

        // Only set error for actual network issues
        if (
          error.message.includes("fetch") ||
          error.message.includes("network")
        ) {
          setError("Network error. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCollectionData();
  }, [id, authData.userId, authData.token]);

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      const response = await fetch(
        `http://localhost:3000/api/collection/edit/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authData.token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            users: [inviteEmail],
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("User invited successfully!");
        setInviteEmail("");
        setShowInviteModal(false);
        // Refresh collection data to show updated collaborators
        window.location.reload();
      } else {
        alert(data.message || "Failed to invite user");
      }
    } catch (error) {
      console.error("Error inviting user:", error);
      alert("Network error. Please try again.");
    }
  };

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

  const handleAddSnippet = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    setAddingSnippet(true);

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

      // Use the new collection-specific endpoint
      const response = await fetch(
        `http://localhost:3000/api/snippet/add-to-collection/${userId}/${id}`,
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
        // Reset form
        setTitle("");
        setDescription("");
        setContent("");
        setContentType("code");
        setTags([]);
        setFile(null);
        setShowAddSnippetModal(false);

        // Show success message
        console.log(
          "Snippet added successfully! Real-time update should appear shortly."
        );
        // Real-time update will be handled by WebSocket
      } else {
        alert(data.message || "Failed to create snippet");
      }
    } catch (error) {
      console.error("Error adding snippet:", error);
      alert("Network error. Please try again.");
    } finally {
      setAddingSnippet(false);
    }
  };

  // Drag and drop functionality
  const moveCard = useCallback(
    (dragIndex, hoverIndex) => {
      let updatedSnippets;
      setCollectionSnippets((prevSnippets) => {
        const newSnippets = [...prevSnippets];
        const draggedItem = newSnippets[dragIndex];
        newSnippets.splice(dragIndex, 1);
        newSnippets.splice(hoverIndex, 0, draggedItem);
        updatedSnippets = newSnippets;
        return newSnippets;
      });

      // Optionally save the new order to backend
      // You can implement this similar to other components if needed
    },
    [setCollectionSnippets]
  );

  if (loading) {
    return (
      <div className="p-5 flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        <p className="mt-4 text-gray-600">Loading collection...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 text-center">
        <div className="text-red-600 text-xl mb-4">{error}</div>
        <button
          onClick={() => navigate("/collections")}
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md"
        >
          Back to Collections
        </button>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="p-5 text-center text-xl text-gray-600">
        Collection not found.
      </div>
    );
  }

  return (
    <div className="p-5">
      {/* Header with action buttons */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {collection?.name || "Collection"}
          </h1>
          <p className="text-gray-600 mt-2">
            {collection?.description || "No description"}
          </p>
          <div className="mt-2 flex gap-4 text-sm text-gray-500">
            <span>{(collectionSnippets || []).length} snippets</span>
            <span>
              {(collection?.collaborators || []).length} collaborators
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddSnippetModal(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center transition-colors duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Snippet
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center transition-colors duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Invite Member
          </button>
        </div>
      </div>

      {/* Snippets Grid */}
      {!collectionSnippets || collectionSnippets.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-gray-500 text-lg mb-4">
            No snippets in this collection yet.
          </p>
          <button
            onClick={() => setShowAddSnippetModal(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
          >
            Add Your First Snippet
          </button>
        </div>
      ) : (
        <DndProvider backend={HTML5Backend}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collectionSnippets.map((snippet, index) => (
              <Card
                key={snippet.id}
                id={snippet.id}
                title={snippet.title || "Untitled"}
                description={snippet.description || "No description"}
                tags={snippet.tags || []}
                starred={snippet.starred || false}
                index={index}
                moveCard={moveCard}
              />
            ))}
          </div>
        </DndProvider>
      )}

      {/* Add Snippet Modal */}
      {showAddSnippetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                Add New Snippet
              </h2>
              <button
                onClick={() => setShowAddSnippetModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddSnippet}>
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
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="code"
                      checked={contentType === "code"}
                      onChange={(e) => setContentType(e.target.value)}
                      className="mr-2"
                    />
                    Code/Text
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="file"
                      checked={contentType === "file"}
                      onChange={(e) => setContentType(e.target.value)}
                      className="mr-2"
                    />
                    File Upload
                  </label>
                </div>
              </div>

              {contentType === "code" ? (
                <div className="mb-4">
                  <label
                    className="block text-gray-700 font-medium mb-2"
                    htmlFor="content"
                  >
                    Content
                  </label>
                  <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter your code or text here"
                    rows="6"
                  />
                </div>
              ) : (
                <div className="mb-4">
                  <label
                    className="block text-gray-700 font-medium mb-2"
                    htmlFor="file"
                  >
                    Upload File
                  </label>
                  <input
                    type="file"
                    id="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              <div className="mb-4">
                <label
                  className="block text-gray-700 font-medium mb-2"
                  htmlFor="tags"
                >
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-sm flex items-center"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-purple-400 hover:text-purple-600"
                      >
                        ×
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

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddSnippetModal(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingSnippet}
                  className={`px-4 py-2 text-white rounded-lg font-medium transition-colors duration-200 ${
                    addingSnippet
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-purple-500 hover:bg-purple-600"
                  }`}
                >
                  {addingSnippet ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Adding...
                    </div>
                  ) : (
                    "Add Snippet"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Invite Member
            </h2>
            <form onSubmit={handleInviteUser}>
              <div className="mb-6">
                <label
                  htmlFor="inviteEmail"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="inviteEmail"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionDetail;

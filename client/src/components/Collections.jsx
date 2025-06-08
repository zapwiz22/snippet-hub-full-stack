import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const Collections = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [hoveredCollection, setHoveredCollection] = useState(null);
  const navigate = useNavigate();

  const authData = useMemo(() => {
    try {
      const userId = JSON.parse(localStorage.getItem("userId"));
      const token = localStorage.getItem("token");
      return { userId, token };
    } catch (error) {
      return { userId: null, token: null };
    }
  }, []);

  useEffect(() => {
    const fetchCollections = async () => {
      if (!authData.token || !authData.userId) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `http://localhost:3000/api/collection/get/${authData.userId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authData.token}`,
            },
            credentials: "include",
          }
        );

        const data = await response.json();

        if (response.ok) {
          setCollections(data || []);
        } else {
          setError(data.message || "Failed to fetch collections");
        }
      } catch (error) {
        console.error("Error fetching collections:", error);
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, [authData.token, authData.userId]);

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    if (!authData.token) {
      alert("User not authenticated");
      return;
    }

    try {
      console.log(authData.userId);
      const response = await fetch(`http://localhost:3000/api/collection/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authData.token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          name: newCollectionName,
          description: newCollectionDescription,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCollections([...collections, data.collection]);
        setNewCollectionName("");
        setNewCollectionDescription("");
        setShowCreateModal(false);
      } else {
        alert(data.message || "Failed to create collection");
      }
    } catch (error) {
      console.error("Error creating collection:", error);
      alert("Network error. Please try again.");
    }
  };

  const handleCollectionClick = (collectionId) => {
    navigate(`/collections/${collectionId}`);
  };

  if (loading) {
    return (
      <div className="p-5 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        <p className="ml-4 text-gray-600">Loading collections...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 text-center">
        <div className="text-red-600 text-xl mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-5">
      {/* button and the heading */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-purple-700">Collections</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="text-sm bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center transition-colors duration-200"
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
          New Collection
        </button>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No collections yet
          </h3>
          <p className="text-gray-500 mb-6">
            Create your first collection to organize your snippets
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Create Collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <div
              key={collection._id}
              onClick={() => handleCollectionClick(collection._id)}
              onMouseEnter={() => setHoveredCollection(collection._id)}
              onMouseLeave={() => setHoveredCollection(null)}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 hover:border-purple-300 p-6 relative"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-800 truncate pr-2">
                  {collection.name}
                </h3>
                <div className="flex flex-col items-end gap-1">
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                    {collection.snippets?.length || 0} snippets
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                    {collection.collaborators?.length || 1} users
                  </span>
                </div>
              </div>

              <p className="text-gray-600 mb-4 line-clamp-3 text-sm leading-relaxed">
                {collection.description || "No description provided"}
              </p>

              <div className="border-t pt-3">
                <span className="text-gray-400 text-xs">
                  Created: {new Date(collection.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* who are the members on hovering */}
              {hoveredCollection === collection._id &&
                collection.collaborators &&
                collection.collaborators.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 text-white p-3 rounded-lg shadow-lg z-10">
                    <div className="text-xs font-medium mb-2">
                      Collaborators:
                    </div>
                    <div className="space-y-1">
                      {collection.collaborators.map((collaborator, index) => (
                        <div key={index} className="text-xs text-gray-300">
                          {collaborator.email ||
                            collaborator.name ||
                            `User ${index + 1}`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}

      {/* creating new collection modal */}
      {!!showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Create New Collection
            </h2>
            <form onSubmit={handleCreateCollection}>
              <div className="mb-4">
                <label
                  htmlFor="collectionName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Collection Name
                </label>
                <input
                  type="text"
                  id="collectionName"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Enter collection name"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="mb-6">
                <label
                  htmlFor="collectionDescription"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Description (Optional)
                </label>
                <textarea
                  id="collectionDescription"
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  placeholder="Enter collection description"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  Create Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Collections;

import React, { useCallback, useEffect, useMemo } from "react";
import Card from "./Card";
import { useRecoilState } from "recoil";
import {
  snippetsAtom,
  snippetsLoadingAtom,
  snippetsErrorAtom,
} from "../recoil/atoms/snippetsAtom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const AllCards = () => {
  const [snippets, setSnippets] = useRecoilState(snippetsAtom);
  const [loading, setLoading] = useRecoilState(snippetsLoadingAtom);
  const [error, setError] = useRecoilState(snippetsErrorAtom);

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
    const fetchSnippets = async () => {
      if (!authData.userId || !authData.token) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      if (snippets.length > 0) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `http://localhost:3000/api/snippet/get/${authData.userId}`,
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
        console.log(data); // checking data
        if (response.ok) {
          const transformedSnippets = data.snippets.map((snippet) => ({
            id: snippet._id,
            title: snippet.title,
            description: snippet.description,
            content: snippet.content,
            contentType: snippet.contentType,
            tags: snippet.tags,
            starred: snippet.starred,
            createdAt: snippet.createdAt,
          }));
          setSnippets(transformedSnippets);
        } else {
          setError(data.message || "Failed to fetch snippets");
        }
      } catch (error) {
        console.error("Error fetching snippets:", error);
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchSnippets();
  }, [
    authData.userId,
    authData.token,
    setSnippets,
    setLoading,
    setError,
    snippets.length,
  ]);

  const saveSnippetOrder = useCallback(
    async (snippets) => {
      try {
        const { userId, token } = authData;
        if (!userId || !token) {
          console.error("No auth data available for reorder");
          return;
        }

        const snippetOrders = snippets.map((snippet, index) => ({
          id: snippet.id,
          position: index,
        }));
        const response = await fetch(
          `http://localhost:3000/api/snippet/reorder/${userId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
            body: JSON.stringify({ snippetOrders }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Failed to save snippet order:", errorData);
        } else {
          console.log("Snippet order saved successfully");
        }
      } catch (error) {
        console.error("Error saving snippet order:", error);
      }
    },
    [authData]
  );
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const debounceReorderSave = useCallback(
    debounce(async (newSnippets) => {
      await saveSnippetOrder(newSnippets);
    }, 1000),
    [saveSnippetOrder]
  );

  const handleMoveCard = useCallback(
    (dragIndex, hoverIndex) => {
      let updatedSnippets;
      setSnippets((prevSnippets) => {
        const newSnippets = [...prevSnippets];
        const draggedItem = newSnippets[dragIndex];
        newSnippets.splice(dragIndex, 1);
        newSnippets.splice(hoverIndex, 0, draggedItem);
        updatedSnippets = newSnippets;
        return newSnippets;
      });

      if (updatedSnippets) {
        debounceReorderSave(updatedSnippets);
      }
    },
    [setSnippets, debounceReorderSave]
  );

  if (loading) {
    return (
      <div className="col-span-10 m-5 text-center mt-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading snippets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-span-10 m-5 text-center mt-10">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading snippets</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (snippets.length === 0) {
    return (
      <div className="col-span-10 m-5">
        <div className="text-center py-12">
          <div className="text-6xl mb-6">📝</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Welcome to SnippetHub!
          </h3>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Your personal snippet manager is ready. Start by creating your first
            snippet by clicking on the <span className="font-bold text-purple-500">Add</span> button in the sidebar!
          </p>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 max-w-3xl mx-auto">
            <h4 className="text-lg font-semibold text-purple-800 mb-4">
              What you can do:
            </h4>
            <ul className="text-left space-y-3 text-gray-700">
              <li className="flex items-center">
                <span className="mr-3">📄</span>
                Write or upload code, notes, or files
              </li>
              <li className="flex items-center">
                <span className="mr-3">🏷️</span>
                Organize them with tags
              </li>
              <li className="flex items-center">
                <span className="mr-3">✏️</span>
                Edit existing snippets anytime
              </li>
              <li className="flex items-center">
                <span className="mr-3">⭐</span>
                Star the important ones for quick access
              </li>
              <li className="flex items-center">
                <span className="mr-3">⬇️</span>
                Download full snippet files when needed
              </li>
            </ul>
          </div>
          <br />
          <p className="text-base max-w-2xl mx-auto">
            Start building your personal snippet library today — everything
            stays neat, searchable, and easily accessible from the sidebar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="m-5">
      <h2 className="text-xl font-bold mb-4 text-purple-700">All Snippets</h2>
      <DndProvider backend={HTML5Backend}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {snippets.map((snippet, index) => (
            <Card
              key={snippet.id}
              id={snippet.id}
              title={snippet.title}
              description={snippet.description}
              tags={snippet.tags}
              starred={snippet.starred}
              index={index}
              moveCard={handleMoveCard}
            />
          ))}
        </div>
      </DndProvider>
    </div>
  );
};

export default AllCards;

import React, { useMemo, useCallback, useEffect } from "react";
import Card from "./Card";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  snippetsAtom,
  snippetsLoadingAtom,
  snippetsErrorAtom,
} from "../recoil/atoms/snippetsAtom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const Starred = () => {
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
          `https://snippet-hub-full-stack.onrender.com/api/snippet/get/${authData.userId}`,
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

  const starred = useMemo(() => {
    return snippets.filter((snippet) => snippet.starred === true);
  }, [snippets]);

  const saveSnippetOrder = useCallback(
    async (updatedSnippets) => {
      try {
        const { userId, token } = authData;
        if (!userId || !token) {
          console.error("No auth data available for reorder");
          return;
        }

        const snippetOrders = updatedSnippets.map((snippet, index) => ({
          id: snippet.id,
          position: index,
        }));
        const response = await fetch(
          `https://snippet-hub-full-stack.onrender.com/api/snippet/reorder/${userId}`,
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

  const moveCard = useCallback(
    (dragIndex, hoverIndex) => {
      const starredIds = starred.map((snippet) => snippet.id);
      const fullSnippetsIndices = starredIds.map((id) =>
        snippets.findIndex((snippet) => snippet.id === id)
      );
      const actualDragIndex = fullSnippetsIndices[dragIndex];
      const actualHoverIndex = fullSnippetsIndices[hoverIndex];
      let updatedSnippets;
      setSnippets((prevSnippets) => {
        const newSnippets = [...prevSnippets];
        const draggedItem = newSnippets[actualDragIndex];
        newSnippets.splice(actualDragIndex, 1);
        newSnippets.splice(actualHoverIndex, 0, draggedItem);
        updatedSnippets = newSnippets;
        return newSnippets;
      });
      if (updatedSnippets) {
        debounceReorderSave(updatedSnippets);
      }
    },
    [snippets, starred, setSnippets, debounceReorderSave]
  );

  if (loading) {
    return (
      <div className="col-span-10 m-5 flex justify-center items-center">
        <div className="text-purple-600">Loading starred snippets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-span-10 m-5">
        <div className="text-red-600 text-center">{error}</div>
      </div>
    );
  }

  if (starred.length === 0) {
    return (
      <div className="col-span-10 m-5">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⭐</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No starred snippets yet
          </h3>
          <p className="text-gray-500">
            Star your favorite snippets to see them here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-10 m-5">
      <h2 className="text-xl font-bold mb-4 text-purple-700">
        Starred Snippets ({starred.length})
      </h2>
      <DndProvider backend={HTML5Backend}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {starred.map((snippet, index) => (
            <Card
              key={snippet.id}
              id={snippet.id}
              title={snippet.title}
              description={snippet.description}
              tags={snippet.tags}
              starred={snippet.starred}
              index={index}
              moveCard={moveCard}
            />
          ))}
        </div>
      </DndProvider>
    </div>
  );
};

export default Starred;

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecoilState } from "recoil";
import {
  snippetsAtom,
  snippetsLoadingAtom,
  snippetsErrorAtom,
} from "../recoil/atoms/snippetsAtom";

const Taglist = ({ toggleSidebar }) => {
  const navigate = useNavigate();
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
          `https://snippet-hub-full-stack.onrender.com//api/snippet/get/${authData.userId}`,
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

  const tags = useMemo(() => {
    const tagCount = {};
    snippets.forEach((snippet) => {
      snippet.tags.forEach((tag) => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });
    return tagCount;
  }, [snippets]);

  const handleClick = (tag) => {
    navigate(`/tags/${tag}`);
    if (toggleSidebar) {
      toggleSidebar();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center pb-8">
        <div className="text-purple-400 text-sm">Loading tags...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pb-8">
        <div className="text-red-400 text-sm text-center">{error}</div>
      </div>
    );
  }

  if (Object.keys(tags).length === 0) {
    return (
      <div className="pb-8">
        <div className="text-purple-300 text-sm text-center">
          No tags found. Create some snippets with tags!
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 pb-8">
      {Object.entries(tags).map(([tag, count]) => (
        <span
          key={`${tag}${count}`}
          className="px-3 py-1 bg-purple-900 text-purple-100 text-xs font-medium rounded-md border-1 border-purple-500 hover:cursor-pointer hover:bg-purple-300 hover:text-gray-900 transition-colors duration-200"
          onClick={() => handleClick(tag)}
        >
          {tag} ({count})
        </span>
      ))}
    </div>
  );
};

export default Taglist;

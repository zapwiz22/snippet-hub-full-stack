import { useRecoilState } from "recoil";
import {
  snippetsAtom,
  snippetsLoadingAtom,
  snippetsErrorAtom,
} from "../recoil/atoms/snippetsAtom";
import { useMemo } from "react";

export const useSnippets = () => {
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

  const refreshSnippets = async () => {
    if (!authData.userId || !authData.token) {
      setError("User not authenticated");
      return;
    }

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

  return {
    snippets,
    setSnippets,
    loading,
    error,
    refreshSnippets,
  };
};

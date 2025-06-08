import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { getFile } from "../utils/fileStorage";

const PublicShareSnippet = () => {
  const navigate = useNavigate();
  const { userId, snippetId } = useParams();
  const [snippet, setSnippet] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSnippet = async () => {
      if (!userId || !snippetId) {
        setError("Invalid snippet link");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:3000/api/snippet/public/${userId}/${snippetId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        if (response.ok) {
          const transformedSnippet = {
            id: data.snippet._id,
            title: data.snippet.title,
            description: data.snippet.description,
            content: data.snippet.content,
            contentType: data.snippet.contentType,
            tags: data.snippet.tags,
            starred: data.snippet.starred,
            createdAt: data.snippet.createdAt,
          };
          setSnippet(transformedSnippet);
        } else {
          setError(data.message || "Snippet not found");
        }
      } catch (error) {
        console.error("Error fetching snippet:", error);
        setError("Failed to load snippet");
      } finally {
        setLoading(false);
      }
    };

    fetchSnippet();
  }, [userId, snippetId]);

  useEffect(() => {
    const fetchFile = async () => {
      if (snippet && snippet.contentType === "file") {
        try {
          const fileData = await getFile(snippet.id);
          setFile(fileData);
        } catch (error) {
          console.error("Error fetching file:", error);
        }
      }
    };

    fetchFile();
  }, [snippet]);

  const downloadSnippet = () => {
    if (!snippet) return;

    if (snippet.contentType === "file" && file) {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name || `${snippet.title}.file`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([snippet.content], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${snippet.title || "snippet"}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const copyLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      alert("Link copied to clipboard!");
    });
  };

  if (loading) {
    return (
      <div className="col-span-10 m-5 flex justify-center items-center">
        <div className="text-purple-600">Loading snippet...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-span-10 m-5 text-center">
        <div className="text-red-600 text-xl mb-4">{error}</div>
        <button
          onClick={() => navigate("/")}
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md"
        >
          Go to Home
        </button>
      </div>
    );
  }

  if (!snippet) {
    return (
      <div className="col-span-10 m-5 text-center text-xl text-gray-600">
        Snippet not found.
      </div>
    );
  }

  return (
    <div className="m-5 bg-white shadow-md p-8 rounded-lg">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold text-purple-700 mb-4">
          {snippet.title}
        </h1>
        <div className="flex justify-center gap-7 align-middle mt-2">
          <button
            className="hover:cursor-pointer flex flex-col align-middle"
            onClick={copyLink}
            title="Copy Link"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-6"
            >
              <path
                fillRule="evenodd"
                d="M19.902 4.098a3.75 3.75 0 0 0-5.304 0l-4.5 4.5a3.75 3.75 0 0 0 1.035 6.037.75.75 0 0 1-.646 1.353 5.25 5.25 0 0 1-1.449-8.45l4.5-4.5a5.25 5.25 0 1 1 7.424 7.424l-1.757 1.757a.75.75 0 1 1-1.06-1.06l1.757-1.757a3.75 3.75 0 0 0 0-5.304Zm-7.389 4.267a.75.75 0 0 1 1-.353 5.25 5.25 0 0 1 1.449 8.45l-4.5 4.5a5.25 5.25 0 1 1-7.424-7.424l1.757-1.757a.75.75 0 1 1 1.06 1.06l-1.757 1.757a3.75 3.75 0 1 0 5.304 5.304l4.5-4.5a3.75 3.75 0 0 0-1.035-6.037.75.75 0 0 1-.354-1Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <button
            className="hover:cursor-pointer flex flex-col align-middle"
            onClick={downloadSnippet}
            title="Download"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-6"
            >
              <path
                fillRule="evenodd"
                d="M12 2.25a.75.75 0 0 1 .75.75v11.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75Zm-9 13.5a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      <p className="text-gray-700 mb-6">{snippet.description}</p>

      {snippet.contentType === "file" ? (
        <div className="bg-gray-100 p-6 rounded flex flex-col items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-12 text-purple-600 mb-2"
          >
            <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
            <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
          </svg>

          <p className="text-md mb-1 font-medium">
            {file ? file.name : "Attached File"}
          </p>
          <p className="text-sm text-gray-500 mb-3">
            {file
              ? `${(file.size / 1024).toFixed(2)} KB`
              : "Loading file information..."}
          </p>
          <button
            onClick={downloadSnippet}
            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md flex items-center hover:cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-5 mr-1"
            >
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            Download File
          </button>
        </div>
      ) : (
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto whitespace-pre-wrap">
          {snippet.content}
        </pre>
      )}

      <div className="mt-6 flex gap-2 flex-wrap">
        {snippet.tags.map((tag, index) => (
          <span
            key={index}
            className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-xs font-medium"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Shared publicly • View only</p>
      </div>
    </div>
  );
};

export default PublicShareSnippet;

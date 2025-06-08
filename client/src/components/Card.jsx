import React, { useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useRecoilState } from "recoil";
import { snippetsAtom } from "../recoil/atoms/snippetsAtom";
import { useDrag, useDrop } from "react-dnd";

const ItemTypes = {
  CARD: "card",
};

const Card = ({ id, title, description, tags, starred, index, moveCard }) => {
  const navigate = useNavigate();
  const [snippets, setSnippets] = useRecoilState(snippetsAtom);
  const ref = useRef(null);

  const authData = useMemo(() => {
    try {
      const userId = JSON.parse(localStorage.getItem("userId"));
      const token = localStorage.getItem("token");
      return { userId, token };
    } catch (error) {
      return { userId: null, token: null };
    }
  }, []);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.CARD,
    item: { id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ItemTypes.CARD,
    hover(item, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) {
        return;
      }
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      moveCard(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  const handleDelete = async (e) => {
    e.stopPropagation();
    const ok = window.confirm("Are you sure you want to delete this snippet?");
    if (!ok) return;
    try {
      const { userId, token } = authData;

      if (!userId || !token) {
        alert("User not authenticated");
        return;
      }
      const response = await fetch(
        `https://snippet-hub-full-stack.onrender.com//api/snippet/delete/${userId}/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        }
      );
      if (response.ok) {
        const updated = snippets.filter((snippet) => snippet.id !== id);
        setSnippets(updated);
      } else {
        const data = await response.json();
        alert(data.message || "Failed to delete snippet");
      }
    } catch (error) {
      console.error("Error deleting snippet:", error);
      alert("Network error. Please try again.");
    }
  };

  const handleStar = async (e) => {
    e.stopPropagation();
    try {
      const { userId, token } = authData;
      if (!userId || !token) {
        alert("User not authenticated");
        return;
      }
      const response = await fetch(
        `https://snippet-hub-full-stack.onrender.com//api/snippet/starred/${userId}/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        }
      );
      if (response.ok) {
        const updated = snippets.map((s) =>
          s.id === id ? { ...s, starred: !s.starred } : s
        );
        setSnippets(updated);
      } else {
        const data = await response.json();
        alert(data.message || "Failed to update snippet");
      }
    } catch (error) {
      console.error("Error starring snippet:", error);
      alert("Network error. Please try again.");
    }
  };

  return (
    <div
      ref={ref}
      className={`relative bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-5 border-l-4 border-purple-500 overflow-hidden ${
        isDragging ? "opacity-40" : "opacity-100"
      } cursor-grab h-52 flex flex-col`}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      onClick={() => {
        if (!isDragging) navigate(`/snippet/${id}`);
      }}
    >
      <div className="font-semibold text-xl text-gray-800 mb-2">{title}</div>

      <div className="mb-3 text-sm text-gray-600 line-clamp-2 flex-grow">
        {description}
      </div>

      <div className="flex flex-wrap gap-2 mt-auto line-clamp-2 truncate">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-purple-100 text-purple-600 text-xs font-medium rounded-md"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* star and delete buttons */}
      <div className="absolute top-2 right-2 flex gap-2">
        <button
          onClick={handleStar}
          className="text-yellow-500 hover:text-yellow-600 text-xl"
          title="Star/Unstar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill={starred ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
            />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="text-red-500 hover:text-red-600 text-xl"
          title="Delete"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Card;

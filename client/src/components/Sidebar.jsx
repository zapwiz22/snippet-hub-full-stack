import React from "react";
import { Link } from "react-router-dom";
import Taglist from "./Taglist";

const Sidebar = ({ toggleSidebar }) => {
  return (
    <div className="bg-purple-100 h-full">
      <div onClick={toggleSidebar} className="p-4 sm:p-7">
        <Link to="/add">
          <div
            className="font-semibold flex items-center p-3 text-gray-700 rounded-lg 
                transition-all duration-300 ease-in-out
                hover:shadow-sm hover:ring-2 hover:ring-purple-400 hover:bg-purple-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2 text-purple-500 size-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={3}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            Add
          </div>
        </Link>
        <hr className="my-2 border-purple-300 border-2" />

        <ul className="space-y-2 font-semibold">
          <li>
            <Link
              to="/"
              className="flex items-center p-3 text-gray-700 rounded-lg 
                transition-all duration-300 ease-in-out
               hover:shadow-sm hover:ring-2 hover:ring-purple-400 hover:bg-purple-300"
            >
              <svg
                className="w-5 h-5 mr-2 text-purple-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
              </svg>
              Home
            </Link>
          </li>
          <li>
            <Link
              to="/starred"
              className="flex items-center p-3 text-gray-700 rounded-lg 
                transition-all duration-300 ease-in-out
               hover:shadow-sm hover:ring-2 hover:ring-purple-400 hover:bg-purple-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 mr-2 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={3}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                />
              </svg>
              Starred
            </Link>
          </li>
          <li>
            <Link
              to="/collections"
              className="flex items-center p-3 text-gray-700 rounded-lg 
                transition-all duration-300 ease-in-out
               hover:shadow-sm hover:ring-2 hover:ring-purple-400 hover:bg-purple-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={3}
                stroke="currentColor"
                // className="size-6"
                className="w-5 h-5 mr-2 text-purple-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                />
              </svg>
              Collections
            </Link>
          </li>
        </ul>
        <hr className="my-2 border-purple-300 border-2" />

        <div
          className="mb-2 font-semibold flex items-center p-3 text-gray-700 rounded-lg 
                transition-all duration-300 ease-in-out
               hover:shadow-sm hover:ring-2 hover:ring-purple-400 hover:bg-purple-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2 text-purple-500 size-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={3}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
            />
          </svg>
          Tags
        </div>
      </div>
      <div className="px-4 sm:px-7 overflow-y-auto max-h-[50%]">
        <Taglist toggleSidebar={toggleSidebar} />
      </div>
    </div>
  );
};

export default Sidebar;

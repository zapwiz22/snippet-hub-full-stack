import React, { useState } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Add from "./components/Add";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AllCards from "./components/AllCards";
import MainSnippet from "./components/MainSnippet";
import Starred from "./components/Starred";
import ParticularTag from "./components/ParticularTag";
import { RecoilRoot } from "recoil";
import EditSnippet from "./components/EditSnippet";
import LoginPage from "./components/LoginPage";
import SignUpPage from "./components/SignUpPage";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicShareSnippet from "./components/PublicShareSnippet";
import Collections from "./components/Collections";
import CollectionDetail from "./components/CollectionDetail";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <RecoilRoot>
      <BrowserRouter>
        <div className="flex flex-col h-screen">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route
              path="/public/:userId/:snippetId"
              element={<PublicShareSnippet />}
            />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="fixed top-0 left-0 right-0 z-10">
                    <Navbar toggleSidebar={toggleSidebar} />
                  </div>

                  <div className="flex pt-[73px]">
                    <div className="hidden md:block w-[250px] flex-shrink-0 h-full">
                      <div className="h-full overflow-y-auto">
                        <Sidebar />
                      </div>
                    </div>
                    <div
                      className={`fixed inset-0 z-20 transform ${
                        sidebarOpen ? "translate-x-0" : "-translate-x-full"
                      } md:hidden transition-transform duration-300 ease-in-out`}
                    >
                      <div className="h-full  w-[250px] bg-purple-100 shadow-lg overflow-y-auto">
                        <Sidebar toggleSidebar={toggleSidebar} />
                      </div>
                      <div
                        className="absolute inset-0 bg-gray-900 bg-opacity-50 z-[-1]"
                        onClick={toggleSidebar}
                      ></div>
                    </div>

                    <div className="flex-1 overflow-y-auto content-area">
                      <Routes>
                        <Route path="/" element={<AllCards />} />
                        <Route
                          path="/add"
                          element={
                            <div className="px-5">
                              <Add />
                            </div>
                          }
                        />
                        <Route path="/snippet/:id" element={<MainSnippet />} />
                        <Route path="/starred" element={<Starred />} />
                        <Route path="/collections" element={<Collections />} />
                        <Route path="/collections/:id" element={<CollectionDetail />} />
                        <Route path="/tags/:tag" element={<ParticularTag />} />
                        <Route
                          path="/snippet/:id/edit"
                          element={<EditSnippet />}
                        />
                      </Routes>
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </BrowserRouter>
    </RecoilRoot>
  );
}

export default App;

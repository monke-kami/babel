import { useState } from "react";
import LandingPage from "./components/LandingPage";
import ChatPage from "./components/ChatPage";

function App() {
  const [page, setPage] = useState<"landing" | "chat">("landing");
  const [subject, setSubject] = useState("");

  const handleSearchSubmit = (searchQuery: string) => {
    setSubject(searchQuery);
    setPage("chat");
  };

  const handleNavigateBack = () => {
    setPage("landing");
  };

  if (page === "chat") {
    return <ChatPage initialSubject={subject} onNavigateBack={handleNavigateBack} />;
  }

  return <LandingPage onSearchSubmit={handleSearchSubmit} />;
}

export default App;

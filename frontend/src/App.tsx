import { BrowserRouter, Route, Routes } from "react-router-dom";
import ClientApp from "./app/ClientApp";
import AgentApp from "./app/AgentApp";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/agent/*" element={<AgentApp />} />
        <Route path="/*" element={<ClientApp />} />
      </Routes>
    </BrowserRouter>
  );
}
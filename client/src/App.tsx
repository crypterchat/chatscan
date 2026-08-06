import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ExplorerHome } from "./pages/ExplorerHome";
import { BlockDetailPage } from "./pages/BlockDetailPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ExplorerHome />} />
        <Route path="/block/:hash/:id" element={<BlockDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

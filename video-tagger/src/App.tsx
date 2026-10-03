import { HashRouter, Routes, Route, NavLink, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db/db";
import MatchLibraryPage from "./pages/MatchLibraryPage";
import TaggingWorkspacePage from "./pages/TaggingWorkspacePage";
import AnalysisDashboardPage from "./pages/AnalysisDashboardPage";

function MatchNavLinks() {
  const { matchId } = useParams();
  const match = useLiveQuery(() => (matchId ? db.matches.get(matchId) : undefined), [matchId]);
  if (!matchId || !match) return null;
  return (
    <>
      <span className="muted">/</span>
      <span style={{ fontWeight: 700 }}>{match.name}</span>
      <NavLink to={`/match/${matchId}/tag`} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
        Tagging
      </NavLink>
      <NavLink
        to={`/match/${matchId}/analysis`}
        className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
      >
        Analysis
      </NavLink>
    </>
  );
}

function Shell() {
  return (
    <div className="app-shell">
      <nav className="app-nav">
        <NavLink to="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
          ⚽ Match Tagger
        </NavLink>
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
          Match library
        </NavLink>
        <Routes>
          <Route path="/match/:matchId/*" element={<MatchNavLinks />} />
        </Routes>
      </nav>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<MatchLibraryPage />} />
          <Route path="/match/:matchId/tag" element={<TaggingWorkspacePage />} />
          <Route path="/match/:matchId/analysis" element={<AnalysisDashboardPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}

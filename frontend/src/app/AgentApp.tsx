import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoginStep1 } from "../../features/agent/LoginStep1";
import { LoginStep2 } from "../../features/agent/LoginStep2";
import { ConversationList } from "../../features/agent/ConversationList";
import { ConversationDetail } from "../../features/agent/ConversationDetail";
import { getAgentToken, getOperatorToken } from "../../lib/agentStorage";

function RequireOperatorSession({ children }: { children: ReactNode }) {
  if (!getAgentToken()) return <Navigate to="/agent/login" replace />;
  if (!getOperatorToken()) return <Navigate to="/agent/operator-login" replace />;
  return <>{children}</>;
}

export default function AgentApp() {
  return (
    <Routes>
      <Route path="login" element={<LoginStep1 />} />
      <Route path="operator-login" element={<LoginStep2 />} />
      <Route
        index
        element={
          <RequireOperatorSession>
            <ConversationList />
          </RequireOperatorSession>
        }
      />
      <Route
        path="conversations/:id"
        element={
          <RequireOperatorSession>
            <ConversationDetail />
          </RequireOperatorSession>
        }
      />
      <Route path="*" element={<Navigate to="/agent" replace />} />
    </Routes>
  );
}
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "minqora_workspace_v1";

const DEFAULT_WORKSPACE = {
  mine: "",
  seam: "",
  projectName: "MINQORA Project",
  dtmSource: "/data/mckinley/dtm_I_11.tif",
  dtmSourceName: "McKinley Mine — dtm_I_11.tif",
  mineDepth: 120,
  benchHeight: 10,
  benchWidth: 25,
  faceAngle: 60,
  pitLength: 800,
  pitWidth: 800,
};

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved
        ? { ...DEFAULT_WORKSPACE, ...JSON.parse(saved) }
        : DEFAULT_WORKSPACE;
    } catch {
      return DEFAULT_WORKSPACE;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    } catch {
      // Keep the application usable even if localStorage is unavailable.
    }
  }, [workspace]);

  const updateWorkspace = (changes) => {
    setWorkspace((current) => ({
      ...current,
      ...(typeof changes === "function" ? changes(current) : changes),
    }));
  };

  const resetWorkspace = () => {
    setWorkspace(DEFAULT_WORKSPACE);
  };

  const value = useMemo(
    () => ({
      workspace,
      updateWorkspace,
      resetWorkspace,
    }),
    [workspace]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useMINQORAWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error(
      "useMINQORAWorkspace must be used inside <WorkspaceProvider>."
    );
  }

  return context;
}

export { DEFAULT_WORKSPACE };

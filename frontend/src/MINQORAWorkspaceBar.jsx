import React from "react";
import { useMINQORAWorkspace } from "./MINQORAWorkspaceContext";

export default function MINQORAWorkspaceBar() {
  const { workspace, updateWorkspace, resetWorkspace } =
    useMINQORAWorkspace();

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd1d8",
    borderRadius: 7,
    padding: "8px 9px",
    background: "#fff",
    fontSize: 13,
  };

  return (
    <div
      style={{
        border: "1px solid #cbd1d8",
        borderRadius: 10,
        background: "#fff",
        padding: 14,
        marginBottom: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.8 }}>
            ACTIVE MINQORA WORKSPACE
          </div>
          <div style={{ marginTop: 3, color: "#59636f", fontSize: 12 }}>
            These project settings are shared and saved in this browser.
          </div>
        </div>

        <button
          type="button"
          onClick={resetWorkspace}
          style={{
            border: "1px solid #999",
            borderRadius: 7,
            padding: "7px 11px",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Reset Workspace
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
          gap: 10,
          marginTop: 12,
        }}
      >
        <label style={{ fontSize: 12, fontWeight: 700 }}>
          Project
          <input
            style={inputStyle}
            value={workspace.projectName}
            onChange={(e) =>
              updateWorkspace({ projectName: e.target.value })
            }
          />
        </label>

        <label style={{ fontSize: 12, fontWeight: 700 }}>
          Mine
          <input
            style={inputStyle}
            placeholder="Select from Mining Data"
            value={workspace.mine}
            onChange={(e) => updateWorkspace({ mine: e.target.value })}
          />
        </label>

        <label style={{ fontSize: 12, fontWeight: 700 }}>
          Seam
          <input
            style={inputStyle}
            placeholder="Select from Mining Data"
            value={workspace.seam}
            onChange={(e) => updateWorkspace({ seam: e.target.value })}
          />
        </label>

        <label style={{ fontSize: 12, fontWeight: 700 }}>
          Mine depth (m)
          <input
            type="number"
            style={inputStyle}
            value={workspace.mineDepth}
            onChange={(e) =>
              updateWorkspace({ mineDepth: Number(e.target.value) })
            }
          />
        </label>

        <label style={{ fontSize: 12, fontWeight: 700 }}>
          Bench height (m)
          <input
            type="number"
            style={inputStyle}
            value={workspace.benchHeight}
            onChange={(e) =>
              updateWorkspace({ benchHeight: Number(e.target.value) })
            }
          />
        </label>

        <label style={{ fontSize: 12, fontWeight: 700 }}>
          Bench width (m)
          <input
            type="number"
            style={inputStyle}
            value={workspace.benchWidth}
            onChange={(e) =>
              updateWorkspace({ benchWidth: Number(e.target.value) })
            }
          />
        </label>

        <label style={{ fontSize: 12, fontWeight: 700 }}>
          Face angle (°)
          <input
            type="number"
            style={inputStyle}
            value={workspace.faceAngle}
            onChange={(e) =>
              updateWorkspace({ faceAngle: Number(e.target.value) })
            }
          />
        </label>

        <label style={{ fontSize: 12, fontWeight: 700 }}>
          Pit length (m)
          <input
            type="number"
            style={inputStyle}
            value={workspace.pitLength}
            onChange={(e) =>
              updateWorkspace({ pitLength: Number(e.target.value) })
            }
          />
        </label>

        <label style={{ fontSize: 12, fontWeight: 700 }}>
          Pit width (m)
          <input
            type="number"
            style={inputStyle}
            value={workspace.pitWidth}
            onChange={(e) =>
              updateWorkspace({ pitWidth: Number(e.target.value) })
            }
          />
        </label>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 9,
          borderRadius: 7,
          background: "#f7f8fa",
          fontSize: 12,
        }}
      >
        <b>DTM source:</b> {workspace.dtmSourceName}
      </div>
    </div>
  );
}

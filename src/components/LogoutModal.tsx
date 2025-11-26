import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function LogoutModal({ open, onClose, onConfirm }: Props) {
  if (!open) return null;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(2,6,23,0.6)",
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "white",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 10px 30px rgba(2,6,23,0.3)",
          position: "relative",
        }}
      >
        <button
          aria-label="Close"
          onClick={onClose}
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          <X />
        </button>

        <h2 style={{ margin: "4px 0 8px", fontSize: 20, color: "#0f172a", fontWeight: 700 }}>
          Confirm Logout
        </h2>
        <p style={{ margin: 0, color: "#475569" }}>
          Are you sure you want to log out?
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "none",
              background: "#eef2f7",
              color: "#0f172a",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "none",
              background: "#0f172a",
              color: "white",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return modal;
  }

  return createPortal(modal, document.body);
}
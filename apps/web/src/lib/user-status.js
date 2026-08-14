/** @typedef {"pending" | "active" | "suspended"} UserStatus */
/** @typedef {"approve" | "suspend" | "activate"} UserAction */

/**
 * @param {UserStatus} current
 * @param {UserAction} action
 * @returns {UserStatus}
 */
export function nextStatus(current, action) {
  if (action === "approve" && current === "pending") return "active";
  if (action === "suspend" && current === "active") return "suspended";
  if (action === "activate" && current === "suspended") return "active";

  return current;
}

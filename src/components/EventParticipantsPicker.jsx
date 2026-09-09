import React, { useMemo, useState } from "react";
import "./EventParticipantsPicker.css";

export default function EventParticipantsPicker({
  users = [],
  selectedParticipants = [],
  onChange,
}) {
  const [query, setQuery] = useState("");
  const selectedIds = new Set(selectedParticipants.map((p) => String(p.id)));
  const allSelected = users.length > 0 && selectedParticipants.length === users.length;
  const search = query.trim().toLowerCase();
  const visibleUsers = useMemo(() => {
    if (!search) return users;
    return users.filter((user) => {
      const name = String(user.name || "").toLowerCase();
      const username = String(user.username || "").toLowerCase();
      const role = String(user.role || "").toLowerCase();
      return name.includes(search) || username.includes(search) || role.includes(search);
    });
  }, [users, search]);

  const handleSelectAll = (checked) => {
    if (checked) {
      onChange(users.map((user) => ({ id: user.id, username: user.username })));
    } else {
      onChange([]);
    }
  };

  const handleToggle = (user) => {
    if (selectedIds.has(String(user.id))) {
      onChange(selectedParticipants.filter((p) => String(p.id) !== String(user.id)));
    } else {
      onChange([...selectedParticipants, { id: user.id, username: user.username }]);
    }
  };

  const countLabel =
    selectedParticipants.length === 1
      ? "1 user selected"
      : `${selectedParticipants.length} users selected`;

  return (
    <div className="event-participants-picker participants-section">
      <div className="participants-toolbar">
        <label className="participants-label">Select Participants:</label>
        <span className="participants-count">{countLabel}</span>
      </div>
      <label className={`select-all-users${allSelected ? " select-all-users--on" : ""}`}>
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
        <span>Select All Users</span>
      </label>
      {users.length > 8 && (
        <input
          type="search"
          className="participants-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users..."
          aria-label="Search users"
        />
      )}
      <div className="participants-list">
        {users.length === 0 ? (
          <div className="participants-empty">No users available</div>
        ) : visibleUsers.length === 0 ? (
          <div className="participants-empty">No users match "{query.trim()}"</div>
        ) : (
          visibleUsers.map((user) => (
            <label key={user.id} className="participant-checkbox">
              <input
                type="checkbox"
                checked={selectedIds.has(String(user.id))}
                onChange={() => handleToggle(user)}
              />
              <span className="participant-name">
                {user.name || user.username}
                {user.name && user.username && user.name !== user.username ? (
                  <em> @{user.username}</em>
                ) : null}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

export function formatEventParticipants(event, totalUsers = 0) {
  const count =
    event?.participant_count ??
    (event?.participants
      ? String(event.participants)
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean).length
      : 0);
  if (!count) return "";
  if (totalUsers > 0 && count >= totalUsers) {
    return `All users (${count})`;
  }
  if (count > 12) {
    return `${count} users selected`;
  }
  return event.participants;
}

export function mapStoredParticipants(event, users) {
  const names = event?.participants
    ? String(event.participants)
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
    : [];
  if (!names.length) return [];
  return users.filter((user) => names.includes(user.username));
}

export function isSelectAllSelection(selected, users) {
  return users.length > 0 && selected.length === users.length;
}

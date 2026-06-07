"use client";

import React, { useState } from "react";
import Icon from "@/components/UI/Icon";
import styles from "./admin-data-table.module.css";

export default function AdminDataTable({
  columns,
  data,
  onEdit,
  onDelete,
  actions,
  emptyMessage = "No records found.",
}) {
  const [search, setSearch] = useState("");
  const filteredData = data.filter((item) =>
    Object.values(item).some((val) =>
      String(val ?? "")
        .toLowerCase()
        .includes(search.toLowerCase()),
    ),
  );

  return (
    <div className={`glass-panel ticket-card ${styles.wrap}`}>
      <div className={styles.toolbar}>
        <input
          type="search"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
          aria-label="Search table"
        />
        <div className={styles.count}>{filteredData.length} entries</div>
      </div>

      {filteredData.length === 0 ? (
        <div className={styles.empty}>{emptyMessage}</div>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} scope="col">
                    {col.label}
                  </th>
                ))}
                {(actions || onEdit || onDelete) && (
                  <th scope="col" className={styles.actionsHead}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, idx) => (
                <tr key={item.id || idx}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                  {(actions || onEdit || onDelete) && (
                    <td className={styles.actionsCell}>
                      {actions && actions(item)}
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className="btn-icon"
                          aria-label="Edit item"
                        >
                          <Icon name="edit" size={16} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(item)}
                          className="btn-icon-danger"
                          aria-label="Delete item"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

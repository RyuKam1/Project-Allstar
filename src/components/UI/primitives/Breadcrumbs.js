"use client";

import React from "react";
import Link from "next/link";
import styles from "./primitives.module.css";

export default function Breadcrumbs({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 && <span className={styles.breadcrumbSep} aria-hidden="true">/</span>}
            {isLast || !item.href ? (
              <span className={styles.breadcrumbCurrent} aria-current={isLast ? "page" : undefined}>
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className={styles.breadcrumbLink}>
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

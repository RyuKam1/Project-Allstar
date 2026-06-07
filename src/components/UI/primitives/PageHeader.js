"use client";

import React from "react";
import Breadcrumbs from "./Breadcrumbs";
import styles from "./primitives.module.css";

export default function PageHeader({ title, subtitle, breadcrumbs, actions, children }) {
  return (
    <header className={styles.pageHeader}>
      {breadcrumbs?.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className={styles.pageHeaderTop}>
        <div>
          {title && <h1 className={styles.pageTitle}>{title}</h1>}
          {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.pageActions}>{actions}</div>}
      </div>
      {children}
    </header>
  );
}

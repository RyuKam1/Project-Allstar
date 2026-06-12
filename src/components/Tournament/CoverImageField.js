"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./cover-image-field.module.css";

export default function CoverImageField({ file, previewUrl, onChange }) {
  const inputRef = useRef(null);
  const [localPreview, setLocalPreview] = useState(previewUrl || null);

  useEffect(() => {
    setLocalPreview(previewUrl || null);
  }, [previewUrl]);

  const handleFile = (nextFile) => {
    if (!nextFile) {
      onChange?.({ file: null, previewUrl: null });
      setLocalPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result;
      setLocalPreview(url);
      onChange?.({ file: nextFile, previewUrl: url });
    };
    reader.readAsDataURL(nextFile);
  };

  const clearCover = (e) => {
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = "";
    handleFile(null);
  };

  return (
    <div className={styles.field}>
      <div className={styles.cardShell}>
        <button
          type="button"
          className={styles.previewWrap}
          onClick={() => inputRef.current?.click()}
          aria-label={localPreview ? "Change cover image" : "Add cover image (optional)"}
        >
          {localPreview ? (
            <>
              <img src={localPreview} alt="" className={styles.preview} />
              <span className={styles.overlayHint}>Tap to change</span>
            </>
          ) : (
            <span className={styles.placeholder}>Add cover image (optional)</span>
          )}
        </button>
        {localPreview && (
          <button
            type="button"
            className={styles.removeBtn}
            onClick={clearCover}
            aria-label="Remove cover image"
          >
            ✕
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={styles.hiddenInput}
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
      />
      <p className={styles.hint}>Square 1:1 image recommended. JPG, PNG, or WebP.</p>
    </div>
  );
}

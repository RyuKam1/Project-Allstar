"use client";
import React, { useEffect, useState } from 'react';
import { communityLocationService } from '@/services/communityLocationService';
import styles from './pending-edits.module.css';

export default function PendingEditsList({ locationId, onUpdate }) {
    const [edits, setEdits] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEdits();
    }, [locationId]);

    const loadEdits = async () => {
        try {
            const data = await communityLocationService.getPendingEdits(locationId);
            setEdits(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async (editId, decision) => {
        try {
            await communityLocationService.processEdit(editId, decision);
            // Remove from local state
            setEdits(prev => prev.filter(e => e.id !== editId));
            if (decision === 'applied' && onUpdate) onUpdate();
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return null;
    if (edits.length === 0) return null;

    return (
        <div className={styles.container}>
            <h3 className={styles.title}>Pending Suggestions ({edits.length})</h3>
            <div className={styles.list}>
                {edits.map(edit => (
                    <div key={edit.id} className={styles.editCard}>
                        <div className={styles.header}>
                            <span className={styles.typeTag}>{edit.edit_type.replace(/_/g, ' ')}</span>
                            <span className={styles.user}>by {edit.profiles?.name || 'Unknown'}</span>
                        </div>

                        <div className={styles.diff}>
                            <div className={styles.val}>
                                <span className={styles.label}>Old:</span>
                                <span className={styles.old}>{formatValue(edit.edit_type, edit.old_value)}</span>
                            </div>
                            <div className={styles.val}>
                                <span className={styles.label}>New:</span>
                                <span className={styles.new}>{formatValue(edit.edit_type, edit.new_value)}</span>
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <button
                                onClick={() => handleProcess(edit.id, 'rejected')}
                                className={styles.rejectBtn}
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => handleProcess(edit.id, 'applied')}
                                className={styles.approveBtn}
                            >
                                Approve
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function formatValue(type, valString) {
    if (!valString) return 'None';
    try {
        const val = JSON.parse(valString);
        if (type.includes('image')) return <img src={val} alt="Preview" style={{ height: '40px', borderRadius: '4px' }} />;
        if (Array.isArray(val)) return val.join(', ');
        return val.toString();
    } catch (e) {
        return valString;
    }
}

"use client";
import React, { useState, useRef, useEffect } from 'react';
import styles from './circular-time-picker.module.css';

/**
 * CircularTimePicker Component
 * Google-style circular clock picker for selecting play intent time
 * @param {Date} defaultTime - Default selected time
 * @param {function} onTimeSelect - Callback when time is selected
 * @param {function} onQuickSelect - Callback for quick options
 */
export default function CircularTimePicker({ defaultTime, onTimeSelect, onQuickSelect }) {
    const [selectedHour, setSelectedHour] = useState(defaultTime ? defaultTime.getHours() % 12 || 12 : 12);
    const [selectedMinute, setSelectedMinute] = useState(defaultTime ? defaultTime.getMinutes() : 0);
    const [isPM, setIsPM] = useState(defaultTime ? defaultTime.getHours() >= 12 : true);
    const [mode, setMode] = useState('hour'); // 'hour' or 'minute'

    const clockRef = useRef(null);

    // Quick time options
    const quickOptions = [
        { label: 'Now', minutes: 0 },
        { label: 'In 30 min', minutes: 30 },
        { label: 'In 1 hour', minutes: 60 }
    ];

    const [isDragging, setIsDragging] = useState(false);

    // Calculate time from angle
    const calculateTimeFromEvent = (e, isFinal = false) => {
        if (!clockRef.current) return;

        const rect = clockRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Handle touch or mouse events
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = clientX - rect.left - centerX;
        const y = clientY - rect.top - centerY;

        // Calculate angle (0 is up/12 o'clock in our CSS)
        // atan2(y, x) -> 0 is right (3 o'clock). 
        // We want 0 at -90deg (12 o'clock).
        let angleDeg = Math.atan2(y, x) * (180 / Math.PI);
        angleDeg = (angleDeg + 90 + 360) % 360;

        if (mode === 'hour') {
            // Snap to nearest 30 degrees (12 hours)
            let hour = Math.round(angleDeg / 30);
            if (hour === 0) hour = 12;
            setSelectedHour(hour);
        } else {
            // Minutes: Snap to nearest 5 minutes (30 degrees each)
            // 360 deg / 12 slots = 30 deg per slot. Each slot = 5 mins.
            let minuteSlot = Math.round(angleDeg / 30) % 12;
            let minute = minuteSlot * 5;
            setSelectedMinute(minute);
        }
    };

    const handleStart = (e) => {
        e.preventDefault(); // Prevent scrolling on touch
        setIsDragging(true);
        calculateTimeFromEvent(e);
    };

    const handleMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        calculateTimeFromEvent(e);
    };

    const handleEnd = () => {
        setIsDragging(false);
    };

    // Add global move/up listeners when dragging
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleMove, { passive: false });
            window.addEventListener('touchend', handleEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, mode]); // Re-bind if mode changes to update calc logic context if needed

    const handleQuickOption = (minutes) => {
        const now = new Date();
        const futureTime = new Date(now.getTime() + minutes * 60000);

        setSelectedHour(futureTime.getHours() % 12 || 12);
        setSelectedMinute(futureTime.getMinutes());
        setIsPM(futureTime.getHours() >= 12);

        if (onQuickSelect) {
            onQuickSelect(futureTime);
        }
    };

    const getSelectedTime = () => {
        const now = new Date();
        const hours = isPM ? (selectedHour === 12 ? 12 : selectedHour + 12) : (selectedHour === 12 ? 0 : selectedHour);
        const time = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, selectedMinute);

        // If time is in the past, move to next day
        if (time < now) {
            time.setDate(time.getDate() + 1);
        }

        return time;
    };

    // Main action button logic
    const handleAction = () => {
        if (mode === 'hour') {
            setMode('minute');
        } else {
            const selectedTime = getSelectedTime();
            if (onTimeSelect) {
                onTimeSelect(selectedTime);
            }
        }
    };

    // Render clock numbers
    const renderClockNumbers = () => {
        const numbers = mode === 'hour'
            ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
            : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

        return numbers.map((num, index) => {
            const angle = (index * (360 / 12)) - 90;
            const radius = 90; // pixels from center
            const x = Math.cos(angle * Math.PI / 180) * radius;
            const y = Math.sin(angle * Math.PI / 180) * radius;

            const isSelected = mode === 'hour'
                ? num === selectedHour
                : num === selectedMinute;

            return (
                <div
                    key={num}
                    className={`${styles.clockNumber} ${isSelected ? styles.selected : ''}`}
                    style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`
                    }}
                >
                    {num}
                </div>
            );
        });
    };

    // Render clock hand
    const renderClockHand = () => {
        const value = mode === 'hour' ? selectedHour : selectedMinute;
        // Logic: 12h = 0deg (if 12), 3h = 90deg
        // Value: 12 -> 0. 1 -> 30.
        // Formula: (value % 12) * 30
        const angle = mode === 'hour'
            ? ((value % 12) * 30) // 0 deg is up
            : (value * 6);        // 0 min = 0 deg is up

        return (
            <div
                className={styles.clockHand}
                style={{ transform: `translateX(-50%) rotate(${angle}deg)` }} // Translate first to center anchor
            />
        );
    };

    const formattedTime = `${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;

    return (
        <div className={styles.timePicker}>
            {/* Quick Options */}
            <div className={styles.quickOptions}>
                {quickOptions.map((option) => (
                    <button
                        key={option.label}
                        onClick={() => handleQuickOption(option.minutes)}
                        className={styles.quickButton}
                        type="button"
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Selected Time Display */}
            <div className={styles.timeDisplay}>
                <div className={styles.timeText}>{formattedTime}</div>
                <div className={styles.modeToggle}>
                    <button
                        onClick={() => setMode('hour')}
                        className={`${styles.modeButton} ${mode === 'hour' ? styles.active : ''}`}
                        type="button"
                    >
                        Hour
                    </button>
                    <button
                        onClick={() => setMode('minute')}
                        className={`${styles.modeButton} ${mode === 'minute' ? styles.active : ''}`}
                        type="button"
                    >
                        Minute
                    </button>
                </div>
            </div>

            {/* Circular Clock */}
            <div
                ref={clockRef}
                className={styles.clock}
                onMouseDown={handleStart}
                onTouchStart={handleStart}
                style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
            >
                <div className={styles.clockCenter} />
                {renderClockHand()}
                {renderClockNumbers()}
            </div>

            {/* AM/PM Toggle */}
            <div className={styles.ampmToggle}>
                <button
                    onClick={() => setIsPM(false)}
                    className={`${styles.ampmButton} ${!isPM ? styles.active : ''}`}
                    type="button"
                >
                    AM
                </button>
                <button
                    onClick={() => setIsPM(true)}
                    className={`${styles.ampmButton} ${isPM ? styles.active : ''}`}
                    type="button"
                >
                    PM
                </button>
            </div>

            {/* Action Button */}
            <button
                onClick={handleAction}
                className={styles.confirmButton}
                type="button"
            >
                {mode === 'hour' ? 'Next' : 'Confirm'}
            </button>
        </div>
    );
}

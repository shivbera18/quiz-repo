import React from 'react';

interface Props {
    className?: string;
}

export default function Atom({ className = "" }: Props) {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Center nucleus */}
            <circle cx="50" cy="50" r="5" fill="currentColor" />
            
            {/* Electron orbits */}
            <ellipse
                cx="50"
                cy="50"
                rx="30"
                ry="15"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
            />
            <ellipse
                cx="50"
                cy="50"
                rx="30"
                ry="15"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                transform="rotate(60 50 50)"
            />
            <ellipse
                cx="50"
                cy="50"
                rx="30"
                ry="15"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                transform="rotate(120 50 50)"
            />
            
            {/* Electrons */}
            <circle cx="80" cy="50" r="3" fill="currentColor" />
            <circle cx="35" cy="35" r="3" fill="currentColor" />
            <circle cx="65" cy="65" r="3" fill="currentColor" />
        </svg>
    );
}

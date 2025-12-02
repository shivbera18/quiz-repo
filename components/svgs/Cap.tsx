import React from 'react';

interface Props {
    className?: string;
}

export default function Cap({ className = "" }: Props) {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Cap base */}
            <path
                d="M20 50 L50 35 L80 50 L50 65 Z"
                fill="currentColor"
                opacity="0.8"
            />
            {/* Cap top */}
            <path
                d="M50 35 L50 20 L45 15 L55 15 L50 20 Z"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
            />
            {/* Tassel */}
            <circle cx="50" cy="15" r="3" fill="currentColor" />
            <line x1="50" y1="15" x2="50" y2="10" stroke="currentColor" strokeWidth="1" />
        </svg>
    );
}

import React from 'react';

interface Props {
    className?: string;
}

export default function Science({ className = "" }: Props) {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Beaker outline */}
            <path
                d="M35 10 L35 40 L25 70 C 25 80, 35 85, 50 85 C 65 85, 75 80, 75 70 L65 40 L65 10 Z"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
            />
            {/* Liquid */}
            <path
                d="M30 60 C 30 60, 35 65, 50 65 C 65 65, 70 60, 70 60 L75 70 C 75 75, 65 80, 50 80 C 35 80, 25 75, 25 70 Z"
                fill="currentColor"
                opacity="0.3"
            />
            {/* Bubbles */}
            <circle cx="45" cy="65" r="3" fill="currentColor" opacity="0.5" />
            <circle cx="55" cy="68" r="2" fill="currentColor" opacity="0.5" />
        </svg>
    );
}

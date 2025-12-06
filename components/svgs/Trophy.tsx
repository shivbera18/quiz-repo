import React from 'react';

interface Props {
    className?: string;
}

export default function Trophy({ className = "" }: Props) {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Trophy cup */}
            <path
                d="M35 25 L35 40 Q 35 55, 50 55 Q 65 55, 65 40 L65 25 Z"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
            />
            
            {/* Handles */}
            <path
                d="M35 30 Q 25 30, 25 35 Q 25 40, 35 40"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
            />
            <path
                d="M65 30 Q 75 30, 75 35 Q 75 40, 65 40"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
            />
            
            {/* Base */}
            <path
                d="M50 55 L50 65"
                stroke="currentColor"
                strokeWidth="2"
            />
            <rect
                x="40"
                y="65"
                width="20"
                height="8"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
            />
            
            {/* Star decoration */}
            <path
                d="M50 35 L52 40 L57 40 L53 43 L55 48 L50 45 L45 48 L47 43 L43 40 L48 40 Z"
                fill="currentColor"
                opacity="0.5"
            />
        </svg>
    );
}

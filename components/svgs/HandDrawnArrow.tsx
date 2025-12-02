import React from 'react';

interface Props {
    className?: string;
}

export default function HandDrawnArrow({ className = "" }: Props) {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <path
                d="M10 50 Q 30 30, 50 50 T 90 50"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M 85 45 L 90 50 L 85 55"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
    );
}

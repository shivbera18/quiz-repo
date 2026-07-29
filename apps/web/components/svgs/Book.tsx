import React from 'react';

interface Props {
    className?: string;
}

export default function Book({ className = "" }: Props) {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Book cover */}
            <path
                d="M25 20 L75 20 L75 80 L25 80 Z"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
            />
            {/* Book spine */}
            <path
                d="M30 20 L30 80"
                stroke="currentColor"
                strokeWidth="2"
            />
            {/* Pages */}
            <path
                d="M35 30 L65 30 M35 40 L65 40 M35 50 L65 50 M35 60 L55 60"
                stroke="currentColor"
                strokeWidth="1.5"
                opacity="0.5"
            />
        </svg>
    );
}

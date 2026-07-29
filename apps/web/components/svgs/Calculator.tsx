import React from 'react';

interface Props {
    className?: string;
}

export default function Calculator({ className = "" }: Props) {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Calculator body */}
            <rect
                x="25"
                y="15"
                width="50"
                height="70"
                rx="4"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
            />
            
            {/* Display */}
            <rect
                x="30"
                y="20"
                width="40"
                height="15"
                rx="2"
                fill="currentColor"
                opacity="0.3"
            />
            
            {/* Buttons */}
            <circle cx="37" cy="50" r="4" fill="currentColor" opacity="0.5" />
            <circle cx="50" cy="50" r="4" fill="currentColor" opacity="0.5" />
            <circle cx="63" cy="50" r="4" fill="currentColor" opacity="0.5" />
            
            <circle cx="37" cy="62" r="4" fill="currentColor" opacity="0.5" />
            <circle cx="50" cy="62" r="4" fill="currentColor" opacity="0.5" />
            <circle cx="63" cy="62" r="4" fill="currentColor" opacity="0.5" />
            
            <circle cx="37" cy="74" r="4" fill="currentColor" opacity="0.5" />
            <circle cx="50" cy="74" r="4" fill="currentColor" opacity="0.5" />
            <circle cx="63" cy="74" r="4" fill="currentColor" opacity="0.5" />
        </svg>
    );
}

import React from "react";

export const MenuIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export const XIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const BellIcon = ({ ringing, ...props }) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={`h-6 w-6 transition-transform duration-200 ease-out ${
      ringing ? "bell-ringing" : ""
    }`}
  >
    <path
      d="M3.5 9.5c0-1.9 1-3.7 2.6-4.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="opacity-40"
    />
    <path
      d="M2.3 8c0-2.9 1.6-5.6 4-7.1"
      transform="translate(0 2)"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="opacity-20"
    />
    <path
      d="M20.5 9.5c0-1.9-1-3.7-2.6-4.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="opacity-40"
    />
    <path
      d="M21.7 8c0-2.9-1.6-5.6 4-7.1"
      transform="translate(0 2)"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="opacity-20"
    />
    <path
      d="M14.857 17.082a23.85 23.85 0 01-5.714 0M12 3a6 6 0 00-6 6c0 4.667-2 6-2 6h16s-2-1.333-2-6a6 6 0 00-6-6z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="19" r="1.6" fill="currentColor" />
  </svg>
);

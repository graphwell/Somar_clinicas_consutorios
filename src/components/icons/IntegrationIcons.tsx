import React from 'react';

export const IconWhatsApp = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 1.667C5.397 1.667 1.667 5.397 1.667 10c0 1.493.393 2.893 1.08 4.107L1.667 18.333l4.373-1.04A8.29 8.29 0 0010 18.333c4.603 0 8.333-3.73 8.333-8.333 0-4.603-3.73-8.333-8.333-8.333z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7.5 7.5c0-.834.833-1.667 1.667-1.667s1.666.416 1.666 1.25-.833 1.25-1.666 1.25v.834M10 12.5h.008" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IconPix = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 2L13.5 5.5M10 2L6.5 5.5M10 2V10M10 18L13.5 14.5M10 18L6.5 14.5M10 18V10M2 10L5.5 6.5M2 10L5.5 13.5M2 10H10M18 10L14.5 6.5M18 10L14.5 13.5M18 10H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IconCreditCard = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.667" y="4.167" width="16.667" height="11.667" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M1.667 8.333h16.667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5 12.5h2M9 12.5h1.667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const IconLink = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.333 10.833a4.167 4.167 0 006.25.417l2.5-2.5a4.167 4.167 0 00-5.892-5.892L9.792 4.258" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11.667 9.167a4.167 4.167 0 00-6.25-.417l-2.5 2.5a4.167 4.167 0 005.892 5.892l1.392-1.392" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IconCheck = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.333 4L6 11.333 2.667 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IconAlert = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 1.667L18.333 16.667H1.667L10 1.667z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 7.5v3.333M10 13.333h.008" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const IconPlug = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.667 1.667v3.333M13.333 1.667v3.333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5 5h10v4.167A5.833 5.833 0 0110 15a5.833 5.833 0 01-5-5.833V5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M10 15v3.333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const IconGateway = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.667" y="5.833" width="16.667" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M5.833 4.167V5.833M14.167 4.167V5.833" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="10" cy="10.833" r="2.083" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export const IconLock = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2.667" y="7.333" width="10.667" height="7.333" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M5.333 7.333V5.333a2.667 2.667 0 015.334 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="8" cy="10.667" r="1" fill="currentColor"/>
  </svg>
);

export const IconStar = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1.333l1.84 3.727 4.16.607-3 2.92.707 4.12L8 10.547l-3.707 1.96.707-4.12-3-2.92 4.16-.607L8 1.333z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IconSpinner = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 1s linear infinite' }}>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round"/>
  </svg>
);

export const IconSettings = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="2.333" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 1.333v1.334M8 13.333v1.334M1.333 8h1.334M13.333 8h1.334M3.286 3.286l.943.943M11.771 11.771l.943.943M3.286 12.714l.943-.943M11.771 4.229l.943-.943" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

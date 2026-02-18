import React from 'react';
const ICONS = {
  review: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" /></svg>,
  rewrite: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M11.23 3.43a.75.75 0 0 1 1.06 1.06l-1.5 1.5a.75.75 0 0 1-1.06-1.06l1.5-1.5ZM9.5 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V2.75A.75.75 0 0 1 9.5 2Zm-3.22.53a.75.75 0 0 1 0 1.06l-1.5 1.5a.75.75 0 0 1-1.06-1.06l1.5-1.5a.75.75 0 0 1 1.06 0ZM4 6.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V7.25A.75.75 0 0 1 4 6.5Zm-2.53 3.22a.75.75 0 0 1 1.06 0l1.5 1.5a.75.75 0 0 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 0-1.06Z" /><path fillRule="evenodd" d="M8.5 6a.5.5 0 0 1 .5.5v2.53l5.22 5.22a.75.75 0 0 1-1.06 1.06L8 10.061V15.5a.5.5 0 0 1-1 0V1.5a.5.5 0 0 1 .5-.5H8a.5.5 0 0 1 .5.5v4.5Z" clipRule="evenodd" /></svg>,
  explain: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 3.5A.75.75 0 0 0 3.25 2h9.5a.75.75 0 0 0 0-1.5h-9.5A2.25 2.25 0 0 0 1 2.75v10.5A2.25 2.25 0 0 0 3.25 15.5h9.5A2.25 2.25 0 0 0 15 13.25V3.5a.75.75 0 0 0-1.5 0v9.75a.75.75 0 0 1-.75.75h-9.5a.75.75 0 0 1-.75-.75V3.5Z" /><path d="M4.25 6a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5ZM4.25 9a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z" /></svg>,
  optimize: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M8.75 1.75a.75.75 0 0 0-1.5 0V7h-2.372a.25.25 0 0 0-.203.39l4.5 6.5a.25.25 0 0 0 .451-.057L10.5 8.25H8.75V1.75Z" /></svg>,
  check: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M13.78 4.47a.75.75 0 0 1 0 1.06l-6.5 6.5a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l2.47 2.47 5.97-5.97a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" /></svg>,
  high: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-1.03-5.22a.75.75 0 0 1 1.06-1.06L8 8.94l1.97-1.97a.75.75 0 1 1 1.06 1.06L9.06 10l1.97 1.97a.75.75 0 1 1-1.06 1.06L8 11.06l-1.97 1.97a.75.75 0 0 1-1.06-1.06L6.94 10l-1.97-1.97Z" clipRule="evenodd" /></svg>,
  medium: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M8.22 1.754a.75.75 0 0 0-1.44 0L1.65 13.25a.75.75 0 0 0 .72 1h11.26a.75.75 0 0 0 .72-1L8.22 1.754ZM8 10.25a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 1 1.5 0v2.5a.75.75 0 0 1-.75.75Zm0 2a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" /></svg>,
  suggestion: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-3.75a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4.25ZM9.25 11a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" clipRule="evenodd" /></svg>,
};

export const Icon = ({ name, className = '' }) => {
  const svg = ICONS[name];
  if (!svg) return null;
  const colorClass = ['high', 'medium', 'suggestion', 'check'].includes(name) ? `icon-${name}` : '';
  return <span className={`icon ${className} ${colorClass}`}>{svg}</span>;
};

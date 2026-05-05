import React from 'react';

const Logo = ({ className = '', style = {} }) => (
  <svg 
    className={className} 
    style={style}
    viewBox="0 0 160 60" 
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
  >
    {/* Text 'Clariva' only (shards removed as requested) */}
    <g transform="translate(10, 42)">
      <text 
        fontFamily="Inter, system-ui, -apple-system, sans-serif" 
        fontWeight="300" 
        fontSize="44" 
        fill="currentColor"
        letterSpacing="-1px"
      >
        <tspan fill="#C09E60">C</tspan>lariva
      </text>
    </g>
  </svg>
);

export default Logo;

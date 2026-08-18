import React from 'react';

// Exact QR pattern matching the WhatsApp invite code
const QR_ROWS = [
  "11111110100100110011001011100101111111",
  "10000010010111010101111010110001000001",
  "10111010110011001010100110110101011101",
  "10111010011010001110010001100101011101",
  "10111010110010101111001111001001011101",
  "10000010011111101000111001011001000001",
  "11111110101010101010101010101001111111",
  "00000000000110000100010010011100000000",
  "10101010110001011100100011100110111110",
  "01100100111001000100101101110011000101",
  "11000111011011101111001010110110011000",
  "10110011100100111001110100001101101111",
  "11101100101101000111110111010010100101",
  "01001010101011101001000101011011110100",
  "11111001100010000000000000111100010011",
  "10011110111010000000000000010111100101",
  "00101010001100000000000000001011001011",
  "11010011010010000000000000001101111010",
  "01101100001100000000000000000110000111",
  "10010111100110000000000000010101110101",
  "10110001011000000000000000001100101001",
  "01011100101110000000000000111011010110",
  "11100111000101000000000001001101111001",
  "00011010110010110111011010011000011010",
  "11110101001101001000100101100110011000",
  "01001100101010110011010011011011010111",
  "10100111010110011101001100100101101010",
  "00110010111001001011101110111110011101",
  "11011001000110110100010001111101101100",
  "01100110110011001101001101000100100111",
  "11111110101001110101110011010111011010",
  "10000010011100100010011001111101101101",
  "10111010110110101101000101000110010010",
  "10111010001001011011011011011001101101",
  "10111010100111000100101100101110110110",
  "10000010010010111010010110010001001011",
  "11111110111001010111010011101111101101",
];

interface WhatsAppOriginalQRCodeProps {
  className?: string;
}

export const WhatsAppOriginalQRCode: React.FC<WhatsAppOriginalQRCodeProps> = ({
  className = "w-64 h-64",
}) => {
  const numCols = 38;
  const numRows = QR_ROWS.length;
  const padding = 3;
  const totalGridCols = numCols + padding * 2;
  const totalGridRows = numRows + padding * 2;
  const cellSize = 10;
  const svgWidth = totalGridCols * cellSize;
  const svgHeight = totalGridRows * cellSize;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-full"
        style={{ shapeRendering: 'crispEdges' }}
      >
        {/* Pure White Background Card with soft rounded corners */}
        <rect
          x="0"
          y="0"
          width={svgWidth}
          height={svgHeight}
          rx="32"
          ry="32"
          fill="#ffffff"
          style={{ shapeRendering: 'auto' }}
        />

        {/* Modules */}
        <g transform={`translate(${padding * cellSize}, ${padding * cellSize})`}>
          {QR_ROWS.map((row, rIdx) =>
            row.split('').map((val, cIdx) => {
              if (val !== '1') return null;

              // Clear center circle area for the WhatsApp logo
              const cx = cIdx - 18.5;
              const cy = rIdx - 18;
              if (cx * cx + cy * cy <= 24) return null;

              return (
                <rect
                  key={`${rIdx}-${cIdx}`}
                  x={cIdx * cellSize}
                  y={rIdx * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill="#000000"
                />
              );
            })
          )}

          {/* WhatsApp Logo Overlay in Center */}
          <g
            transform={`translate(${18.5 * cellSize}, ${18 * cellSize})`}
            style={{ shapeRendering: 'auto' }}
          >
            {/* White Circle Cutout */}
            <circle cx="0" cy="0" r="46" fill="#ffffff" />

            {/* WhatsApp Speech Bubble (Black Outline) */}
            <path
              d="M -30 -6 C -30 -23 -17 -36 3 -36 C 23 -36 37 -23 37 -6 C 37 11 23 24 3 24 C -3 24 -9 22 -14 20 L -28 25 L -24 13 C -28 7 -30 1 -30 -6 Z"
              fill="none"
              stroke="#000000"
              strokeWidth="5.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Phone Handset Icon */}
            <path
              d="M 12 7 C 10 7 3 -1 -3 -7 C -5 -9 -6 -12 -4 -15 L -2 -18 C -1 -19 1 -19 2 -18 L 6 -12 C 7 -11 7 -9 6 -8 L 4 -6 C 6 -2 10 2 14 4 L 16 2 C 17 1 19 1 20 2 L 26 6 C 27 7 27 9 26 10 L 23 12 C 20 14 17 13 12 7 Z"
              fill="#000000"
              transform="translate(-6, -3) scale(0.72)"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};

export default WhatsAppOriginalQRCode;

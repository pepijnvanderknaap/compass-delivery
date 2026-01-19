'use client';

import { useState, useEffect } from 'react';

interface HoverNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export default function HoverNumberInput({
  value,
  onChange,
  min = 0,
  max = 9999,
  className = ''
}: HoverNumberInputProps) {
  const [inputValue, setInputValue] = useState(String(value));

  // Sync inputValue with value prop when it changes
  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const handleIncrement = () => {
    const newValue = Math.min(max, value + 1);
    onChange(newValue);
    setInputValue(String(newValue));
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, value - 1);
    onChange(newValue);
    setInputValue(String(newValue));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const numValue = parseInt(val);
    if (!isNaN(numValue)) {
      const boundedValue = Math.max(min, Math.min(max, numValue));
      onChange(boundedValue);
    }
  };

  const handleBlur = () => {
    // Ensure the input shows the actual bounded value
    setInputValue(String(value));
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 rounded text-gray-700 font-bold transition-colors"
      >
        −
      </button>
      <input
        type="number"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        className="w-16 px-2 py-1.5 text-center text-sm border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 rounded text-gray-700 font-bold transition-colors"
      >
        +
      </button>
    </div>
  );
}

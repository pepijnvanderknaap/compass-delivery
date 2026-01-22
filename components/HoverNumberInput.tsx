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
  const [inputValue, setInputValue] = useState(value === 0 ? '' : String(value));

  // Sync inputValue with value prop when it changes
  useEffect(() => {
    setInputValue(value === 0 ? '' : String(value));
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

    // If empty, set to 0
    if (val === '') {
      onChange(0);
    } else {
      const numValue = parseInt(val);
      if (!isNaN(numValue)) {
        const boundedValue = Math.max(min, Math.min(max, numValue));
        onChange(boundedValue);
      }
    }
  };

  const handleBlur = () => {
    // Ensure the input shows the actual bounded value (empty if 0)
    setInputValue(value === 0 ? '' : String(value));
  };

  return (
    <input
      type="number"
      value={inputValue}
      onChange={handleInputChange}
      onBlur={handleBlur}
      min={min}
      max={max}
      className={`w-16 px-2 py-1.5 text-center text-apple-subheadline font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white text-slate-700 ${className}`}
    />
  );
}

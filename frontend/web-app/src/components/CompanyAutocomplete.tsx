'use client';

import { useState, useEffect, useRef } from 'react';
import { MAJOR_COMPANIES } from '@/data/companies';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function CompanyAutocomplete({ value, onChange }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (input: string) => {
    onChange(input);
    if (input.length > 0) {
      const filtered = MAJOR_COMPANIES.filter(company =>
        company.toLowerCase().startsWith(input.toLowerCase())
      ).slice(0, 8);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => value.length > 0 && suggestions.length > 0 && setShowSuggestions(true)}
        placeholder="e.g., Tesla, Microsoft, Lockheed Martin"
        className="w-full glass-panel px-4 py-3 rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-accent-500"
        required
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 glass-panel border border-[var(--border)] rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {suggestions.map((company, idx) => (
            <div
              key={idx}
              onClick={() => {
                onChange(company);
                setShowSuggestions(false);
              }}
              className="px-4 py-2.5 cursor-pointer hover:bg-[var(--border)] text-[var(--text-primary)] text-sm transition-colors"
            >
              {company}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

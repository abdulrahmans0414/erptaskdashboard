import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiSearch, FiChevronDown, FiX, FiCheck } from 'react-icons/fi';

/**
 * Premium Searchable Combobox Component
 * Features keyboard accessibility, smooth animations, avatars/metadata matching, and cascade support.
 */
export const SearchableCombobox = ({
    options = [],
    value = '',
    onChange = () => {},
    placeholder = 'Select option...',
    label = '',
    disabled = false,
    className = '',
    error = '',
    isClearable = true,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Filtered options based on search query
    const filteredOptions = useMemo(() => {
        if (!searchQuery) return options;
        const normalized = searchQuery.toLowerCase().trim();
        return options.filter((opt) => {
            const nameMatch = opt.label?.toLowerCase().includes(normalized);
            const subMatch = opt.subLabel?.toLowerCase().includes(normalized);
            const descMatch = opt.description?.toLowerCase().includes(normalized);
            return nameMatch || subMatch || descMatch;
        });
    }, [options, searchQuery]);

    // Find the currently selected option to display its label in the input
    const selectedOption = useMemo(() => {
        return options.find((opt) => opt.value === value);
    }, [options, value]);

    // Sync input displays with value selection
    useEffect(() => {
        if (selectedOption) {
            setSearchQuery(selectedOption.label);
        } else {
            setSearchQuery('');
        }
    }, [selectedOption, value]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                // Reset search query back to active selection
                if (selectedOption) {
                    setSearchQuery(selectedOption.label);
                } else {
                    setSearchQuery('');
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedOption]);

    const handleSelect = (option) => {
        onChange(option.value);
        setSearchQuery(option.label);
        setIsOpen(false);
        setActiveIndex(-1);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
        setSearchQuery('');
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (disabled) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
            } else {
                setActiveIndex((prev) => 
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                );
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (isOpen) {
                setActiveIndex((prev) => 
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                );
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (isOpen && activeIndex >= 0 && activeIndex < filteredOptions.length) {
                handleSelect(filteredOptions[activeIndex]);
            } else if (!isOpen) {
                setIsOpen(true);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            if (selectedOption) {
                setSearchQuery(selectedOption.label);
            } else {
                setSearchQuery('');
            }
        }
    };

    return (
        <div ref={containerRef} className={`relative flex flex-col gap-1.5 w-full antialiased subpixel-antialiased ${className}`}>
            {label && (
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {label}
                </label>
            )}
            
            <div className="relative">
                <div 
                    onClick={() => {
                        if (!disabled) {
                            setIsOpen(!isOpen);
                            inputRef.current?.focus();
                        }
                    }}
                    className={`flex items-center w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white transition-all duration-300 cursor-text group ${
                        isOpen ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white shadow-sm' : 'hover:border-slate-350'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${error ? 'border-red-500 focus-within:ring-red-500/20' : ''}`}
                >
                    <FiSearch className="text-slate-500 mr-2.5 group-focus-within:text-blue-500 transition-colors" size={16} />
                    
                    <input
                        ref={inputRef}
                        type="text"
                        disabled={disabled}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (!isOpen) setIsOpen(true);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="w-full text-sm font-medium text-slate-800 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder-slate-400"
                    />

                    <div className="flex items-center gap-1.5 ml-2">
                        {isClearable && value && !disabled && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="p-1 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200"
                            >
                                <FiX size={14} />
                            </button>
                        )}
                        <FiChevronDown 
                            className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} 
                            size={16} 
                        />
                    </div>
                </div>

                <AnimatePresence>
                    {isOpen && !disabled && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 4, scale: 1 }}
                            exit={{ opacity: 0, y: 5, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-[999] w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-150 overflow-hidden"
                        >
                            <div className="max-h-[260px] overflow-y-auto custom-scrollbar py-1">
                                {filteredOptions.length === 0 ? (
                                    <div className="px-4 py-6 text-sm text-center text-slate-500 font-medium">
                                        No matches found
                                    </div>
                                ) : (
                                    filteredOptions.map((opt, index) => {
                                        const isSelected = opt.value === value;
                                        const isActive = index === activeIndex;

                                        return (
                                            <div
                                                key={opt.value}
                                                onClick={() => handleSelect(opt)}
                                                onMouseEnter={() => setActiveIndex(index)}
                                                className={`flex items-center justify-between px-3.5 py-2.5 mx-1.5 my-0.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer select-none ${
                                                    isSelected ? 'bg-blue-600 text-white font-semibold' : ''
                                                } ${
                                                    isActive && !isSelected ? 'bg-slate-50 text-slate-800' : 'text-slate-650'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {opt.avatar && (
                                                        <img 
                                                            src={opt.avatar} 
                                                            alt={opt.label} 
                                                            className="w-7 h-7 rounded-full border border-slate-200 object-cover flex-shrink-0"
                                                        />
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="leading-tight">{opt.label}</span>
                                                        {opt.subLabel && (
                                                            <span className={`text-[11px] mt-0.5 leading-none ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                                                {opt.subLabel}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isSelected && <FiCheck className="text-white flex-shrink-0" size={16} />}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            {error && (
                <span className="text-xs text-red-500 font-medium px-1">
                    {error}
                </span>
            )}
        </div>
    );
};

export default SearchableCombobox;

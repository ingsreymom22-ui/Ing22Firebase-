import React, { useRef, useEffect, useState } from 'react';
import { Palette, Bold, Italic, Underline as UnderlineIcon, Strikethrough, CheckSquare, Type, Highlighter, List, ListOrdered, ChevronDown } from 'lucide-react';

const OUTLINE_STYLES = [
  { label: '1, 2, 3...', value: 'decimal' },
  { label: '01, 02, 03...', value: 'decimal-leading-zero' },
  { label: 'A, B, C...', value: 'upper-alpha' },
  { label: 'a, b, c...', value: 'lower-alpha' },
  { label: 'I, II, III...', value: 'upper-roman' },
  { label: 'i, ii, iii...', value: 'lower-roman' },
];

const BULLET_STYLES = [
  '•', '🌹', '⭐', '🚗', '❤️', '✅', '✨', '🔥', '🔮', '🍃', '🎵', '👑', '☀️', '🌙', '💎', '📌', '👥', '⏳', '💡', '🏃', '🥑', '💧', '💪', '🍎', '⚡', '🌿', '📚', '👉', '🚀', '🎯', '▶', '🟢', '💠', '🔹', '🔸', '🚩', '🏁', '①', '②', '③', '❶', '❷', '❸'
];

const CHECKLIST_STYLES = [
  '⬜', '✅', '☑️', '✓', '❌', '✗', '⭕', '🔘', '🟩', '🔴'
];

export const fontFamilies = [
    { name: 'Modern', value: 'Inter' },
    { name: 'Display', value: 'Space Grotesk' },
    { name: 'Elegant', value: 'Playfair Display' },
    { name: 'Technical', value: 'JetBrains Mono' },
    { name: 'Handwritten', value: 'cursive' }
];

export const textColors = [
    { name: 'Slate', value: '#334155' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Fuchsia', value: '#d946ef' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Clear', value: 'transparent' }
];

export const highlightColors = [
    { name: 'Light Yellow', value: '#fff9c4' },
    { name: 'Light Green', value: '#c8e6c9' },
    { name: 'Light Blue', value: '#bbdefb' },
    { name: 'Light Pink', value: '#f8bbd0' },
    { name: 'Light Purple', value: '#e1bee7' },
    { name: 'Light Orange', value: '#ffe0b2' },
    { name: 'Light Teal', value: '#b2dfdb' },
    { name: 'Light Cyan', value: '#b2ebf2' },
    { name: 'Light Indigo', value: '#c5cae9' },
    { name: 'Clear Highlight', value: 'transparent' }
];

export const FloatingToolbar = () => {
    const [pickerPos, setPickerPos] = useState<{ x: number, y: number } | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [showListStyleMenu, setShowListStyleMenu] = useState<'bullet' | 'number' | 'check' | null>(null);
    const dragStartCoords = useRef<{ x: number, y: number } | null>(null);
    const savedRange = useRef<Range | null>(null);

    useEffect(() => {
        const handleSelection = () => {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Only show if the selection is inside a contenteditable
            let isEditable = false;
            let node = range.commonAncestorContainer;
            while (node) {
              if (node.nodeType === 1 && (node as HTMLElement).getAttribute('contenteditable') === 'true') {
                isEditable = true;
                break;
              }
              node = node.parentNode as Node;
            }

            if (isEditable && rect.width > 0) {
              setPickerPos((prev) => {
                  if (!prev) {
                      setDragOffset({ x: 0, y: 0 });
                      setShowListStyleMenu(null);
                  }
                  return {
                      x: rect.left + (rect.width / 2),
                      y: rect.top - 10
                  };
              });
              savedRange.current = range.cloneRange();
            } else {
              setPickerPos(null);
              setShowListStyleMenu(null);
            }
          } else {
            setPickerPos(null);
            setShowListStyleMenu(null);
          }
        };

        const handleMouseUp = () => setTimeout(handleSelection, 10);
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift' || e.key.startsWith('Arrow')) {
                setTimeout(handleSelection, 10);
            }
        };

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('keyup', handleKeyUp);
        
        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const applyTextColor = (color: string) => {
        const selection = window.getSelection();
        if (!selection || !savedRange.current) return;
        
        selection.removeAllRanges();
        selection.addRange(savedRange.current);

        if (color === 'transparent') {
            document.execCommand('removeFormat', false, undefined);
        } else {
            document.execCommand('foreColor', false, color);
        }

        selection.removeAllRanges();
        savedRange.current = null;
        setPickerPos(null);
    };

    const applyHighlightColor = (color: string) => {
        const selection = window.getSelection();
        if (!selection || !savedRange.current) return;
        
        selection.removeAllRanges();
        selection.addRange(savedRange.current);

        if (color === 'transparent') {
            document.execCommand('backColor', false, '#ffffff');
            document.execCommand('removeFormat', false, undefined);
        } else {
            document.execCommand('backColor', false, color);
        }

        selection.removeAllRanges();
        savedRange.current = null;
        setPickerPos(null);
    };

    const applyFontFamily = (font: string) => {
        const selection = window.getSelection();
        if (!selection || !savedRange.current) return;
        
        selection.removeAllRanges();
        selection.addRange(savedRange.current);

        document.execCommand('fontName', false, font);

        const fontTags = document.querySelectorAll('font');
        fontTags.forEach(tag => {
            if (tag.hasAttribute('face')) {
                const span = document.createElement('span');
                span.style.fontFamily = tag.getAttribute('face') || font;
                
                // Copy any other styles on the old tag that might be there
                if (tag.hasAttribute('size')) span.style.fontSize = tag.style.fontSize;
                if (tag.hasAttribute('color')) span.style.color = tag.style.color;
                
                while (tag.firstChild) {
                    span.appendChild(tag.firstChild);
                }
                tag.parentNode?.replaceChild(span, tag);
            }
        });

        if (selection.rangeCount > 0) {
            savedRange.current = selection.getRangeAt(0).cloneRange();
        }
    };

    const applyFontSize = (size: string) => {
        const selection = window.getSelection();
        if (!selection || !savedRange.current) return;
        
        selection.removeAllRanges();
        selection.addRange(savedRange.current);

        document.execCommand('fontSize', false, '7');

        const fontTags = document.querySelectorAll('font[size="7"]');
        fontTags.forEach(node => {
            const tag = node as HTMLElement;
            const span = document.createElement('span');
            span.style.fontSize = `${size}px`;
            
            // Apply other preserved styles
            if (tag.hasAttribute('face')) span.style.fontFamily = tag.style.fontFamily;
            if (tag.hasAttribute('color')) span.style.color = tag.style.color;
            
            while (tag.firstChild) {
                span.appendChild(tag.firstChild);
            }
            tag.parentNode?.replaceChild(span, tag);
        });

        if (selection.rangeCount > 0) {
            savedRange.current = selection.getRangeAt(0).cloneRange();
        }
    };

    const applyFormat = (command: string, value?: string) => {
        const selection = window.getSelection();
        if (!selection || !savedRange.current) return;
        
        selection.removeAllRanges();
        selection.addRange(savedRange.current);

        document.execCommand(command, false, value);

        // Keep selection active to allow combining formats
        savedRange.current = selection.getRangeAt(0).cloneRange();
    };

    const insertListStyle = (type: 'bullet' | 'number' | 'check', marker?: string) => {
        const selection = window.getSelection();
        if (!selection || !savedRange.current) return;
        
        selection.removeAllRanges();
        selection.addRange(savedRange.current);
        
        let html = '';
        
        if (type === 'check') {
            const checkboxMarker = marker || '⬜';
            html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">${checkboxMarker}</span><span>&nbsp;</span></li></ul><div><br></div>`;
        } else if (type === 'bullet') {
            const bulletMarker = marker || '•';
            html = `<ul style="list-style-type: '${bulletMarker} '; margin-top: 4px; margin-bottom: 4px;"><li><span>&nbsp;</span></li></ul><div><br></div>`;
        } else if (type === 'number') {
            const listStyleType = marker || 'decimal';
            html = `<ol style="list-style-type: ${listStyleType}; margin-top: 4px; margin-bottom: 4px;"><li><span>&nbsp;</span></li></ol><div><br></div>`;
        }
        
        if (html) {
            document.execCommand('insertHTML', false, html);
        }
        
        savedRange.current = null;
        setPickerPos(null);
        setShowListStyleMenu(null);
    };

    const handleToolbarMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.group\\/font') || (e.target as HTMLElement).closest('.group\\/size')) return;

        dragStartCoords.current = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y };

        const handleMouseMove = (mouseMoveEvt: MouseEvent) => {
            if (!dragStartCoords.current) return;
            setDragOffset({
                x: mouseMoveEvt.clientX - dragStartCoords.current.x,
                y: mouseMoveEvt.clientY - dragStartCoords.current.y,
            });
        };

        const handleMouseUp = () => {
            dragStartCoords.current = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    if (!pickerPos) return null;

    return (
        <div 
            className="fixed z-[9999] bg-white p-3 rounded-[24px] shadow-[0px_20px_50px_rgba(0,0,0,0.15)] border border-slate-200 flex flex-col gap-3 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200 min-w-[360px] cursor-move"
            style={{ 
                left: pickerPos.x + dragOffset.x, 
                top: pickerPos.y + dragOffset.y, 
                transform: 'translateX(-50%) translateY(-110%)' 
            }}
            onMouseDown={handleToolbarMouseDown}
        >
            <div className="flex gap-2 items-center px-1">
                <div className="flex bg-slate-50 p-1 rounded-xl gap-1 items-center shrink-0">
                    <div className="relative group/font z-[99999] bg-white rounded-lg border border-transparent">
                        <div className="px-2 py-1 text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1 hover:bg-slate-100 rounded-lg">
                            <span className="w-16 truncate text-slate-700">Modern</span>
                            <span className="text-[8px] text-slate-400">▼</span>
                        </div>
                        <div className="absolute hidden group-hover/font:flex flex-col gap-1 top-full left-0 bg-white shadow-[0px_10px_30px_rgba(0,0,0,0.1)] border border-slate-200 p-1.5 rounded-xl mt-1 max-h-[200px] overflow-y-auto min-w-[120px]">
                            {fontFamilies.map(f => (
                                <button
                                    key={f.value}
                                    onClick={() => applyFontFamily(f.value)}
                                    style={{ fontFamily: f.value }}
                                    className="text-left px-2 py-1.5 text-[11px] rounded hover:bg-slate-100 w-full whitespace-nowrap transition-colors text-slate-700"
                                >
                                    {f.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="relative group/size z-[99999] bg-white rounded-lg border border-transparent">
                        <div className="px-2 py-1 text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1 hover:bg-slate-100 rounded-lg">
                            <span className="w-5 text-center text-slate-700">14p</span>
                            <span className="text-[8px] text-slate-400">▼</span>
                        </div>
                        <div className="absolute hidden group-hover/size:flex flex-col gap-1 top-full left-0 bg-white shadow-[0px_10px_30px_rgba(0,0,0,0.1)] border border-slate-200 p-1.5 rounded-xl mt-1 w-[60px] max-h-[200px] overflow-y-auto">
                            {[12, 14, 16, 18, 20, 24, 28, 32, 48].map(s => (
                                <button
                                    key={s}
                                    onClick={() => applyFontSize(s.toString())}
                                    className="text-center px-2 py-1.5 text-[11px] rounded hover:bg-slate-100 w-full transition-colors text-slate-700"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="w-px h-6 bg-slate-100 self-center mx-1" />

                <div className="flex gap-1">
                    <button onClick={() => applyFormat('bold')} className="p-2 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors" title="Bold"><Bold size={16} /></button>
                    <button onClick={() => applyFormat('italic')} className="p-2 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors" title="Italic"><Italic size={16} /></button>
                    <button onClick={() => applyFormat('underline')} className="p-2 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors" title="Underline"><UnderlineIcon size={18} /></button>
                    <button onClick={() => applyFormat('strikeThrough')} className="p-2 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors" title="Strikethrough"><Strikethrough size={18} /></button>
                </div>

                <div className="w-px h-6 bg-slate-100 self-center mx-1" />

                <div className="flex gap-1">
                    <button onClick={() => applyFormat('justifyLeft')} className="p-2 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors" title="Align Left"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg></button>
                    <button onClick={() => applyFormat('justifyCenter')} className="p-2 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors" title="Align Center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg></button>
                    <button onClick={() => applyFormat('justifyRight')} className="p-2 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors" title="Align Right"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg></button>
                </div>

                <div className="w-px h-6 bg-slate-100 self-center mx-2" />

                <div className="flex gap-1">
                          <div className="relative">
                            <button 
                              className={`p-1.5 rounded flex items-center gap-0.5 transition-colors ${showListStyleMenu === 'bullet' ? 'bg-orange-100 text-orange-600' : 'hover:bg-slate-50 text-slate-600'}`}
                              title="Bullet List Styles"
                              onClick={() => setShowListStyleMenu(showListStyleMenu === 'bullet' ? null : 'bullet')}
                            >
                              <List size={16} />
                              <ChevronDown size={10} className="opacity-50" />
                            </button>
                            {showListStyleMenu === 'bullet' && (
                              <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-[300] grid grid-cols-5 gap-1">
                                {BULLET_STYLES.map(b => (
                                  <button key={b} onClick={() => insertListStyle('bullet', b)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-sm transition-colors text-slate-800">{b}</button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="relative">
                            <button 
                              className={`p-1.5 rounded flex items-center gap-0.5 transition-colors ${showListStyleMenu === 'number' ? 'bg-orange-100 text-orange-600' : 'hover:bg-slate-50 text-slate-600'}`}
                              title="Numbered List Styles"
                              onClick={() => setShowListStyleMenu(showListStyleMenu === 'number' ? null : 'number')}
                            >
                              <ListOrdered size={16} />
                              <ChevronDown size={10} className="opacity-50" />
                            </button>
                            {showListStyleMenu === 'number' && (
                              <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-slate-200 shadow-xl rounded-xl p-1 z-[300] flex flex-col">
                                {OUTLINE_STYLES.map(n => (
                                  <button key={n.value} onClick={() => insertListStyle('number', n.value)} className="text-left px-2 py-1.5 hover:bg-slate-100 rounded-lg text-[10px] uppercase font-bold text-slate-700 transition-colors">{n.label}</button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="relative">
                            <button 
                              className={`p-1.5 rounded flex items-center gap-0.5 transition-colors ${showListStyleMenu === 'check' ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-slate-50 text-slate-600'}`}
                              title="Checklist Styles"
                              onClick={() => setShowListStyleMenu(showListStyleMenu === 'check' ? null : 'check')}
                            >
                              <CheckSquare size={16} />
                              <ChevronDown size={10} className="opacity-50" />
                            </button>
                            {showListStyleMenu === 'check' && (
                              <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-[300] grid grid-cols-4 gap-1">
                                {CHECKLIST_STYLES.map(c => (
                                  <button key={c} onClick={() => insertListStyle('check', c)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-xs transition-colors">{c}</button>
                                ))}
                              </div>
                            )}
                          </div>
                </div>
            </div>

            <div className="w-full h-px bg-slate-100" />

            <div className="flex flex-col gap-2 px-1 pb-1">
                <div className="flex gap-3 items-center">
                    <span title="Font Color" className="flex items-center"><Palette size={14} className="text-slate-400 shrink-0" /></span>
                    <div className="flex gap-1.5 ml-4 flex-wrap">
                    {textColors.slice(0, 10).map(color => (
                        <button 
                            key={color.value}
                            className={`w-6 h-6 rounded-full border border-slate-200 shadow-sm hover:scale-125 transition-transform cursor-pointer ${color.value === 'transparent' ? 'bg-slate-50 flex items-center justify-center' : ''}`}
                            style={{ backgroundColor: color.value === 'transparent' ? '#ffffff' : color.value }}
                            onClick={() => applyTextColor(color.value)}
                            title={color.name}
                        >
                            {color.value === 'transparent' && <span className="text-[10px] font-black opacity-35 text-slate-400">✕</span>}
                        </button>
                    ))}
                    </div>
                </div>

                <div className="flex gap-3 items-center">
                    <span title="Highlight Color" className="flex items-center"><Highlighter size={14} className="text-slate-400 shrink-0" /></span>
                    <div className="flex gap-1.5 ml-4 flex-wrap">
                    {highlightColors.slice(0, 10).map(color => (
                        <button 
                            key={color.value}
                            className={`w-6 h-6 rounded-full border border-slate-200 shadow-sm hover:scale-125 transition-transform cursor-pointer ${color.value === 'transparent' ? 'bg-slate-50 flex items-center justify-center' : ''}`}
                            style={{ backgroundColor: color.value === 'transparent' ? '#ffffff' : color.value }}
                            onClick={() => applyHighlightColor(color.value)}
                            title={color.name}
                        >
                            {color.value === 'transparent' && <span className="text-[10px] font-black opacity-35 text-slate-400">✕</span>}
                        </button>
                    ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const RichTextDiv: React.FC<{
    value: string;
    onChange: (val: string) => void;
    className?: string;
    style?: React.CSSProperties;
    placeholder?: string;
    tagName?: string;
    onFocus?: () => void;
    onBlur?: () => void;
    customBullets?: string[];
    customChecklists?: string[];
}> = ({ value, onChange, className, style, placeholder, tagName = 'div', onFocus, onBlur, customBullets, customChecklists }) => {
    const editorRef = useRef<HTMLElement>(null);
    const isFocusedRef = useRef(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedValueRef = useRef(value);

    // Only update innerHTML if not focused & content differs (prevents caret jump for typing user)
    useEffect(() => {
        if (editorRef.current && !isFocusedRef.current && editorRef.current.innerHTML !== (value || '')) {
            editorRef.current.innerHTML = value || '';
            lastSavedValueRef.current = value || '';
        }
    }, [value]);

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const handleInput = (e: React.FormEvent<HTMLElement>) => {
        const newValue = e.currentTarget.innerHTML;
        
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            if (newValue !== lastSavedValueRef.current) {
                lastSavedValueRef.current = newValue;
                onChange(newValue);
            }
        }, 1200); // 1.2 second debounce keeps high frequency typing buttery smooth
    };

    const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
        isFocusedRef.current = false;
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        const newValue = e.target.innerHTML;
        if (newValue !== lastSavedValueRef.current) {
            lastSavedValueRef.current = newValue;
            onChange(newValue);
        }
        if (onBlur) onBlur();
    };

    const handleFocus = () => {
        isFocusedRef.current = true;
        if (onFocus) onFocus();
    };

    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
        const target = e.target as HTMLElement;
        if (target.classList?.contains('task-checkbox') && target.getAttribute('contenteditable') === 'false') {
            const text = target.innerText.trim();
            const toggles: Record<string, string> = {
                '⬜': '✅', '✅': '⬜',
                '[ ]': '[x]', '[x]': '[ ]',
                '🔳': '✅',
                '⚪': '🟢', '🟢': '⚪',
                '🔴': '🟢',
                '❎': '✅',
                '✓': '✅'
            };
            if (toggles[text]) {
                target.innerText = toggles[text];
                if (editorRef.current) {
                    const newValue = editorRef.current.innerHTML;
                    lastSavedValueRef.current = newValue;
                    onChange(newValue);
                }
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter') {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const li = range.startContainer.parentElement?.closest('li') || (range.startContainer.nodeType === 1 ? (range.startContainer as HTMLElement).closest('li') : null);
                if (li) {
                    const liText = li.textContent?.trim() || '';
                    const bList = customBullets || ['•','🌹','⭐','🚗','❤️','✅','✨','🔥','🔮','🍃','🎵','👑','☀️','🌙','💎'];
                    const cList = customChecklists || ['⬜', '[ ]', '🔳', '⚪', '🔴', '❎', '✓'];
                    
                    if (liText === '' || cList.some(m => liText === m) || bList.some(m => liText === m)) {
                        return;
                    }

                    // 1) Checklist
                    const checkbox = li.querySelector('.task-checkbox');
                    if (checkbox) {
                        e.preventDefault();
                        let marker = checkbox.textContent || '⬜';
                        const togglesToBlank: Record<string, string> = {
                            '✅': '⬜', '🟢': '⚪', '[x]': '[ ]'
                        };
                        if (togglesToBlank[marker]) marker = togglesToBlank[marker];

                        const html = `<li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">${marker}</span><span>&nbsp;</span></li>`;
                        document.execCommand('insertHTML', false, html);
                        return;
                    }

                    // 2) Custom bullet / emoji list
                    const foundMarker = bList.find(m => liText.trim().startsWith(m));
                    if (foundMarker) {
                        e.preventDefault();
                        const html = `<li>${foundMarker} &nbsp;</li>`;
                        document.execCommand('insertHTML', false, html);
                        return;
                    }

                    // 3) Custom numeric increment list: e.g. "1.", "1)", "1-"
                    const numMatch = liText.trim().match(/^(\d+)([\.\)\-])/);
                    if (numMatch) {
                        e.preventDefault();
                        const currentNum = parseInt(numMatch[1], 10);
                        const separator = numMatch[2];
                        const nextNum = currentNum + 1;
                        const html = `<li>${nextNum}${separator} &nbsp;</li>`;
                        document.execCommand('insertHTML', false, html);
                        return;
                    }
                }
            }
        } else if (e.key === 'Tab') {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const node = range.startContainer.nodeType === 1 ? range.startContainer as HTMLElement : range.startContainer.parentElement;
                if (!node) return;

                // 1) Handle Custom Grids (Brainstorm, Pros & Cons)
                const customGrid = node.closest('div[style*="display: grid"]');
                const isCustomWidget = node.closest('.brainstorm-card-wrapper') || node.closest('.pros-cons-wrapper');
                
                if (customGrid && isCustomWidget) {
                    const editableBoxes = Array.from(customGrid.querySelectorAll('.brainstorm-box, .pros-box, .cons-box'));
                    const currentBox = node.closest('.brainstorm-box, .pros-box, .cons-box');
                    
                    if (currentBox && editableBoxes.length > 0) {
                        const index = editableBoxes.indexOf(currentBox as HTMLElement);
                        if (index === editableBoxes.length - 1) {
                            // At the last box: clone the last two children
                            e.preventDefault();
                            const children = Array.from(customGrid.children);
                            if (children.length >= 2) {
                                const lastTwo = children.slice(-2);
                                const clone1 = lastTwo[0].cloneNode(true) as HTMLElement;
                                const clone2 = lastTwo[1].cloneNode(true) as HTMLElement;
                                
                                const edit1 = clone1.querySelector('.brainstorm-box, .pros-box, .cons-box');
                                if (edit1) edit1.innerHTML = '<br/>';
                                const edit2 = clone2.querySelector('.brainstorm-box, .pros-box, .cons-box');
                                if (edit2) edit2.innerHTML = '<br/>';
                                
                                customGrid.appendChild(clone1);
                                customGrid.appendChild(clone2);
                                
                                setTimeout(() => {
                                    const newEdit = clone1.querySelector('.brainstorm-box, .pros-box, .cons-box');
                                    if (newEdit) {
                                        const newRange = document.createRange();
                                        newRange.selectNodeContents(newEdit);
                                        newRange.collapse(true);
                                        const sel = window.getSelection();
                                        sel?.removeAllRanges();
                                        sel?.addRange(newRange);
                                    }
                                }, 0);
                            }
                            return;
                        } else if (index !== -1) {
                            // Jump to next box
                            e.preventDefault();
                            const nextBox = editableBoxes[index + 1];
                            if (nextBox) {
                                const newRange = document.createRange();
                                newRange.selectNodeContents(nextBox);
                                newRange.collapse(true);
                                const sel = window.getSelection();
                                sel?.removeAllRanges();
                                sel?.addRange(newRange);
                            }
                            return;
                        }
                    }
                }

                // 2) Handle HTML Tables
                const td = node.closest('td, th');
                if (td) {
                    const tr = td.closest('tr');
                    const tbody = tr?.closest('tbody') || tr?.closest('table');
                    if (tr && tbody) {
                        const allCells = Array.from(tbody.querySelectorAll('td, th'));
                        const currentIndex = allCells.indexOf(td as HTMLElement);
                        
                        if (currentIndex === allCells.length - 1) {
                            // Last cell in table! Add row.
                            e.preventDefault();
                            const newTr = tr.cloneNode(true) as HTMLTableRowElement;
                            Array.from(newTr.querySelectorAll('td, th')).forEach(newTd => {
                                newTd.innerHTML = '<br/>';
                            });
                            tr.parentNode?.appendChild(newTr);
                            
                            setTimeout(() => {
                                const firstCell = newTr.querySelector('td, th');
                                if (firstCell) {
                                    const newRange = document.createRange();
                                    newRange.selectNodeContents(firstCell);
                                    newRange.collapse(true);
                                    const sel = window.getSelection();
                                    sel?.removeAllRanges();
                                    sel?.addRange(newRange);
                                }
                            }, 0);
                            return;
                        } else if (currentIndex !== -1) {
                            // Jump to next cell
                            e.preventDefault();
                            const nextCell = allCells[currentIndex + 1];
                            if (nextCell) {
                                const newRange = document.createRange();
                                newRange.selectNodeContents(nextCell);
                                newRange.collapse(false);
                                const sel = window.getSelection();
                                sel?.removeAllRanges();
                                sel?.addRange(newRange);
                            }
                            return;
                        }
                    }
                }
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLElement>) => {
        // Intercept paste to replace '**' markdown bolding with actual strong tags
        const html = e.clipboardData.getData('text/html');
        const text = e.clipboardData.getData('text/plain');
        
        if (html) {
            if (html.includes('**')) {
                e.preventDefault();
                const processedHtml = html
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*\*/g, ''); // catch any lingering floating stars
                document.execCommand('insertHTML', false, processedHtml);
            }
        } else if (text) {
            if (text.includes('**')) {
                e.preventDefault();
                const processedHtml = text
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\n/g, '<br/>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*\*/g, '');
                document.execCommand('insertHTML', false, processedHtml);
            }
        }
    };

    const Tag = tagName as any;

    return (
        <Tag
            ref={editorRef}
            contentEditable={true}
            suppressContentEditableWarning={true}
            className={`outline-none empty:before:content-[attr(placeholder)] empty:before:text-black/30 ${className || ''}`}
            style={style}
            onInput={handleInput}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
        />
    );
};

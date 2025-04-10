'use client';

import React, { useState, useRef, useEffect } from 'react';

interface EditorCommand {
  command: string;
  value?: string;
}

export default function RichTextEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [fontSize, setFontSize] = useState<string>("16");
  const [isRTL, _setIsRTL] = useState<boolean>(true);
  const [currentColor, setCurrentColor] = useState<string>("#000000");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);

  const execCommand = (command: EditorCommand) => {
    document.execCommand(command.command, false, command.value);
    
    // Update states based on the command
    switch (command.command) {
      case 'bold':
        setIsBold(document.queryCommandState('bold'));
        break;
      case 'italic':
        setIsItalic(document.queryCommandState('italic'));
        break;
      case 'underline':
        setIsUnderline(document.queryCommandState('underline'));
        break;
    }
    
    editorRef.current?.focus();
  };

  const handleFontSize = (size: string) => {
    setFontSize(size);
    
    const selection = document.getSelection();
    if (!selection || !editorRef.current) return;

    // Enable CSS styling
    document.execCommand('styleWithCSS', false, 'true');

    if (!selection.isCollapsed && selection.rangeCount > 0) {
      // If text is selected, wrap it in a span with the new font size
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;
      try {
        range.surroundContents(span);
      } catch {
        // If surroundContents fails, try a different approach
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
      }
    } else {
      // If no text is selected, prepare for new text input
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;
      span.innerHTML = '\u200B'; // Zero-width space to maintain cursor position
      
      const range = selection.getRangeAt(0);
      range.insertNode(span);
      
      // Position cursor inside the span
      range.setStart(span, 0);
      range.setEnd(span, 1);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Set up a one-time input handler
      const handleInput = (e: InputEvent) => {
        if (e.inputType === 'insertText') {
          const target = e.target as HTMLElement;
          if (target.innerHTML === '\u200B') {
            target.innerHTML = '';
          }
        }
      };
      
      span.addEventListener('input', handleInput as EventListener, { once: true });
    }

    editorRef.current.focus();
  };

  const handleColorChange = (color: string) => {
    setCurrentColor(color);
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);
    editorRef.current?.focus();
  };

  const handleColorButtonClick = () => {
    colorInputRef.current?.click();
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('רק קבצי תמונה נתמכים');
      return;
    }

    try {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (!event.target?.result || !editorRef.current) return;

        editorRef.current.focus();
        
        // עוטף את התמונה ב-div שיאפשר יישור
        const imgHtml = `
          <div style="text-align: inherit;">
            <img 
              src="${event.target.result}" 
              alt="uploaded" 
              style="max-width: 100%; height: auto; display: inline-block; margin: 10px 0;"
            />
          </div>
        `;
        
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (editorRef.current.contains(range.commonAncestorContainer)) {
            document.execCommand('insertHTML', false, imgHtml);
          } else {
            document.execCommand('insertHTML', false, imgHtml);
          }
        } else {
          editorRef.current.innerHTML += imgHtml;
        }
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert('שגיאה בטעינת התמונה. אנא נסה שוב.');
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('שגיאה בהעלאת התמונה. אנא נסה שוב.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImageFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleImageFile(imageFile);
    }
  };

  const checkFormatting = () => {
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsUnderline(document.queryCommandState('underline'));
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      checkFormatting();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto p-4  rounded-3xl ">
      <div className="border border-gray-200 rounded-3xl shadow-sm">
        <div className="flex flex-row-reverse items-center p-2 border-b  border-gray-200">
          {/* Toolbar sections */}
          <div className="flex flex-row-reverse items-center gap-2 ml-auto">
            {/* Text formatting controls */}
            <div className="flex flex-row-reverse border-l border-gray-300 pl-2 mr-2">
              <button
                onClick={() => execCommand({ command: 'bold' })}
                className={`p-1.5 rounded transition-colors ${
                  isBold 
                    ? 'bg-gray-200' 
                    : 'hover:bg-gray-200'
                }`}
                title="Bold"
              >
                <strong className="text-sm">B</strong>
              </button>
              
              <button
                onClick={() => execCommand({ command: 'italic' })}
                className={`p-1.5 rounded transition-colors ${
                  isItalic 
                    ? 'bg-gray-200' 
                    : 'hover:bg-gray-200'
                }`}
                title="Italic"
              >
                <em className="text-sm">I</em>
              </button>
              
              <button
                onClick={() => execCommand({ command: 'underline' })}
                className={`p-1.5 rounded transition-colors ${
                  isUnderline 
                    ? 'bg-gray-200' 
                    : 'hover:bg-gray-200'
                }`}
                title="Underline"
              >
                <u className="text-sm">U</u>
              </button>
            </div>

            {/* Alignment controls */}
            <div className="flex flex-row-reverse border-l border-gray-300 pl-2 mr-2">
              <button
                onClick={() => execCommand({ command: 'justifyRight' })}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Align Right"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="21" y1="6" x2="3" y2="6"></line>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                  <line x1="21" y1="18" x2="7" y2="18"></line>
                </svg>
              </button>
              <button
                onClick={() => execCommand({ command: 'justifyCenter' })}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="21" y1="6" x2="3" y2="6"></line>
                  <line x1="18" y1="12" x2="6" y2="12"></line>
                  <line x1="19" y1="18" x2="5" y2="18"></line>
                </svg>
              </button>
              <button
                onClick={() => execCommand({ command: 'justifyLeft' })}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Align Left"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="15" y2="12"></line>
                  <line x1="3" y1="18" x2="17" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* Right side tools */}
          <div className="flex flex-row-reverse items-center gap-2">
            {/* Debug button */}
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`p-1.5 rounded transition-colors ${
                showDebug 
                  ? 'bg-gray-200' 
                  : 'hover:bg-gray-200'
              }`}
              title="Show HTML Output"
            >
              <span className="text-sm font-mono">{`</>`}</span>
            </button>
            
            {/* Color picker */}
            <div className="relative mr-2">
              <button
                onClick={handleColorButtonClick}
                className="p-1.5 hover:bg-gray-200 rounded flex items-center justify-center"
                title="Text Color"
                style={{
                  width: '28px',
                  height: '28px'
                }}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: currentColor,
                    border: '1px solid #ccc'
                  }}
                />
              </button>
              <input
                ref={colorInputRef}
                type="color"
                value={currentColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="absolute top-full left-0 mt-1 opacity-0 cursor-pointer"
                style={{
                  width: '200px',
                  height: '40px',
                  padding: 0,
                  border: 'none'
                }}
                aria-label="Choose text color"
              />
            </div>

            {/* Font size dropdown */}
            <div className="flex items-center border-r border-gray-300 pl-2">
              <select
                value={fontSize}
                onChange={(e) => handleFontSize(e.target.value)}
                className="p-1 border rounded text-sm bg-transparent"
              >
                {[8, 10, 12, 14, 16, 18, 20, 24, 28, 32].map((size) => (
                  <option key={size} value={size}>
                    {size}px
                  </option>
                ))}
              </select>

            </div>

            {/* Image upload */}
            <label className="p-1.5 hover:bg-gray-200 rounded cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              📷
            </label>
          </div>
        </div>

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-90 pointer-events-none z-10">
            <div className="text-blue-500 text-xl">שחרר כדי להעלות תמונה</div>
          </div>
        )}

        {/* Editor container with relative positioning */}
        <div className="relative">
          {/* Editor content area */}
          <div
            ref={editorRef}
            contentEditable
            className={`min-h-[200px] p-4 focus:outline-none ${
              isDragging ? 'bg-blue-50' : ''
            }`}
            dir={isRTL ? 'rtl' : 'ltr'}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onPaste={(e) => {
              e.preventDefault();
              
              // Handle pasted images
              const items = Array.from(e.clipboardData.items);
              const imageItem = items.find(item => item.type.startsWith('image/'));
              
              if (imageItem) {
                const file = imageItem.getAsFile();
                if (file) {
                  handleImageFile(file);
                  return;
                }
              }
              
              // Handle pasted text
              const text = e.clipboardData.getData('text/plain');
              document.execCommand('insertText', false, text);
            }}
          />
        </div>
        
        {/* Debug Output Panel */}
        {showDebug && (
          <div className="border-t border-gray-200 p-4">
            <div className="text-sm font-medium mb-2">HTML Output:</div>
            <pre className="bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
              {editorRef.current?.innerHTML || ''}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 
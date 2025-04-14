import React, { useState, useEffect } from 'react';
import SplitPane from 'react-split-pane';
import Editor from '@monaco-editor/react';
import styled from 'styled-components';

const IDEContainer = styled.div`
  height: 100vh;
  width: 100vw;
  background: #1e1e1e;
  color: #fff;
`;

const OutputContainer = styled.div`
  background: #1c1c1c;
  color: #00ff00;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  white-space: pre-wrap;
  overflow-y: auto;
  height: 100%;
  padding: 12px;
  border-left: 2px solid #444;
  position: relative;
  text-align: left;

  &::before {
    content: '$ Output';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: #2d2d2d;
    padding: 8px 12px;
    font-size: 12px;
    color: #888;
    border-bottom: 1px solid #444;
  }

  & > div {
    margin-top: 32px;
    padding-left: 8px;
  }
`;

const RunButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 8px 16px;
  background: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  z-index: 1;
  font-family: 'Segoe UI', 'Arial', sans-serif;
  font-weight: 500;
  
  &:hover {
    background: #0062a3;
  }

  &:active {
    background: #005290;
  }
`;

// Custom styles for the split pane
const StyledSplitPane = styled(SplitPane)`
  .Resizer {
    background: #444;
    opacity: 1;
    z-index: 1;
    box-sizing: border-box;
    background-clip: padding-box;
    width: 11px;
    margin: 0 -5px;
    border-left: 5px solid rgba(255, 255, 255, 0);
    border-right: 5px solid rgba(255, 255, 255, 0);
    cursor: col-resize;
    
    &:hover {
      border-left: 5px solid rgba(0, 122, 204, 0.5);
      border-right: 5px solid rgba(0, 122, 204, 0.5);
    }
    
    &.vertical {
      width: 11px;
      margin: 0 -5px;
    }
  }
`;

const PythonIDE = () => {
  const [code, setCode] = useState('# Write your Python code here\nprint("Hello, World!")');
  const [output, setOutput] = useState('');
  const [pyodide, setPyodide] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPyodide = async () => {
      const pyodide = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
      });
      
      // Set up custom stdout capture
      pyodide.runPython(`
        import sys
        from io import StringIO
        
        class StringIOWithCallback(StringIO):
            def __init__(self, initial_value='', callback=None):
                super().__init__(initial_value)
                self.callback = callback

            def write(self, text):
                super().write(text)
                if self.callback:
                    self.callback(text)
        
        def set_stdout_callback(callback):
            sys.stdout = StringIOWithCallback(callback=callback)
            sys.stderr = StringIOWithCallback(callback=callback)
      `);
      
      setPyodide(pyodide);
      setIsLoading(false);
    };
    loadPyodide();
  }, []);

  const runCode = async () => {
    if (!pyodide) return;
    
    try {
      setOutput('');
      
      // Set up the callback to capture stdout
      pyodide.globals.set('output_callback', (text) => {
        setOutput(prev => prev + text);
      });
      
      // Set up the stdout capture
      pyodide.runPython('set_stdout_callback(output_callback)');
      
      // Run the actual code
      const result = await pyodide.runPythonAsync(code);
      
      // If there's a return value, append it to the output
      if (result !== undefined && result !== null) {
        setOutput(prev => prev + String(result) + '\n');
      }
    } catch (error) {
      setOutput(prev => prev + 'Error: ' + error.message + '\n');
    }
  };

  if (isLoading) {
    return <div>Loading Pyodide...</div>;
  }

  return (
    <IDEContainer>
      <RunButton onClick={runCode}>Run</RunButton>
      <StyledSplitPane
        split="vertical"
        defaultSize="50%"
        minSize={200}
        maxSize={800}
      >
        <Editor
          height="100%"
          defaultLanguage="python"
          value={code}
          onChange={setCode}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
        <OutputContainer>
          <div>{output || 'Output will appear here...'}</div>
        </OutputContainer>
      </StyledSplitPane>
    </IDEContainer>
  );
};

export default PythonIDE; 
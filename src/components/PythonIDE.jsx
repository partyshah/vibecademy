import React, { useState, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import Editor from '@monaco-editor/react';
import styled from 'styled-components';
import Chatbot from './Chatbot';

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

const ResizeHandle = styled(PanelResizeHandle)`
  width: 11px;
  background: #444;
  transition: background-color 0.2s;

  &:hover {
    background: rgba(0, 122, 204, 0.5);
  }
`;

const LoadingContainer = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #1e1e1e;
  color: #fff;
  font-family: 'Segoe UI', 'Arial', sans-serif;
`;

const PythonIDE = () => {
  const [code, setCode] = useState('# Write your Python code here\nprint("Hello, World!")');
  const [output, setOutput] = useState('');
  const [pyodide, setPyodide] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRunOutput, setLastRunOutput] = useState('');

  // Function to set code from chatbot
  const setCodeFromChat = (newCode) => {
    setCode(newCode);
  };

  // Function to get the current code
  const getCurrentCode = () => {
    return code;
  };

  // Function to get the last run output
  const getLastOutput = () => {
    return lastRunOutput;
  };

  useEffect(() => {
    const loadPyodide = async () => {
      try {
        // Make sure the script is loaded
        if (typeof window.loadPyodide !== 'function') {
          console.error('Pyodide script not loaded');
          setOutput('Error: Pyodide failed to load. Please refresh the page.');
          setIsLoading(false);
          return;
        }

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
      } catch (error) {
        console.error('Error loading Pyodide:', error);
        setOutput('Error: ' + error.message);
        setIsLoading(false);
      }
    };

    // Small delay to ensure the script has time to load
    setTimeout(loadPyodide, 1000);
  }, []);

  const runCode = async () => {
    if (!pyodide) return;
    
    try {
      setOutput('');
      let currentOutput = '';
      
      // Set up the callback to capture stdout
      pyodide.globals.set('output_callback', (text) => {
        currentOutput += text;
        setOutput(prev => prev + text);
      });
      
      // Set up the stdout capture
      pyodide.runPython('set_stdout_callback(output_callback)');
      
      // Run the actual code
      const result = await pyodide.runPythonAsync(code);
      
      // If there's a return value, append it to the output
      if (result !== undefined && result !== null) {
        currentOutput += String(result) + '\n';
        setOutput(prev => prev + String(result) + '\n');
      }

      setLastRunOutput(currentOutput);
    } catch (error) {
      const errorOutput = 'Error: ' + error.message + '\n';
      setOutput(prev => prev + errorOutput);
      setLastRunOutput(errorOutput);
    }
  };

  if (isLoading) {
    return (
      <LoadingContainer>
        <div>
          <h2>Loading Python Environment...</h2>
          <p>This may take a few seconds on first load.</p>
        </div>
      </LoadingContainer>
    );
  }

  return (
    <IDEContainer>
      <RunButton onClick={runCode}>Run</RunButton>
      <PanelGroup direction="horizontal">
        <Panel defaultSize={40} minSize={20}>
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
        </Panel>
        <ResizeHandle />
        <Panel defaultSize={30} minSize={20}>
          <OutputContainer>
            <div>{output || 'Output will appear here...'}</div>
          </OutputContainer>
        </Panel>
        <ResizeHandle />
        <Panel defaultSize={30} minSize={20}>
          <Chatbot 
            setCode={setCodeFromChat}
            getCode={getCurrentCode}
            getOutput={getLastOutput}
            runCode={runCode}
          />
        </Panel>
      </PanelGroup>
    </IDEContainer>
  );
};

export default PythonIDE; 
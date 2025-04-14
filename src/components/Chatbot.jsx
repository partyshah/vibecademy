import React, { useState } from 'react';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ChatContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  color: #fff;
  border-left: 2px solid #444;
`;

const ChatHeader = styled.div`
  padding: 12px;
  background: #2d2d2d;
  border-bottom: 1px solid #444;
  font-size: 14px;
  color: #888;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const MessageContent = styled.div`
  font-size: 14px;
  line-height: 1.5;
  text-align: left;
  
  pre {
    margin: 0;
    padding: 0;
  }
  
  code {
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  }
  
  p {
    margin: 0 0 1em 0;
    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const Message = styled.div`
  padding: 8px 12px;
  border-radius: 8px;
  max-width: 80%;
  word-wrap: break-word;
  background: ${props => props.$isUser ? '#007acc' : '#2d2d2d'};
  align-self: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
`;

const InputContainer = styled.div`
  padding: 12px;
  border-top: 1px solid #444;
  display: flex;
  gap: 8px;
`;

const Input = styled.input`
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #444;
  border-radius: 4px;
  background: #2d2d2d;
  color: #fff;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #007acc;
  }
`;

const SendButton = styled.button`
  padding: 8px 16px;
  background: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background: #0062a3;
  }

  &:active {
    background: #005290;
  }
`;

const TutorialButton = styled.button`
  margin: 12px;
  padding: 8px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background: #218838;
  }

  &:active {
    background: #1e7e34;
  }
`;

const Chatbot = ({ setCode, getCode, getOutput, runCode }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTutorialMode, setIsTutorialMode] = useState(false);

  const startTutorial = async () => {
    setIsLoading(true);
    setIsTutorialMode(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: "Let's start the for loop tutorial!",
          isInitialAssessment: true,
          currentCode: getCode(),
          lastOutput: getOutput()
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setMessages([{ text: data.response, isUser: false }]);
    } catch (error) {
      console.error('Error starting tutorial:', error);
      setMessages([{ 
        text: "Sorry, I encountered an error starting the tutorial. Please try again.", 
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setIsLoading(true);
    
    // Add user message to chat
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userMessage,
          isInitialAssessment: isTutorialMode && messages.length === 0,
          currentCode: getCode(),
          lastOutput: getOutput()
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      console.log('Response from server:', data);
      
      // If the response includes code to insert
      if (data.codeToInsert) {
        console.log('Inserting code:', data.codeToInsert);
        setCode(data.codeToInsert);
        if (data.shouldRun) {
          console.log('Running code...');
          await runCode();
        }
      }

      setMessages(prev => [...prev, { text: data.response, isUser: false }]);
    } catch (error) {
      console.error('Error calling API:', error);
      setMessages(prev => [...prev, { 
        text: "Sorry, I encountered an error. Please try again.", 
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChatContainer>
      <ChatHeader>Claude Chat</ChatHeader>
      {!isTutorialMode && (
        <TutorialButton onClick={startTutorial}>
          Start For Loop Tutorial
        </TutorialButton>
      )}
      <MessagesContainer>
        {messages.map((message, index) => (
          <Message key={index} $isUser={message.isUser}>
            <MessageContent>
              <ReactMarkdown
                components={{
                  code({node, inline, className, children, ...props}) {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : 'python';
                    return !inline ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={language}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  // Override paragraph rendering to use div instead
                  p: ({children}) => <div style={{marginBottom: '1em'}}>{children}</div>
                }}
              >
                {message.text}
              </ReactMarkdown>
            </MessageContent>
          </Message>
        ))}
        {isLoading && (
          <Message isUser={false}>
            Claude is thinking...
          </Message>
        )}
      </MessagesContainer>
      <InputContainer>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <SendButton 
          onClick={handleSend}
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </SendButton>
      </InputContainer>
    </ChatContainer>
  );
};

export default Chatbot; 
import React, { useState } from 'react';
import styled from 'styled-components';

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

const Message = styled.div`
  padding: 8px 12px;
  border-radius: 8px;
  max-width: 80%;
  word-wrap: break-word;
  background: ${props => props.isUser ? '#007acc' : '#2d2d2d'};
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
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

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
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
      <MessagesContainer>
        {messages.map((message, index) => (
          <Message key={index} isUser={message.isUser}>
            {message.text}
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
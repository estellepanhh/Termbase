import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, message } from 'antd';
import { CloseOutlined, SendOutlined } from '@ant-design/icons';

const ChatAI: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: '你好！我是术语库AI助手，有什么问题可以问我～' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!inputValue.trim()) return;
        const userMsg = inputValue;
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);
        try {
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg }),
            });
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let assistantMsg = '';
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
            while (true) {
                const { done, value } = await reader!.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6);
                        if (dataStr === '[DONE]') continue;
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.content) {
                                assistantMsg += data.content;
                                setMessages(prev => {
                                    const newMessages = [...prev];
                                    newMessages[newMessages.length - 1].content = assistantMsg;
                                    return newMessages;
                                });
                            } else if (data.error) {
                                message.error(data.error);
                            }
                        } catch {
                            // 解析失败跳过此行
                        }
                    }
                }
            }
        } catch {
            message.error('AI助手暂时无法响应');
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {!visible && (
  <div
    onClick={() => setVisible(true)}
    style={{
      position: 'fixed',
      bottom: 80,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #1677ff, #4096ff)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(22,119,255,0.4), 0 0 0 4px rgba(22,119,255,0.2)',
      transition: 'all 0.3s ease',
      zIndex: 9999,
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'scale(1.05)';
      e.currentTarget.style.boxShadow = '0 6px 16px rgba(22,119,255,0.6), 0 0 0 6px rgba(22,119,255,0.2)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(22,119,255,0.4), 0 0 0 4px rgba(22,119,255,0.2)';
    }}
  >
    <span style={{ fontSize: 24, fontWeight: 'bold', color: 'white', pointerEvents: 'none' }}>
      AI
    </span>
  </div>
)}
            {visible && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: 80,
                        right: 24,
                        width: 360,
                        height: 500,
                        background: 'white',
                        borderRadius: 12,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        zIndex: 1001,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ padding: '12px 16px', background: '#1677ff', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
                        <span>AI 智能助手</span>
                        <CloseOutlined onClick={() => setVisible(false)} style={{ cursor: 'pointer' }} />
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{ marginBottom: 12, display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: 12, background: msg.role === 'user' ? '#1677ff' : '#f0f0f0', color: msg.role === 'user' ? 'white' : 'black' }}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && <div style={{ textAlign: 'center', color: '#999' }}>AI正在思考...</div>}
                        <div ref={messagesEndRef} />
                    </div>
                    <div style={{ padding: 12, borderTop: '1px solid #e8e8e8', display: 'flex', gap: 8 }}>
                        <Input.TextArea
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onPressEnter={e => { e.preventDefault(); sendMessage(); }}
                            placeholder="输入问题..."
                            autoSize={{ minRows: 1, maxRows: 3 }}
                            style={{ flex: 1 }}
                        />
                        <Button type="primary" icon={<SendOutlined />} onClick={sendMessage} disabled={loading} />
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatAI;
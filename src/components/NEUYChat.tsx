'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, X, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase';
import { logEvent } from '@/lib/telemetry';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface NEUYChatProps {
  participantContext?: string;
  targetDomain?: string;
}

export function NEUYChat({ participantContext, targetDomain }: NEUYChatProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Tracks whether this chat session has already been logged — resets on close.
  const sessionLoggedRef = useRef(false);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hi, I'm NEUY. I'm here to help you through the JIT intervention. You can ask me about your domain profile, your tools, or bring me a specific situation you're navigating at work. What's on your mind?"
      }]);
    }
    if (!isOpen) {
      sessionLoggedRef.current = false;
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: Message = { role: 'user', content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    // Log once per session — on the first message sent after opening the chat.
    if (firestore && user && !sessionLoggedRef.current) {
      sessionLoggedRef.current = true;
      logEvent(firestore, user.uid, 'chat_session_started', {
        ...(targetDomain ? { targetDomain } : {}),
      });
    }
    try {
      const response = await fetch('/api/neuy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, participantContext }),
      });
      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('NEUY error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed bottom-28 right-6 z-50 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-xl shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
      >
        {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
      </button>
      {isOpen && (
        <div className="fixed bottom-44 right-6 z-50 w-[360px] max-h-[500px] bg-white rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b bg-primary/5 flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">N</span>
            </div>
            <div>
              <p className="font-black text-sm text-primary">NEUY</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">JIT Coaching Companion</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed", msg.role === 'user' ? "bg-primary text-white rounded-br-sm font-medium" : "bg-slate-50 text-foreground rounded-bl-sm")}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-50 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message NEUY..."
              className="resize-none min-h-[44px] max-h-[120px] rounded-xl text-sm"
              rows={1}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="sm"
              className="h-11 w-11 rounded-xl p-0 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

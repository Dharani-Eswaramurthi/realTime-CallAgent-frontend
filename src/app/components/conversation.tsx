'use client';

import { useConversation } from '@elevenlabs/react';
import { useCallback, useState, useEffect } from 'react';

export function Conversation() {
  const [error, setError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Transcript UI state (cleared on reload by design)
  const [transcriptSummary, setTranscriptSummary] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Array<{ role: string; message: string }>>([]);
  
  // Polling for transcript updates every 10 seconds
  useEffect(() => {
    const pollTranscript = async () => {
      try {
        const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const resp = await fetch(`${backendBase}/conversations/latest`, { cache: 'no-store' });
        if (resp.ok) {
          const data = await resp.json();
          const agentMessages = Array.isArray(data.transcript) ? data.transcript : [];
          const summary = typeof data.summary === 'string' ? data.summary : null;
          
          setTranscript(agentMessages);
          setTranscriptSummary(summary);
        }
      } catch (error) {
        // Silently fail - don't show errors during polling
        console.log('Polling failed:', error);
      }
    };
    
    // Poll immediately and then every 10 seconds
    pollTranscript();
    const interval = setInterval(pollTranscript, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to agent');
      setError(null);
      setIsAnimating(true);
    },
    onDisconnect: () => {
      console.log('Disconnected from agent');
      setIsAnimating(false);
    },
    onMessage: (message) => {
      console.log('Message received:', message);
    },
    onError: (error) => {
      console.error('Conversation error:', error);
      setError(typeof error === 'string' ? error : 'An error occurred');
      setIsAnimating(false);
    },
  });

  const startConversation = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start the conversation with your agent
      const agentId = process.env.NEXT_PUBLIC_AGENT_ID;
      if (!agentId) {
        throw new Error('Agent ID not found in environment variables');
      }
      
      await conversation.startSession({
        agentId: agentId,
        userId: 'user_' + Date.now(), // Generate a unique user ID
        connectionType: 'webrtc',
      });

    } catch (error) {
      console.error('Failed to start conversation:', error);
      setError(error instanceof Error ? error.message : 'Failed to start conversation');
      setIsAnimating(false);
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession();
      setIsAnimating(false);
    } catch (error) {
      console.error('Failed to stop conversation:', error);
      setError(error instanceof Error ? error.message : 'Failed to stop conversation');
    }
  }, [conversation]);

  // Voice wave animation effect
  const VoiceWaves = () => (
    <div className="absolute inset-0 flex items-center justify-center">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className={`absolute rounded-full border-2 border-white/30 ${
            isAnimating && conversation.isSpeaking ? 'animate-pulse' : ''
          }`}
          style={{
            width: `${60 + i * 20}px`,
            height: `${60 + i * 20}px`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: '2s',
          }}
        />
      ))}
    </div>
  );

  return (
    <>
    <div className="relative w-96 h-96 mx-auto">
      {/* Outer glow effect */}
      <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-cyan-400/20 via-blue-500/20 to-purple-600/20 blur-xl animate-pulse"></div>
      
      {/* Main circular container with 3D effect */}
      <div className="relative w-full h-full rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 shadow-2xl transform hover:scale-105 transition-all duration-500">
        {/* Inner metallic effect */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-white/20 via-transparent to-black/20"></div>
        
        {/* Animated radial lines */}
        <div className="absolute inset-0 rounded-full">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-full bg-gradient-to-b from-transparent via-white/20 to-transparent origin-center"
              style={{
                transform: `rotate(${i * 30}deg)`,
                left: '50%',
                marginLeft: '-1px',
              }}
            />
          ))}
        </div>
        
        {/* Voice waves animation */}
        <VoiceWaves />
        
        {/* Central content */}
        <div className="relative z-20 flex flex-col items-center justify-center h-full p-8">
          {/* Main button with glassmorphism effect */}
          <button
            onClick={conversation.status === 'connected' ? stopConversation : startConversation}
            disabled={conversation.status === 'connecting'}
            className="group relative flex items-center gap-4 px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-2xl font-semibold hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed transition-all duration-300 shadow-xl border border-white/20 hover:border-white/40 hover:shadow-2xl hover:scale-105"
          >
            {/* Animated microphone icon */}
            <div className="relative">
              <svg 
                className={`w-6 h-6 transition-all duration-300 ${
                  isAnimating ? 'animate-bounce text-cyan-300' : 'text-white'
                }`} 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
              {/* Pulse effect around mic */}
              {isAnimating && (
                <div className="absolute inset-0 rounded-full bg-cyan-300/30 animate-ping"></div>
              )}
            </div>
            
            <span className="text-lg">
              {conversation.status === 'connected' ? 'End Call' : 'Call AI Agent'}
            </span>
            
            {/* Button glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
          
          {/* Status indicator with modern design */}
          <div className="flex items-center gap-3 mt-6 px-4 py-3 bg-black/20 backdrop-blur-md rounded-xl border border-white/10">
            {/* Animated flag */}
            <div className="flex gap-0.5">
              <div className="w-1.5 h-4 bg-gradient-to-b from-green-400 to-green-600 rounded-sm animate-pulse"></div>
              <div className="w-1.5 h-4 bg-white rounded-sm"></div>
              <div className="w-1.5 h-4 bg-gradient-to-b from-red-400 to-red-600 rounded-sm animate-pulse"></div>
            </div>
            
            {/* Status indicator with glow */}
            <div className="relative">
              <div className={`w-3 h-3 rounded-full ${
                conversation.status === 'connected' ? 'bg-green-400 shadow-green-400/50' : 
                conversation.status === 'connecting' ? 'bg-yellow-400 shadow-yellow-400/50' : 'bg-gray-400'
              } shadow-lg ${isAnimating ? 'animate-pulse' : ''}`}></div>
              {conversation.status === 'connected' && (
                <div className="absolute inset-0 rounded-full bg-green-400/30 animate-ping"></div>
              )}
            </div>
            
            {/* Dropdown arrow with animation */}
            <svg className="w-4 h-4 text-white/80 hover:text-white transition-colors cursor-pointer" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </div>
          
          {/* Status text with typing animation */}
          <div className="mt-4 text-center">
            <p className="text-sm text-white/90 font-medium">
              {conversation.status === 'connected' ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Connected
                </span>
              ) : conversation.status === 'connecting' ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></span>
                  Connecting...
                </span>
              ) : (
                'Ready to call'
              )}
            </p>
            {conversation.status === 'connected' && (
              <p className="text-xs text-white/70 mt-1 flex items-center justify-center gap-2">
                {conversation.isSpeaking ? (
                  <>
                    <span className="flex gap-1">
                      <span className="w-1 h-1 bg-cyan-300 rounded-full animate-bounce"></span>
                      <span className="w-1 h-1 bg-cyan-300 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                      <span className="w-1 h-1 bg-cyan-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                    </span>
                    Agent speaking
                  </>
                ) : (
                  <>
                    <span className="flex gap-1">
                      <span className="w-1 h-1 bg-blue-300 rounded-full animate-pulse"></span>
                      <span className="w-1 h-1 bg-blue-300 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></span>
                      <span className="w-1 h-1 bg-blue-300 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></span>
                    </span>
                    Listening...
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-ping"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 3) * 20}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: '3s',
            }}
          />
        ))}
      </div>
      
      {/* Error overlay with modern design */}
      {error && (
        <div className="absolute bottom-6 left-6 right-6 bg-red-900/90 backdrop-blur-md text-red-100 rounded-xl p-4 text-sm border border-red-500/30 shadow-xl animate-slide-up">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            {error}
          </div>
        </div>
      )}
    </div>
    {/* Transcript summary and messages (visible only after end-call fetch) */}
    {(transcriptSummary || transcript.length > 0) && (
      <div className="max-w-xl mx-auto mt-8 p-4 rounded-2xl bg-white/5 text-white border border-white/10 backdrop-blur-md">
        {transcriptSummary && (
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-white/80">Transcript summary</h3>
            <p className="text-sm text-white/90 mt-1">{transcriptSummary}</p>
          </div>
        )}
        {transcript.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white/80">Transcript</h4>
            <ul className="mt-1 space-y-1">
              {transcript.map((t, idx) => (
                <li key={idx} className="text-sm text-white/90">
                  <span className="font-semibold capitalize">{t.role === 'agent' ? 'Agent' : 'Human'}:</span> {t.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )}
    </>
  );
}

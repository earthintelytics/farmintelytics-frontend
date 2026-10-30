// The Advisor tab's conversation. One AI agent endpoint answers questions and what-if scenarios: the
// chat shows the readable question; the agent also gets the portal context and, for scenarios, the
// advisor answer layout.
import { useEffect, useRef, useState } from 'react';
import * as api from '../../../../../services/organizationMonitorApi';
import { ANSWER_FORMAT } from '../../../../assistant/scenarioTemplates';

export function useAdvisorChat({ contextLine }) {
  const [scenarioFormOpen, setScenarioFormOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'assistant', text: "Ask about your fields: crop condition, water, weather or alerts. Answers use your own monitoring data." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const handleChatSubmit = async (textToSend, scenarioMeta = null) => {
    const query = textToSend || chatInput;
    if (!query.trim() || chatLoading) return;
    setChatMessages(prev => [...prev, { sender: 'user', text: query, scenario: scenarioMeta?.scenario || null }]);
    if (!textToSend) setChatInput('');
    setChatLoading(true);
    const agentQuery = scenarioMeta
      ? `[Scenario ${scenarioMeta.scenario}] ${query}

Context: ${contextLine}.
${ANSWER_FORMAT}`
      : `${query}

Context: ${contextLine}.`;
    try {
      const result = await api.queryAiAgent(agentQuery);
      const reply = result?.response || "No response from AI agent.";
      setChatMessages(prev => [...prev, { sender: 'assistant', text: reply, sources: result?.sources }]);
    } catch {
      setChatMessages(prev => [...prev, { sender: 'assistant', text: "Sorry, the AI assistant is unavailable right now. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return { scenarioFormOpen, setScenarioFormOpen, chatMessages, setChatMessages, chatInput, setChatInput, chatLoading, chatEndRef, handleChatSubmit };
}

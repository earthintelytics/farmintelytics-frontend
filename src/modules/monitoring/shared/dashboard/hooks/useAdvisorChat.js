// The Advisor tab's conversation. One AI agent endpoint answers questions and what-if scenarios: the
// chat shows the readable question; the agent also gets the portal context and, for scenarios, the
// advisor answer layout. The service (module) goes with every question, so the agent answers about this
// service's crop and results only (a rice question from the Rice portal is never answered about maize).
import { useEffect, useRef, useState } from 'react';
import * as api from '../../../../../services/organizationMonitorApi';
import { ANSWER_FORMAT } from '../../../../assistant/scenarioTemplates';

export function useAdvisorChat({ contextLine, module = null }) {
  const [scenarioFormOpen, setScenarioFormOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'assistant', text: "Ask about your fields: crop condition, water, weather or alerts. Answers use your own monitoring data." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestions, setSuggestions] = useState({ suggestions: [], groups: [] });   // questions the advisor can answer for this farm
  const chatEndRef = useRef(null);

  useEffect(() => {
    let live = true;
    api.getAdvisorSuggestions(module).then((s) => { if (live) setSuggestions(s); }).catch(() => {});
    return () => { live = false; };
  }, [module]);

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
    // The conversation so far (the first message is the greeting), so the advisor can follow on.
    const history = chatMessages.slice(1).filter(m => !m.error).slice(-8)
      .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));
    try {
      const result = await api.queryAiAgent(agentQuery, { history, ...(module ? { module } : {}) });
      const reply = result?.response || "No response from AI agent.";
      setChatMessages(prev => [...prev, { sender: 'assistant', text: reply, followUps: result?.follow_ups || [] }]);
    } catch {
      setChatMessages(prev => [...prev, { sender: 'assistant', error: true, text: "Sorry, the AI assistant is unavailable right now. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return { suggestions, scenarioFormOpen, setScenarioFormOpen, chatMessages, setChatMessages, chatInput, setChatInput, chatLoading, chatEndRef, handleChatSubmit };
}

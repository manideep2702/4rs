
import { create } from 'zustand';
import { CharacterState } from '../types';
import { DEFAULT_AGENT_SET_ID, getAgentSet } from '../data/agents';
import { useAgencyStore } from './agencyStore';

export const useStore = create<CharacterState>()(
  (set) => ({
    isThinking: false,
    instanceCount: getAgentSet(
      useAgencyStore.getState().selectedAgentSetId ?? DEFAULT_AGENT_SET_ID
    ).agents.length,

    selectedNpcIndex: null,
    selectedPosition: null,
    hoveredNpcIndex: null,
    hoveredPoiId: null,
    hoveredPoiLabel: null,
    hoverPosition: null,
    npcScreenPositions: {},
    isChatting: false,
    isTyping: false,
    chatMessages: [],
    inspectorTab: 'info',

    llmConfig: {
      provider: 'gemini',
      apiKey: 'AIzaSyCDphmgl5F_5dy4LCWHqDjvhVgHmWYF9C8',
      model: 'gemini-2.5-flash'
    },

    setThinking: (isThinking: boolean) => set({ isThinking }),
    setIsTyping: (isTyping: boolean) => set({ isTyping }),
    setInspectorTab: (tab: 'info' | 'chat') => set({ inspectorTab: tab }),
    setInstanceCount: (count: number) => set({ instanceCount: count }),

    setSelectedNpc: (index: number | null) => set({
      selectedNpcIndex: index,
      selectedPosition: null,
    }),
    setSelectedPosition: (pos: { x: number; y: number } | null) => set({ selectedPosition: pos }),
    setHoveredNpc: (index: number | null, pos: { x: number; y: number } | null) => set({
      hoveredNpcIndex: index,
      hoverPosition: pos,
      hoveredPoiId: null,
      hoveredPoiLabel: null,
    }),
    setHoveredPoi: (id: string | null, label: string | null, pos: { x: number; y: number } | null) => set({
      hoveredPoiId: id,
      hoveredPoiLabel: label,
      hoverPosition: pos,
      hoveredNpcIndex: null,
    }),
    setLlmConfig: () => {},
  })
);

// Keep instanceCount in sync whenever the active agent set changes
useAgencyStore.subscribe((state, prevState) => {
  if (state.selectedAgentSetId !== prevState.selectedAgentSetId) {
    useStore.getState().setInstanceCount(getAgentSet(state.selectedAgentSetId).agents.length);
  }
});

import React from 'react';
import { useAgencyStore } from '../store/agencyStore';
import { getAgentSet } from '../data/agents';
import { useElapsedTime } from '../hooks/useElapsedTime';
import { Clock } from 'lucide-react';

interface AgentViewProps {
  agentIndex: number;
}

function DoingNow({ agentColor, description, startMs }: { agentColor: string; description: string; startMs: number }) {
  const { label, seconds } = useElapsedTime(startMs);
  const isStuck = seconds >= 120; // warn after 2 min
  const isVeryStuck = seconds >= 600; // red after 10 min

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: agentColor }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: agentColor }} />
          </span>
          Doing Now
        </p>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isVeryStuck ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 animate-pulse' :
          isStuck     ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' :
                        'bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'
        }`}>
          <Clock size={10} />
          {label}
        </span>
      </div>
      <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-snug font-bold">
        "{description}"
      </p>
      {isVeryStuck && (
        <p className="mt-2 text-[10px] text-red-500 dark:text-red-400 font-bold">
          ⚠ No response for {Math.floor(seconds / 60)}+ min — agent may be stuck
        </p>
      )}
    </div>
  );
}

const AgentView: React.FC<AgentViewProps> = ({ agentIndex }) => {
  const { tasks, selectedAgentSetId } = useAgencyStore();
  const agents = getAgentSet(selectedAgentSetId).agents;

  const agent = agents.find(a => a.index === agentIndex);
  if (!agent) return null;

  const activeTask = tasks.find(
    (t) => t.assignedAgentIds.includes(agentIndex) && t.status === 'in_progress'
  ) ?? null;

  return (
    <div className="flex flex-col h-full p-6">
      {/* Expertise / Traits */}
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">Expertise</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed italic">{agent.mission}</p>
        <div className="flex flex-wrap gap-1 mt-3">
          {agent.expertise.map(exp => (
            <span key={exp} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 text-[9px] font-bold rounded-full uppercase">
              {exp}
            </span>
          ))}
        </div>
      </div>

      <div className="h-px bg-zinc-100 dark:bg-zinc-700 w-full mb-6" />

      {/* Task Status */}
      {activeTask ? (
        <DoingNow
          agentColor={agent.color}
          description={activeTask.description}
          startMs={activeTask.updatedAt}
        />
      ) : (
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400/50 mb-2">
            Status
          </p>
          <p className="text-sm text-zinc-300 leading-snug italic font-medium">
            Waiting for next task...
          </p>
        </div>
      )}
    </div>
  );
};

export default AgentView;

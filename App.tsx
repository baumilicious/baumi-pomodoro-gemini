import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Project, TimerMode } from './types';
import { TIME_DURATIONS, POMODOROS_UNTIL_LONG_BREAK, MODE_CONFIG, GOOGLE_SHEET_APP_URL } from './constants';

const PlayIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
);
const PauseIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
);
const ResetIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"></path></svg>
);
const PlusIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>
);
const TrashIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>
);
const CheckIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg>
);

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    try {
        const savedActiveId = localStorage.getItem('pomodoro-active-project-id');
        return savedActiveId ? JSON.parse(savedActiveId) : null;
    } catch (error) {
        console.error("Failed to parse active project ID from localStorage", error);
        return null;
    }
  });

  const [mode, setMode] = useState<TimerMode>(TimerMode.Pomodoro);
  const [timeLeft, setTimeLeft] = useState(TIME_DURATIONS[mode]);
  const [isActive, setIsActive] = useState(false);
  const [pomodorosInCycle, setPomodorosInCycle] = useState(0);
  const [newProjectName, setNewProjectName] = useState('');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    audioRef.current = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
    
    // Fetch initial data from Google Sheet
    const fetchProjects = async () => {
        if (GOOGLE_SHEET_APP_URL.includes('YOUR_DEPLOYED_APP_SCRIPT_URL_HERE')) {
            setError("Please set up your Google Apps Script and update the URL in constants.ts");
            setIsLoading(false);
            return;
        }
        try {
            const response = await fetch(GOOGLE_SHEET_APP_URL);
            const result = await response.json();
            if (result.success) {
                setProjects(result.data || []);
            } else {
                throw new Error(result.error || 'Failed to fetch projects.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error("Fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    };
    fetchProjects();
  }, []);
  
  useEffect(() => {
    // Save projects to Google Sheet on change
    const saveProjects = async () => {
        if (isLoading || GOOGLE_SHEET_APP_URL.includes('YOUR_DEPLOYED_APP_SCRIPT_URL_HERE')) {
            return;
        }
        try {
            await fetch(GOOGLE_SHEET_APP_URL, {
                method: 'POST',
                mode: 'no-cors', // Required for simple POST requests to Apps Script
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(projects),
            });
        } catch (err) {
            console.error("Failed to save projects:", err);
            setError("Failed to save projects. Check your connection and script setup.");
        }
    };
    
    // Prevent saving on the initial render until projects are loaded
    if (isInitialMount.current) {
        if (!isLoading) {
             isInitialMount.current = false;
        }
    } else {
        saveProjects();
    }

  }, [projects, isLoading]);
  
  useEffect(() => {
    localStorage.setItem('pomodoro-active-project-id', JSON.stringify(activeProjectId));
  }, [activeProjectId]);

  const switchMode = useCallback((newMode: TimerMode) => {
    setIsActive(false);
    setMode(newMode);
    setTimeLeft(TIME_DURATIONS[newMode]);
  }, []);

  useEffect(() => {
    let interval: number | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft <= 0) {
      if (audioRef.current) {
        audioRef.current.play();
      }

      if (mode === TimerMode.Pomodoro) {
        if (activeProjectId) {
          setProjects(prev => prev.map(p => 
            p.id === activeProjectId ? { ...p, pomodorosCompleted: p.pomodorosCompleted + 1 } : p
          ));
        }
        const newCycleCount = pomodorosInCycle + 1;
        setPomodorosInCycle(newCycleCount);
        if (newCycleCount % POMODOROS_UNTIL_LONG_BREAK === 0) {
          switchMode(TimerMode.LongBreak);
        } else {
          switchMode(TimerMode.ShortBreak);
        }
      } else {
        switchMode(TimerMode.Pomodoro);
      }
      setIsActive(true); // Auto-start next session
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, timeLeft, mode, activeProjectId, pomodorosInCycle, switchMode]);

  const handleStartPause = () => {
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(TIME_DURATIONS[mode]);
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      const newProject: Project = {
        id: Date.now().toString(),
        name: newProjectName.trim(),
        pomodorosCompleted: 0,
        completed: false,
      };
      setProjects([...projects, newProject]);
      if (!activeProjectId) {
        setActiveProjectId(newProject.id);
      }
      setNewProjectName('');
    }
  };

  const handleDeleteProject = (id: string) => {
    const remainingProjects = projects.filter(p => p.id !== id);
    setProjects(remainingProjects);
    if (activeProjectId === id) {
      const nextActiveProject = remainingProjects.find(p => !p.completed);
      setActiveProjectId(nextActiveProject ? nextActiveProject.id : null);
    }
  };
  
  const handleToggleProjectComplete = (id: string) => {
    setProjects(projects.map(p => 
      p.id === id ? { ...p, completed: !p.completed } : p
    ));
    
    const projectToToggle = projects.find(p => p.id === id);
    // If the currently active project is being marked as complete, deactivate it.
    if (projectToToggle && activeProjectId === id && !projectToToggle.completed) {
      setActiveProjectId(null);
    }
  };

  const activeProject = projects.find(p => p.id === activeProjectId);
  const progress = (TIME_DURATIONS[mode] - timeLeft) / TIME_DURATIONS[mode];
  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference * (1 - progress);
  const sortedProjects = [...projects].sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans space-y-8">
      <main className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="bg-brand-surface rounded-2xl shadow-lg p-6 md:p-8 flex flex-col items-center justify-center">
            <div className="flex space-x-2 mb-8 bg-brand-highlight-low p-2 rounded-full">
                {(Object.keys(MODE_CONFIG) as TimerMode[]).map(key => (
                    <button
                        key={key}
                        onClick={() => switchMode(key)}
                        className={`px-4 py-2 text-sm md:text-base font-semibold rounded-full transition-colors duration-300 ${mode === key ? `${MODE_CONFIG[key].color} text-brand-bg` : 'text-brand-subtle hover:bg-brand-highlight-med'}`}
                    >
                        {MODE_CONFIG[key].label}
                    </button>
                ))}
            </div>

            <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center">
                <svg className="absolute w-full h-full transform -rotate-90">
                    <circle cx="50%" cy="50%" r="140" strokeWidth="12" className="text-brand-highlight-med" stroke="currentColor" fill="transparent"/>
                    <circle
                        cx="50%"
                        cy="50%"
                        r="140"
                        strokeWidth="12"
                        className={`${MODE_CONFIG[mode].color.replace('bg-', 'text-')}`}
                        stroke="currentColor"
                        fill="transparent"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        style={{ transition: 'stroke-dashoffset 0.5s linear' }}
                    />
                </svg>
                <div className="z-10 text-center">
                    <h1 className="text-7xl md:text-8xl font-bold tracking-tighter text-brand-text">
                        {formatTime(timeLeft)}
                    </h1>
                </div>
            </div>

            <div className="mt-8 flex items-center space-x-6">
                <button
                    onClick={handleReset}
                    className="p-3 rounded-full text-brand-subtle hover:text-brand-text hover:bg-brand-highlight-med transition-colors duration-300"
                    aria-label="Reset Timer"
                >
                    <ResetIcon />
                </button>
                <button
                    onClick={handleStartPause}
                    className={`w-24 h-24 rounded-full flex items-center justify-center text-brand-bg font-bold text-2xl uppercase tracking-widest shadow-lg transform transition-transform duration-200 hover:scale-105 ${MODE_CONFIG[mode].color}`}
                >
                    {isActive ? <PauseIcon /> : <PlayIcon />}
                </button>
                <div className="w-9 h-9"></div>
            </div>
            <p className="mt-8 text-brand-subtle h-6">
                {activeProject ? `Working on: ${activeProject.name}` : 'Select a project to begin'}
            </p>
        </div>

        <div className="bg-brand-surface rounded-2xl shadow-lg p-6 md:p-8 flex flex-col">
            <h2 className="text-2xl font-bold text-brand-text mb-4">Projects</h2>
            <form onSubmit={handleAddProject} className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Add a new project..."
                    className="flex-grow bg-brand-highlight-low border-2 border-brand-muted focus:border-brand-iris rounded-lg px-4 py-2 outline-none transition-colors"
                />
                <button
                    type="submit"
                    className="bg-brand-iris text-brand-bg p-3 rounded-lg hover:opacity-90 transition-opacity"
                    aria-label="Add Project"
                >
                    <PlusIcon />
                </button>
            </form>
            <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-3">
                {isLoading ? (
                    <div className="text-center text-brand-muted py-10">Loading projects...</div>
                ) : error ? (
                     <div className="text-center text-brand-rose bg-brand-rose/10 p-4 rounded-lg">
                        <p className="font-semibold">Error</p>
                        <p>{error}</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="text-center text-brand-muted py-10">
                        <p>No projects yet.</p>
                        <p>Add one to get started!</p>
                    </div>
                ) : (
                    sortedProjects.map(project => (
                        <div
                            key={project.id}
                            onClick={() => !project.completed && setActiveProjectId(project.id)}
                            className={`flex items-center justify-between p-4 rounded-lg transition-all duration-300 ${
                                project.completed 
                                ? 'bg-brand-highlight-low opacity-60'
                                : activeProjectId === project.id 
                                ? 'bg-brand-highlight-med ring-2 ring-brand-iris' 
                                : 'bg-brand-highlight-low hover:bg-brand-highlight-med cursor-pointer'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleToggleProjectComplete(project.id); }}
                                    className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors ${
                                        project.completed
                                            ? 'bg-brand-foam border-brand-foam text-brand-bg'
                                            : 'border-brand-muted hover:border-brand-foam'
                                    }`}
                                    aria-label={project.completed ? `Mark '${project.name}' as not done` : `Mark '${project.name}' as done`}
                                >
                                    {project.completed && <CheckIcon />}
                                </button>
                                <span className={`font-medium text-brand-text ${project.completed ? 'line-through' : ''}`}>{project.name}</span>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className="text-sm font-semibold text-brand-subtle bg-brand-overlay px-2 py-1 rounded-full">
                                    {project.pomodorosCompleted}
                                </span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                                    className="text-brand-muted hover:text-brand-rose transition-colors"
                                    aria-label={`Delete project ${project.name}`}
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;

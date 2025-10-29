export enum TimerMode {
  Pomodoro = 'POMODORO',
  ShortBreak = 'SHORT_BREAK',
  LongBreak = 'LONG_BREAK',
}

export interface Project {
  id: string;
  name: string;
  pomodorosCompleted: number;
  completed: boolean;
}

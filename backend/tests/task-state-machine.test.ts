import { describe, expect, it } from 'vitest';
import { canTransition } from '../src/modules/tasks/task.state-machine';

describe('task state machine', () => {
  it('permite pendiente -> en_progreso -> finalizada', () => {
    expect(canTransition('PENDIENTE', 'EN_PROGRESO')).toBe(true);
    expect(canTransition('EN_PROGRESO', 'FINALIZADA')).toBe(true);
  });

  it('permite cancelar desde pendiente y desde en_progreso', () => {
    expect(canTransition('PENDIENTE', 'CANCELADA')).toBe(true);
    expect(canTransition('EN_PROGRESO', 'CANCELADA')).toBe(true);
  });

  it('no permite finalizar una tarea pendiente', () => {
    expect(canTransition('PENDIENTE', 'FINALIZADA')).toBe(false);
  });

  it('no permite iniciar una tarea finalizada o cancelada', () => {
    expect(canTransition('FINALIZADA', 'EN_PROGRESO')).toBe(false);
    expect(canTransition('CANCELADA', 'EN_PROGRESO')).toBe(false);
  });

  it('finalizada y cancelada son estados terminales', () => {
    expect(canTransition('FINALIZADA', 'CANCELADA')).toBe(false);
    expect(canTransition('CANCELADA', 'FINALIZADA')).toBe(false);
  });
});

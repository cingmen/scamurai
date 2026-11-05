// Mesin grup WA (app-logic.md §7).
import { emit } from '../core/events.js';
import { get, set } from '../core/store.js';
import { isoNow } from '../core/format.js';

export function createWAEngine(minigame) {
  const beats = [...(minigame.beats || [])];
  let index = 0;
  let highestTurn = 0;
  let paused = false;
  let ended = false;
  let responseCursor = 0;
  let timer = null;
  let pausedForAction = false;

  function current() {
    return beats[index] || null;
  }

  function clearTimer() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function scheduleBeat(speed = 1) {
    clearTimer();
    const beat = current();
    if (!beat) {
      end('habis');
      return;
    }
    const delay = Math.max(260, (beat.delay || 1400) / Math.max(1, speed));
    timer = setTimeout(() => {
      emit('wa:message', { beat, turn: beat.turn });
      highestTurn = Math.max(highestTurn, beat.turn || 0);
      index += 1;
      const next = current();
      if (beat.pause && !pausedForAction) {
        pausedForAction = true;
        paused = true;
        emit('wa:turn', {
          turn: highestTurn,
          canReport: highestTurn >= 8,
          canLeave: highestTurn >= 10,
        });
      } else {
        scheduleBeat(speed);
      }
    }, delay);
  }

  function start(speed = 1) {
    paused = false;
    scheduleBeat(speed);
  }

  function pause(speed = 1) {
    paused = false;
    pausedForAction = false;
    scheduleBeat(speed);
  }

  /** Aksi pengguna saat jeda. */
  function act(action, speed = 1) {
    if (ended) return null;
    if (action === 'diam') {
      paused = false;
      pausedForAction = false;
      scheduleBeat(speed);
      return { action };
    }
    if (action === 'bertanya') {
      const responses = minigame.responses || [];
      if (responses.length) {
        const response = responses[responseCursor % responses.length];
        responseCursor += 1;
        emit('wa:message', { beat: { ...response, turn: highestTurn, userTriggered: true }, turn: highestTurn });
      }
      paused = false;
      pausedForAction = false;
      scheduleBeat(Math.max(1.5, speed));
      return { action };
    }
    if (action === 'melaporkan') {
      return end('melaporkan');
    }
    if (action === 'keluar') {
      return end('keluar');
    }
    return null;
  }

  function end(reason) {
    if (ended) return null;
    ended = true;
    clearTimer();
    const turn = highestTurn;
    const reported = reason === 'melaporkan';
    const previousBest = get('wa.bestExitTurn', null);
    const best = previousBest === null ? turn : Math.min(previousBest, turn);
    set('wa.bestExitTurn', best);
    if (reported) set('wa.reported', true);
    set('progress.wa-grup', {
      status: 'selesai',
      bestEnding: reason,
      bestRank: reported ? 3 : 2,
      endingsSeen: [reason],
      flags: { found: 0, missed: 0 },
      debriefDone: true,
      lastStep: 0,
      loss: 0,
      updatedAt: isoNow(),
    });
    const result = { reason, turn, reported, best };
    emit('wa:end', result);
    return result;
  }

  function stop() {
    clearTimer();
    ended = true;
  }

  return {
    start,
    pause,
    act,
    stop,
    current,
    turn: () => highestTurn,
    ended: () => ended,
    isPaused: () => paused,
    total: beats.length,
    progress: () => (beats.length ? Math.min(100, Math.round((index / beats.length) * 100)) : 0),
  };
}

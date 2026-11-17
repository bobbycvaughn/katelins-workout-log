'use strict';

const program = {
  A: { day: 'Monday', exercises: [
    ['chair-squat', 'Chair sit-to-stand', 0, 8, '8–10', 'bodyweight'],
    ['wall-pushup', 'Wall push-up', 0, 8, '8–10', 'bodyweight'],
    ['row', 'Seated cable row', 0, 8, '8–10'],
    ['glute-bridge', 'Glute bridge', 0, 8, '8–10', 'bodyweight'],
    ['calf-raise', 'Supported calf raise', 0, 10, '10–12', 'bodyweight'],
    ['wall-plank', 'Wall plank', null, 15],
  ] },
  B: { day: 'Wednesday', exercises: [
    ['leg-press', 'Leg press', 0, 8, '8–10'],
    ['chest-press', 'Chest press machine', 0, 8, '8–10'],
    ['lat-pulldown', 'Lat pulldown', 0, 8, '8–10'],
    ['leg-curl', 'Leg curl machine', 0, 8, '8–10'],
    ['db-curl', 'Dumbbell biceps curl', 2, 8, '8–10', 'each'],
    ['wall-plank', 'Wall plank', null, 15],
  ] },
  C: { day: 'Friday', exercises: [
    ['chair-squat', 'Chair sit-to-stand', 0, 8, '8–10', 'bodyweight'],
    ['wall-pushup', 'Wall push-up', 0, 8, '8–10', 'bodyweight'],
    ['row', 'Seated cable row', 0, 8, '8–10'],
    ['glute-bridge', 'Glute bridge', 0, 8, '8–10', 'bodyweight'],
    ['calf-raise', 'Supported calf raise', 0, 10, '10–12', 'bodyweight'],
    ['wall-plank', 'Wall plank', null, 15],
  ] },
};

const form = {
  'chair-squat': 'Use a sturdy chair against a wall. Sit near the front with feet flat. Lean slightly forward and stand, then sit back down slowly. Use your hands for support if needed.',
  'wall-pushup': 'Place your hands on the wall at chest height. Step back slightly, bend your elbows to bring your chest toward the wall, then push away. Keep your body in a straight line.',
  'glute-bridge': 'Lie on your back with knees bent and feet flat. Press through your feet and lift your hips comfortably, then lower slowly.',
  'calf-raise': 'Hold a stable counter, rise onto the balls of your feet, then lower your heels slowly.',
  'wall-plank': 'Place your forearms on a wall at shoulder height. Step back slightly and keep a straight line through your body. Breathe steadily as you hold.',
  'leg-press': 'Plant your feet shoulder-width on the platform. Lower until your knees bend comfortably while your hips stay against the pad. Press through your whole foot and stop short of locking your knees.',
  'chest-press': 'Adjust the seat so the handles line up with mid-chest. Keep your back against the pad and wrists straight. Press forward, then bring the handles back slowly.',
  'lat-pulldown': 'Secure your thighs under the pad. With a slight lean back, pull your elbows down until the bar approaches your upper chest. Let the bar rise slowly without swinging.',
  row: 'Sit tall with knees slightly bent. Pull the handle toward your lower ribs, keeping your elbows close. Extend your arms slowly without rocking your torso.',
  'leg-curl': 'Align your knees with the machine pivot and place the roller above your heels. Bend your knees to pull the roller, keeping your hips against the pad. Return slowly.',
  'db-curl': 'Stand with a dumbbell in each hand and elbows near your sides. Curl with palms facing up, then lower slowly. Keep your torso steady.',
};

const appId = 'katelins-workout-log';
const storageKey = appId + '-v1';
const view = document.querySelector('#view');
const status = document.querySelector('#status');
function localDate(value) {
  return [value.getFullYear(), value.getMonth() + 1, value.getDate()]
    .map((part, index) => index === 0 ? part : String(part).padStart(2, '0')).join('-');
}
const now = new Date();
let today = localDate(now);
let date = today;
let plan = { 1: 'A', 3: 'B', 5: 'C' }[now.getDay()] || 'A';
let tab = 'workout';
let section = 'entry';
let backlog = false;
let sessions = {};
let extras = {};
let notes = {};
let activities = [];

function validBackup(data) {
  if (data?.app !== appId || data.version !== 1 || !data.sessions || Array.isArray(data.sessions) ||
      typeof data.sessions !== 'object') return false;
  if (data.extras !== undefined && (!data.extras || typeof data.extras !== 'object' ||
      Array.isArray(data.extras) || !Object.entries(data.extras).every(([key, rows]) =>
        /^\d{4}-\d{2}-\d{2}-[ABC]$/.test(key) && Array.isArray(rows) && rows.every(row =>
          row && typeof row.name === 'string' && row.name.trim().length > 0 && row.name.length <= 80 &&
          Number.isInteger(row.sets) && row.sets > 0 && row.sets <= 99 &&
          Number.isInteger(row.reps) && row.reps > 0 && row.reps <= 999)))) return false;
  if (data.notes !== undefined && (!data.notes || typeof data.notes !== 'object' ||
      Array.isArray(data.notes) || !Object.values(data.notes).every(note => typeof note === 'string' && note.length <= 500))) return false;
  if (Object.values(data.extras || {}).some(rows => rows.some(row => row.actual !== undefined &&
      (!Array.isArray(row.actual) || row.actual.length !== row.sets || row.actual.some(set =>
        !set || typeof set.done !== 'boolean' || !(set.weight === null || Number.isFinite(set.weight) && set.weight >= 0) ||
        !Number.isInteger(set.count) || set.count < 1 || set.count > 999))))) return false;
  if (data.activities !== undefined && (!Array.isArray(data.activities) || !data.activities.every(entry =>
    entry && typeof entry.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
    Number.isFinite(Date.parse(entry.date)) && ['run', 'lifting', 'weight', 'sauna'].includes(entry.type) &&
    Number.isFinite(entry.amount) && entry.amount > 0 &&
    (entry.type !== 'run' || Number.isFinite(entry.miles) && entry.miles > 0) &&
    (entry.temperature === undefined || entry.type === 'sauna' && Number.isFinite(entry.temperature) && entry.temperature >= 1)))) return false;
  return Object.entries(data.sessions).every(([key, sets]) => {
    const match = /^(\d{4}-\d{2}-\d{2})-([ABC])$/.exec(key);
    return match && Number.isFinite(Date.parse(match[1])) && Array.isArray(sets) && sets.length >= 12 &&
      sets.every((set, index) => {
        const exercise = program[match[2]].exercises[exerciseIndexFor(set, index)];
        if (!exercise) return false;
        const bodyweight = exercise[2] === null;
        return set && typeof set.done === 'boolean' &&
          (bodyweight ? set.weight === null : set.weight === '' || Number.isFinite(set.weight) && set.weight >= 0) &&
          (set.count === '' || Number.isInteger(set.count) && set.count > 0) &&
          (!set.done || set.count !== '' && set.weight !== '');
      });
  });
}

try {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    const data = JSON.parse(saved);
    if (!validBackup(data)) throw new Error('Invalid saved data');
    sessions = data.sessions;
    extras = data.extras || {};
    notes = data.notes || {};
    activities = data.activities || [];
  }
} catch {
  status.textContent = 'Saved data could not be read. This session may only be available until you close the app.';
}

function save(message = '') {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ app: appId, version: 1, sessions, extras, notes, activities }));
    status.textContent = message;
  } catch {
    status.textContent = 'Your browser could not save these changes. Export a backup before closing this page.';
  }
}

function dateLabel(day) {
  return new Date(day + 'T12:00:00').toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function defaults(exercises) {
  return exercises.flatMap(([, , weight, count]) => [
    { weight, count, done: false }, { weight, count, done: false },
  ]);
}

const timer = document.querySelector('#rest');
let restInterval;
let restId;
const restOverrides = new Map();

function startRest(duration) {
  clearInterval(restInterval);
  timer.hidden = false;
  const end = Date.now() + duration * 1000;
  const update = () => {
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    const output = timer.querySelector('output');
    output.classList.toggle('rest-complete', left === 0);
    output.textContent = left
      ? Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0')
      : 'Rest complete';
    if (!left) {
      clearInterval(restInterval);
      navigator.vibrate?.([200, 100, 200]);
    }
  };
  timer.querySelectorAll('[data-rest]').forEach(button => button.setAttribute('aria-pressed', Number(button.dataset.rest) === duration));
  restInterval = setInterval(update, 250);
  update();
}

timer.querySelectorAll('[data-rest]').forEach(button => button.onclick = () => {
  const duration = Number(button.dataset.rest);
  restOverrides.set(restId, duration);
  startRest(duration);
});

document.querySelector('#rest-close').onclick = () => {
  clearInterval(restInterval);
  timer.hidden = true;
};

function exerciseIndexFor(set, index) {
  return index < 12 ? Math.floor(index / 2) : set?.exerciseIndex;
}

function setIndices(sets, exerciseIndex) {
  return sets.flatMap((set, index) => exerciseIndexFor(set, index) === exerciseIndex ? [index] : []);
}

function exerciseSets(sets, exerciseIndex) {
  return setIndices(sets, exerciseIndex).map(index => sets[index]);
}

function lastTime(id) {
  for (const log of loggedSessions()) {
    if (log.date >= date) continue;
    const index = program[log.plan].exercises.findIndex(exercise => exercise[0] === id);
    if (index < 0) continue;
    const results = exerciseSets(log.sets, index).flatMap((set, offset) => {
      if (!set.done) return [];
      const result = set.weight === null ? 'Hold ' + set.count + ' sec'
        : 'Weight ' + set.weight + ' lb' + (program[log.plan].exercises[index][5] === 'each' ? ' each' : '') + ' · Reps ' + set.count;
      return [{ ...set, offset, label: 'Set ' + (offset + 1) + ' · ' + result }];
    });
    if (results.length) return results;
  }
  return [];
}

function workout() {
  const { exercises } = program[plan];
  const weekday = new Date(date + 'T12:00:00').toLocaleDateString('en', { weekday: 'long' });
  const key = date + '-' + plan;
  const targets = exercises.map(([id, , weight]) => {
    const previous = lastTime(id).filter(set => set.weight > 0);
    return previous.length ? Math.min(...previous.map(set => set.weight)) : weight;
  });
  const sets = sessions[key] || defaults(exercises).map((set, index) => ({
    ...set, weight: targets[Math.floor(index / 2)],
  }));
  view.innerHTML = `
    <div class="days" aria-label="Program day">${Object.entries(program).map(([letter, item]) =>
      `<button data-plan="${letter}" aria-pressed="${letter === plan}">${item.day.slice(0, 3)} · ${letter}</button>`).join('')}</div>
    <div class="session"><div><h2>${weekday} Workout ${plan}</h2>
    <p id="set-total">${sets.filter(set => set.done).length} of 12 sets complete</p></div>
    <div class="date-controls"><label>Workout date<input type="date" id="date" value="${date}"></label><button id="today" ${date === today ? 'disabled' : ''}>Today</button></div></div>
    ${exercises.map(([id, name, weight, count, range, qualifier], exerciseIndex) => {
      weight = targets[exerciseIndex];
      const last = lastTime(id);
      return `
      <section class="card"><div class="exercise-title"><h3>${name}</h3><a href="#form-${id}" data-guide="${id}" aria-label="How to do ${name}">How to <span aria-hidden="true">↗</span></a></div>
      <p><strong>Target</strong> · ${weight === null || (weight === 0 && qualifier === 'bodyweight') ? 'Bodyweight' : weight === 0 ? 'Lightest available setting' : weight + ' lb' + (qualifier === 'each' ? ' each' : '')}
      · 2 × ${range || count}${weight === null ? ' sec' : ' reps'}</p>
      ${last.length ? `<p class="last-time"><strong>Last time</strong><br>${last.map(set => set.label).join('<br>')}</p>
        <button class="copy-last" data-copy="${exerciseIndex}" aria-label="Copy last session for ${name}">Copy last session</button>` : ''}
      ${setIndices(sets, exerciseIndex).map((index, offset) => {
        const set = sets[index];
        const label = `${name}, set ${offset + 1}`;
        return `<div class="set"><b>Set ${offset + 1}</b>
          ${weight === null ? `<button type="button" data-plank="${index}" aria-label="Start ${label}">Start</button>` : `<label>lb${qualifier === 'each' ? ' each' : ''}<input type="number" min="0" step="any" inputmode="decimal" data-index="${index}" data-field="weight" aria-label="${label}, pounds" value="${set.weight}"></label>`}
          <label>${weight === null ? 'Seconds' : 'Reps'}<input type="number" min="1" step="1" inputmode="numeric" data-index="${index}" data-field="count" aria-label="${label}, ${weight === null ? 'seconds' : 'reps'}" value="${set.count}"></label>
          <button data-complete="${index}" aria-pressed="${set.done}" aria-label="${set.done ? 'Undo' : 'Complete'} ${label}">${set.done ? '✓ Completed' : 'Done'}</button></div>`;
      }).join('')}<button class="add-set" data-add-set="${exerciseIndex}" aria-label="Add set for ${name}">+ Add set</button></section>`; }).join('')}`;

  let plankInterval;
  const stopPlank = () => clearInterval(plankInterval);
  view.querySelectorAll('[data-plank]').forEach(button => {
    button.onclick = () => {
      const index = Number(button.dataset.plank);
      const input = view.querySelector(`[data-index="${index}"][data-field="count"]`);
      if (!input.value || !input.validity.valid) {
        input.focus();
        return;
      }
      const running = button.dataset.running === 'true';
      stopPlank();
      view.querySelectorAll('[data-plank]').forEach(control => {
        delete control.dataset.running;
        control.textContent = 'Start';
      });
      if (running) return;
      button.dataset.running = 'true';
      const end = Date.now() + input.valueAsNumber * 1000;
      const update = () => {
        if (!button.isConnected || sets[index].done) {
          stopPlank();
          delete button.dataset.running;
          button.textContent = 'Start';
          return;
        }
        const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        button.textContent = remaining ? remaining + 's' : 'Time up';
        if (!remaining) {
          stopPlank();
          delete button.dataset.running;
          navigator.vibrate?.([200, 100, 200]);
        }
      };
      plankInterval = setInterval(update, 200);
      update();
    };
  });

  view.querySelectorAll('[data-add-set]').forEach(button => button.onclick = () => {
    const exerciseIndex = Number(button.dataset.addSet);
    const [, , weight, count] = exercises[exerciseIndex];
    const previous = exerciseSets(sets, exerciseIndex).at(-1);
    sets.push({ exerciseIndex, weight: previous.weight === '' ? weight : previous.weight,
      count: previous.count === '' ? count : previous.count, done: false });
    sessions[key] = sets;
    save();
    render();
    view.querySelector(`[data-index="${sets.length - 1}"]`).focus();
  });

  view.querySelectorAll('[data-copy]').forEach(button => {
    const exerciseIndex = Number(button.dataset.copy);
    const [id] = exercises[exerciseIndex];
    const previous = lastTime(id);
    const indices = setIndices(sets, exerciseIndex);
    const candidates = () => previous.filter(set => sets[indices[set.offset]]?.done === false);
    button.onclick = () => {
      for (const { offset, weight, count } of candidates()) {
        const index = indices[offset];
        Object.assign(sets[index], { weight, count });
        view.querySelectorAll(`[data-index="${index}"]`).forEach(input => {
          input.value = sets[index][input.dataset.field];
        });
      }
      sessions[key] = sets;
      save('Copied your previous sets.');
      button.textContent = 'Copied';
    };
    button.disabled = !candidates().length;
  });

  view.insertAdjacentHTML('beforeend', `<section class="card"><h3>Custom exercises</h3>
    <div id="extra-list"></div>
    <button type="button" id="open-extra" aria-expanded="false" aria-controls="extra-form">Add custom exercise</button>
    <form id="extra-form" hidden>
      <label>Exercise name<input name="exercise" maxlength="80" required></label>
      <label>Reps for set 1<input name="reps" type="number" inputmode="numeric" min="1" max="999" required></label>
      <button>Add exercise</button>
    </form></section>`);
  const openExtra = view.querySelector('#open-extra');
  const extraForm = view.querySelector('#extra-form');
  openExtra.onclick = () => {
    extraForm.hidden = !extraForm.hidden;
    openExtra.setAttribute('aria-expanded', !extraForm.hidden);
    if (!extraForm.hidden) extraForm.elements.exercise.focus();
  };
  const list = view.querySelector('#extra-list');
  function showExtras() {
    list.replaceChildren();
    (extras[key] || []).forEach((row, index) => {
      const item = document.createElement('section');
      item.className = 'card';
      const title = document.createElement('h3');
      title.textContent = row.name;
      item.append(title);
      const earlier = loggedSessions().find(log => log.date < date &&
        (extras[log.key] || []).some(extra => sameExercise(extra.name, row.name) && actualSets(extra).some(set => set.done)));
      if (earlier) {
        const previous = document.createElement('p');
        previous.className = 'last-time';
        previous.textContent = 'Last time · ' + (extras[earlier.key] || [])
          .filter(extra => sameExercise(extra.name, row.name))
          .flatMap(extra => actualSets(extra).flatMap((set, i) => set.done
            ? ['Set ' + (i + 1) + ' · ' + extraSetLabel(set)] : [])).join(' / ');
        item.append(previous);
        const source = (extras[earlier.key] || []).find(extra =>
          sameExercise(extra.name, row.name) && actualSets(extra).some(set => set.done));
        const copy = document.createElement('button');
        copy.className = 'copy-last';
        copy.textContent = 'Copy last session';
        copy.setAttribute('aria-label', 'Copy last session for ' + row.name);
        const candidates = () => actualSets(row).flatMap((set, i) =>
          !set.done && actualSets(source)[i]?.done ? [i] : []);
        copy.disabled = !candidates().length;
        copy.onclick = () => {
          for (const i of candidates()) {
            const { weight, count } = actualSets(source)[i];
            Object.assign(actualSets(row)[i], { weight, count });
            const [weightInput, countInput] = item.querySelectorAll('.set')[i].querySelectorAll('input');
            weightInput.value = weight ?? '';
            countInput.value = count;
          }
          save('Copied your previous sets.');
          copy.textContent = 'Copied';
        };
        item.append(copy);

      }
      actualSets(row).forEach((set, offset) => {
        const line = document.createElement('div');
        line.className = 'set';
        line.innerHTML = `<b>Set ${offset + 1}</b><label>lb (optional)<input type="number" min="0" step="any" inputmode="decimal"></label>
          <label>Reps<input type="number" min="1" max="999" inputmode="numeric" required></label><button type="button">✓</button>`;
        const [weight, count] = line.querySelectorAll('input');
        const complete = line.querySelector('button');
        weight.value = set.weight ?? '';
        count.value = set.count;
        complete.setAttribute('aria-label', 'Complete ' + row.name + ', set ' + (offset + 1));
        const refresh = () => {
          complete.setAttribute('aria-pressed', set.done);
          complete.setAttribute('aria-label', (set.done ? 'Undo ' : 'Complete ') + row.name + ', set ' + (offset + 1));
          complete.textContent = set.done ? '✓ Completed' : 'Done';
        };
        const edit = () => {
          if (!weight.validity.valid || !count.validity.valid) return false;
          set.weight = weight.value === '' ? null : weight.valueAsNumber;
          set.count = count.valueAsNumber;
          save();
          return true;
        };
        weight.oninput = count.oninput = edit;
        complete.onclick = () => {
          if (!edit()) {
            weight.reportValidity();
            count.reportValidity();
            return;
          }
          set.done = !set.done;
          save();
          refresh();
          refreshCompletion();
          if (set.done) {
            restId = 'custom:' + row.name.toLowerCase();
            timer.querySelector('strong').textContent = row.name;
            startRest(restOverrides.get(restId) ?? 60);
          }
        };
        refresh();
        item.append(line);
      });
      const add = document.createElement('button');
      add.className = 'add-set';
      add.textContent = '+ Add set';
      add.setAttribute('aria-label', 'Add set for ' + row.name);
      add.disabled = row.sets >= 99;
      add.onclick = () => {
        const actual = actualSets(row);
        const { weight, count } = actual.at(-1);
        actual.push({ weight, count, done: false });
        row.sets = actual.length;
        save();
        showExtras();
        list.children[index].querySelector('.set:last-of-type input[required]').focus();
      };
      item.append(add);
      const remove = document.createElement('button');
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', 'Remove ' + row.name);
      remove.onclick = () => {
        extras[key].splice(index, 1);
        if (!extras[key].length) delete extras[key];
        save();
        showExtras();
        openExtra.focus();
      };
      item.append(remove);
      list.append(item);
    });
    refreshCompletion();
  }
  showExtras();
  view.querySelector('#extra-form').onsubmit = event => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const name = fields.get('exercise').trim();
    if (!name) return;
    const sets = 1;
    const reps = Number(fields.get('reps'));
    const actual = Array.from({ length: sets }, () => ({ count: reps, weight: null, done: false }));
    (extras[key] ||= []).push({ name, sets, reps, actual });
    save();
    form.reset();
    form.hidden = true;
    openExtra.setAttribute('aria-expanded', 'false');
    showExtras();
    openExtra.focus();
  };

  view.insertAdjacentHTML('beforeend', '<section class="card"><label for="workout-note">Workout note</label><textarea id="workout-note" maxlength="500" rows="3"></textarea><p id="previous-note"></p><button id="finish-workout">Finish workout</button></section>');
  const note = view.querySelector('#workout-note');
  note.value = notes[key] || '';
  note.oninput = () => {
    if (note.value.trim()) notes[key] = note.value;
    else delete notes[key];
    save();
  };
  const previousNote = Object.keys(notes).sort().reverse().find(entry => entry.endsWith('-' + plan) && entry.slice(0, -2) < date);
  if (previousNote) view.querySelector('#previous-note').textContent = 'Last Workout ' + plan + ' note · ' + notes[previousNote];
  view.querySelector('#finish-workout').onclick = () => {
    const groups = workoutResults({ key, plan, sets });
    const completed = groups.flatMap(group => group.sets).filter(set => set.done).length;
    const skipped = groups.flatMap(group => group.sets).length - completed;
    const prior = loggedSessions().filter(log => log.date < date).flatMap(workoutResults);
    const score = (a, b) => (a.weight ?? 0) - (b.weight ?? 0) || a.count - b.count;
    const best = groups.filter(group => {
      const previous = prior.filter(item => item.id === group.id).flatMap(item => item.sets).filter(set => set.done);
      return previous.length && group.sets.some(set => set.done && previous.every(other => score(set, other) > 0));
    }).map(group => group.name);
    const summary = document.querySelector('#finish-summary');
    summary.querySelector('p').textContent = completed + ' completed · ' + skipped + ' skipped';
    summary.querySelector('ul').replaceChildren(...best.map(name => {
      const item = document.createElement('li');
      item.textContent = name;
      return item;
    }));
    summary.querySelector('h3').textContent = best.length ? 'Personal bests' : 'No new personal bests';
    summary.showModal();
  };

  view.querySelectorAll('[data-guide]').forEach(link => link.onclick = event => {
    event.preventDefault();
    const id = link.dataset.guide;
    const dialog = document.querySelector('#form-guide');
    dialog.querySelector('h2').textContent = exercises.find(exercise => exercise[0] === id)[1];
    dialog.querySelector('p').textContent = form[id];
    const exercise = dialog.querySelector('h2').textContent;
    const query = exercise + ' proper form demonstration';
    dialog.querySelector('#form-video').href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query);
    dialog.showModal();
  });

  view.querySelector('#today').onclick = () => {
    date = today;
    render();
    view.querySelector('#date').focus();
  };

  view.querySelector('#date').addEventListener('change', event => {
    if (event.target.value && event.target.validity.valid && /^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) date = event.target.value;
    render();
  });
  view.querySelectorAll('[data-plan]').forEach(button => button.onclick = () => {
    plan = button.dataset.plan;
    render();
    view.querySelector('[data-plan="' + plan + '"]').focus();
  });
  view.querySelectorAll('[data-field]').forEach(input => input.oninput = () => {
    const { field, index } = input.dataset;
    const set = sets[index];
    set[field] = input.value !== '' && input.validity.valid ? input.valueAsNumber : '';
    if (set[field] === '') set.done = false;
    sessions[key] = sets;
    save();
    refreshCompletion();
  });

  function refreshCompletion() {
    const buttons = [...view.querySelectorAll('.set button[aria-pressed]')];
    for (const button of view.querySelectorAll('[data-complete]')) {
      const index = Number(button.dataset.complete);
      const done = sets[index].done;
      const [, name] = exercises[exerciseIndexFor(sets[index], Number(index))];
      button.setAttribute('aria-pressed', done);
      button.setAttribute('aria-label', (done ? 'Undo ' : 'Complete ') + name + ', set ' + (setIndices(sets, exerciseIndexFor(sets[index], index)).indexOf(index) + 1));
      button.textContent = done ? '✓ Completed' : 'Done';
    }
    view.querySelectorAll('[data-copy]').forEach(button => {
      const index = Number(button.dataset.copy);
      button.disabled = !lastTime(exercises[index][0]).some(set => exerciseSets(sets, index)[set.offset]?.done === false);
      button.textContent = 'Copy last session';
    });
    view.querySelectorAll('[data-plank]').forEach(button => { button.disabled = sets[button.dataset.plank].done; });
    const next = buttons.find(button => button.getAttribute('aria-pressed') === 'false');
    for (const button of buttons) button.closest('.set').classList.toggle('next-set', button === next);
    const completed = buttons.filter(button => button.getAttribute('aria-pressed') === 'true').length;
    view.querySelector('#set-total').textContent = completed + ' of ' + buttons.length + ' sets complete';
  }

  view.querySelectorAll('[data-complete]').forEach(button => button.onclick = () => {
    const index = button.dataset.complete;
    const set = sets[index];
    if (set.weight === '' || set.count === '') {
      const field = set.weight === '' ? 'weight' : 'count';
      status.textContent = 'Enter a valid weight and rep or time value first.';
      view.querySelector(`[data-index="${index}"][data-field="${field}"]`).focus();
      return;
    }
    set.done = !set.done;
    if (set.done) {
      const [id, name] = exercises[exerciseIndexFor(sets[index], Number(index))];
      restId = id;
      timer.querySelector('strong').textContent = name;
      const duration = ['leg-press', 'goblet'].includes(id) ? 120 :
        ['chest-press', 'lat-pulldown', 'shoulder-press', 'row', 'incline'].includes(id) ? 90 : 60;
      startRest(restOverrides.get(id) ?? duration);
    }
    sessions[key] = sets;
    save();
    refreshCompletion();
  });
}

function loggedSessions() {
  return [...new Set([...Object.keys(sessions), ...Object.keys(extras), ...Object.keys(notes)])].sort().reverse()
    .map(key => {
      const plan = key.at(-1);
      return { key, date: key.slice(0, -2), plan, sets: sessions[key] || defaults(program[plan].exercises) };
    }).filter(log => log.sets.some(set => set.done) || extras[log.key]?.some(row => actualSets(row).some(set => set.done)) || notes[log.key]);
}

function setLabel(set) {
  return set.weight === null ? `${set.count} sec` : `${set.weight} lb × ${set.count}`;
}

function actualSets(row) {
  row.actual ??= Array.from({ length: row.sets }, () => ({ weight: null, count: row.reps, done: true }));
  return row.actual;
}

function sameExercise(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}

function extraSetLabel(set) {
  return (set.weight === null ? '' : 'Weight ' + set.weight + ' lb · ') + 'Reps ' + set.count;
}

function workoutResults(log) {
  return [
    ...program[log.plan].exercises.map(([id, name], index) => ({
      id, name, sets: exerciseSets(log.sets, index),
    })),
    ...(extras[log.key] || []).map(row => ({
      id: 'custom:' + row.name.toLowerCase(), name: row.name, sets: actualSets(row),
    })),
  ];
}

function history() {
  const all = loggedSessions();
  const logs = backlog ? all : all.slice(0, 3);
  view.innerHTML = '<h2>Workout history</h2>' + (logs.length ? logs.map(log => `
    <details><summary>${dateLabel(log.date)} · Workout ${log.plan} · ${workoutResults(log).flatMap(group => group.sets).filter(set => set.done).length}/${workoutResults(log).flatMap(group => group.sets).length} sets</summary>
    <ul>${program[log.plan].exercises.map(([, name, , , , qualifier], index) => {
      const sets = exerciseSets(log.sets, index)
        .flatMap((set, offset) => set.done ? [`Set ${offset + 1} · ${setLabel(set)}`] : []);
      return sets.length ? `<li><strong>${name}</strong>${qualifier === 'each' ? ' (lb each)' : ''}<ul class="history-sets">${sets.map(set => `<li>${set}</li>`).join('')}</ul></li>` : '';
    }).join('')}</ul><ul data-extra-history="${log.key}"></ul><button data-edit="${log.key}">Edit workout</button> <button data-delete="${log.key}">Delete workout</button></details>`).join('')
    : '<p>Mark a set complete to start your history.</p>');
  view.querySelectorAll('[data-extra-history]').forEach(list => {
    for (const row of extras[list.dataset.extraHistory] || []) {
      const item = document.createElement('li');
      const completed = actualSets(row).flatMap((set, index) => set.done ? ['Set ' + (index + 1) + ' · ' + extraSetLabel(set)] : []);
      if (!completed.length) continue;
      const title = document.createElement('strong');
      title.textContent = row.name;
      const setList = document.createElement('ul');
      setList.className = 'history-sets';
      for (const set of completed) {
        const line = document.createElement('li');
        line.textContent = set;
        setList.append(line);
      }
      item.append(title, setList);
      list.append(item);
    }
  });
  for (const log of logs) {
    if (!notes[log.key]) continue;
    const note = document.createElement('p');
    note.textContent = 'Workout note · ' + notes[log.key];
    view.querySelector('[data-extra-history="' + log.key + '"]').after(note);
  }

  view.querySelectorAll('[data-delete]').forEach(button => button.onclick = () => {
    const key = button.dataset.delete;
    const description = dateLabel(key.slice(0, -2)) + ' · Workout ' + key.at(-1);
    if (!confirm('Delete ' + description + '? This removes its sets, custom exercises, and note.')) return;
    delete sessions[key];
    delete extras[key];
    delete notes[key];
    save('Deleted ' + description + '.');
    render();
  });
  view.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => {
    date = button.dataset.edit.slice(0, -2);
    plan = button.dataset.edit.at(-1);
    tab = 'workout';
    section = 'entry';
    render();
    view.querySelector('#date').focus();
  });
  backlogButton(all.length);
}

function progress() {
  const logs = loggedSessions();
  const completed = logs.reduce((sum, log) => sum + log.sets.filter(set => set.done).length +
    (extras[log.key] || []).reduce((total, row) => total + actualSets(row).filter(set => set.done).length, 0), 0);
  const full = logs.filter(log => workoutResults(log).every(group => group.sets.every(set => set.done))).length;
  const bests = new Map();
  const compare = (a, b) => (a.weight ?? 0) - (b.weight ?? 0) || a.count - b.count;
  for (const log of logs) {
    program[log.plan].exercises.forEach(([id, name, , , , qualifier], index) => {
      const sets = exerciseSets(log.sets, index).filter(set => set.done);
      if (!sets.length) return;
      const bestSet = sets.reduce((a, b) => compare(a, b) >= 0 ? a : b);
      if (!bests.has(id)) bests.set(id, { name, qualifier, latest: bestSet, date: log.date, best: bestSet });
      const row = bests.get(id);
      if (compare(bestSet, row.best) > 0) row.best = bestSet;
    });
  }
  view.innerHTML = `<h2>Progress</h2><div class="stats">
    <div class="stat"><strong>${logs.length}</strong>Sessions logged</div>
    <div class="stat"><strong>${full}</strong>Full workouts</div>
    <div class="stat"><strong>${completed}</strong>Sets completed</div></div>
    <h2>Exercise records</h2>
    ${[...bests.values()].map(row => `<section class="card"><h3>${row.name}${row.qualifier === 'each' ? ' · lb each' : ''}</h3>
    <p>Best · ${setLabel(row.best)}</p><p>Latest · ${setLabel(row.latest)} · ${dateLabel(row.date)}</p></section>`).join('') ||
    '<p>Complete sets to see your latest and best results.</p>'}`;
}

const sectionNames = { workout: 'Workout', run: 'Run', sauna: 'Sauna', weight: 'Weight' };

function runMetrics(entry) {
  const weight = activities.filter(item => item.type === 'weight' && item.date <= entry.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const seconds = Math.round(entry.amount * 60 / entry.miles);
  const pace = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  const calories = weight ? Math.round(1.7 * weight.amount * 0.45359237 * entry.miles) : null;
  return pace + ' /mi · ' + (calories === null ? 'Add a weigh-in for estimated calories' : '~' + calories + ' kcal');
}

function entryText(entry) {
  if (entry.type === 'run') {
    const seconds = Math.round(entry.amount * 60);
    const time = Math.floor(seconds / 60) + ' min ' + seconds % 60 + ' sec';
    return entry.miles + ' mi · ' + time + ' · ' + runMetrics(entry);
  }
  if (entry.type === 'weight') return entry.amount + ' lb';
  return entry.amount + ' min' + (entry.temperature === undefined ? '' : ' · ' + entry.temperature + ' °F');
}

function activityEntries() {
  return activities.filter(entry => entry.type === tab).reverse().sort((a, b) => b.date.localeCompare(a.date));
}

function activityEntry() {
  const type = tab;
  view.innerHTML = `<h2>Log ${type === 'weight' ? 'body weight' : 'a ' + (type === 'sauna' ? 'sauna visit' : 'run')}</h2>
    <section class="card"><form id="activity-form">
      <label class="activity-date">Date<input name="date" type="date" value="${today}" required></label>
      ${type === 'run' ? `<fieldset class="run-time"><legend>Time</legend>
        <label>Minutes<input name="minutes" type="number" inputmode="numeric" min="0" step="1" required></label>
        <label>Seconds<input name="seconds" type="number" inputmode="numeric" min="0" max="59" step="1" placeholder="0"></label>
      </fieldset>` : `<label>${type === 'weight' ? 'Weight (lb)' : 'Time (min)'}<input name="amount" type="number" inputmode="decimal" min="0.01" step="any" required></label>`}
      ${type === 'run' ? '<label>Distance (mi)<input name="miles" type="number" inputmode="decimal" min="0.01" step="any" required></label>' : ''}
      ${type === 'sauna' ? '<label>Temperature (°F)<input name="temperature" type="number" inputmode="decimal" min="1" step="any" required></label>' : ''}
      <button>Save ${type === 'sauna' ? 'visit' : type}</button>
    </form><p id="entry-result" role="status"></p></section>`;
  const form = view.querySelector('form');
  const result = view.querySelector('#entry-result');
  const draft = () => {
    const fields = form.elements;
    const entry = { type, date: fields.date.value, amount: type === 'run' ? fields.minutes.valueAsNumber + (fields.seconds.valueAsNumber || 0) / 60 : fields.amount.valueAsNumber };
    if (type === 'run') entry.miles = fields.miles.valueAsNumber;
    if (type === 'sauna') entry.temperature = fields.temperature.valueAsNumber;
    return entry;
  };
  if (type === 'run') form.oninput = () => {
    const entry = draft();
    result.textContent = form.checkValidity() && entry.amount > 0 ? runMetrics(entry) : '';
  };
  form.onsubmit = event => {
    event.preventDefault();
    const entry = draft();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return;
    if (entry.amount <= 0) {
      result.textContent = 'Enter a run time greater than zero.';
      return;
    }
    if (type === 'weight') activities = activities.filter(item => item.type !== type || item.date !== entry.date);
    activities.push(entry);
    save('Entry saved.');
    result.textContent = 'Saved · ' + entryText(entry);
    for (const input of form.querySelectorAll('input[type="number"]')) input.value = '';
    if (type !== 'run') {
      activityProgress(false);
      const details = view.querySelector('#inline-activity-history');
      activityHistory(details);
    }
  };
  if (type !== 'run') {
    activityProgress(false);
    const details = document.createElement('details');
    details.id = 'inline-activity-history';
    details.innerHTML = '<summary>Saved entries</summary>';
    view.append(details);
    activityHistory(details);
  }
}

function backlogButton(count) {
  if (count <= 3) return;
  const button = document.createElement('button');
  button.textContent = backlog ? 'Show latest 3' : 'Show all ' + count + ' entries';
  button.onclick = () => {
    backlog = !backlog;
    render();
    view.querySelector('.backlog-button')?.focus();
  };
  button.className = 'backlog-button';
  view.append(button);
}

function activityHistory(container = view) {
  const entries = activityEntries();
  container.innerHTML = container === view ? '<h2>' + sectionNames[tab] + ' history</h2>' : '<summary>Saved entries</summary>';
  if (!entries.length) {
    container.insertAdjacentHTML('beforeend', '<p>No entries yet.</p>');
    return;
  }
  for (const entry of entries.slice(0, backlog || container !== view ? entries.length : 3)) {
    const card = document.createElement('section');
    card.className = 'card';
    const title = document.createElement('h3');
    title.textContent = dateLabel(entry.date);
    const detail = document.createElement('p');
    detail.textContent = entryText(entry);
    const remove = document.createElement('button');
    remove.textContent = 'Delete entry';
    remove.onclick = () => {
      if (!confirm('Delete the entry for ' + dateLabel(entry.date) + '?')) return;
      activities = activities.filter(item => item !== entry);
      save('Entry deleted.');
      render();
    };
    card.append(title, detail, remove);
    container.append(card);
  }
  if (container === view) backlogButton(entries.length);
}

function activityProgress(showTitle = true) {
  view.querySelector('#activity-progress')?.remove();
  if (showTitle) view.innerHTML = '<h2>' + sectionNames[tab] + ' progress</h2>';
  const entries = activityEntries();
  const monday = new Date(today + 'T12:00:00');
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const startDay = tab === 'weight' ? today.slice(0, 7) + '-01' : localDate(monday);
  const period = entries.filter(entry => entry.date >= startDay && entry.date <= today);
  const card = document.createElement('section');
  card.className = 'card';
  if (tab === 'run') {
    const totalMiles = period.reduce((sum, entry) => sum + entry.miles, 0);
    const totalMinutes = period.reduce((sum, entry) => sum + entry.amount, 0);
    card.innerHTML = `<h3>This week</h3><p>${Number(totalMiles.toFixed(2))} mi · ${Number(totalMinutes.toFixed(2))} min · ${period.length} runs</p>`;
    if (entries.length) {
      const longest = entries.reduce((best, entry) => entry.miles > best.miles ? entry : best);
      const fastest = entries.reduce((best, entry) => entry.amount / entry.miles < best.amount / best.miles ? entry : best);
      card.insertAdjacentHTML('beforeend', `<h3>Personal records</h3><p>Longest run · ${longest.miles} mi</p><p>Fastest pace · ${runMetrics(fastest).split(' · ')[0]}</p>`);
    }
    view.append(card);
    return;
  }
  card.id = 'activity-progress';
  const heading = tab === 'weight' ? 'This month · Body weight (lb)' : 'This week · Sauna time (min)';
  card.innerHTML = '<h3>' + heading + '</h3>';
  const daily = new Map();
  for (const entry of [...period].reverse()) {
    daily.set(entry.date, tab === 'weight' ? entry.amount : (daily.get(entry.date) || 0) + entry.amount);
  }
  if (daily.size) {
    const values = [...daily.values()];
    const min = Math.min(...values);
    const span = Math.max(1, Math.max(...values) - min);
    const start = Date.parse(startDay);
    const end = new Date(startDay + 'T12:00:00');
    if (tab === 'weight') end.setMonth(end.getMonth() + 1, 0);
    else end.setDate(end.getDate() + 6);
    const duration = Date.parse(localDate(end)) - start;
    const coords = [...daily].map(([day, value]) => [
      10 + 280 * (Date.parse(day) - start) / duration, 85 - 70 * (value - min) / span,
    ]);
    card.insertAdjacentHTML('beforeend', `<svg viewBox="0 0 300 100" role="img" aria-label="${heading}">
      <polyline fill="none" stroke="#89600c" stroke-width="2" points="${coords.map(point => point.join(',')).join(' ')}"></polyline>
      ${coords.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#89600c"></circle>`).join('')}
      </svg><ul>${[...daily].map(([day, value]) => `<li>${dateLabel(day)} · ${value} ${tab === 'weight' ? 'lb' : 'min'}</li>`).join('')}</ul>`);
  } else {
    card.insertAdjacentHTML('beforeend', '<p>No entries for this period yet.</p>');
  }
  const history = view.querySelector('#inline-activity-history');
  if (history) history.before(card);
  else view.append(card);
}

view.addEventListener('focusin', event => {
  const input = event.target;
  if (!input.matches('input[type="number"]') || input.value === '') return;
  const previous = input.value;
  input.value = '';
  let edited = false;
  const markEdited = () => { edited = true; };
  input.addEventListener('input', markEdited);
  const restore = () => {
    input.removeEventListener('input', markEdited);
    if (!edited && input.value === '') input.value = previous;
  };
  input.addEventListener('blur', restore, { once: true });
});

function render() {
  document.querySelectorAll('[data-tab]').forEach(button => button.setAttribute('aria-pressed', button.dataset.tab === tab));
  document.querySelector('#section-nav').hidden = tab === 'sauna' || tab === 'weight';
  document.querySelector('#section-nav').setAttribute('aria-label', sectionNames[tab] + ' views');
  document.querySelectorAll('[data-section]').forEach(button => button.setAttribute('aria-pressed', button.dataset.section === section));
  const views = tab === 'workout'
    ? { entry: workout, history, progress }
    : { entry: activityEntry, history: activityHistory, progress: activityProgress };
  views[section]();
}

const passages = [
  ['So run to win!', '1 Corinthians 9:24'],
  ['Don’t be afraid, for I am with you.', 'Isaiah 41:10'],
  ['Be strong and courageous!', 'Joshua 1:9'],
  ['For I can do everything through Christ, who gives me strength.', 'Philippians 4:13'],
  ['But those who trust in the Lord will find new strength.', 'Isaiah 40:31'],
  ['God is our refuge and strength, always ready to help in times of trouble.', 'Psalm 46:1'],
  ['My grace is all you need. My power works best in weakness.', '2 Corinthians 12:9'],
  ['The Lord is my light and my salvation—so why should I be afraid?', 'Psalm 27:1'],
  ['So let’s not get tired of doing what is good.', 'Galatians 6:9'],
  ['Work willingly at whatever you do, as though you were working for the Lord rather than for people.', 'Colossians 3:23'],
  ['God arms me with strength, and he makes my way perfect.', 'Psalm 18:32'],
  ['And let us run with endurance the race God has set before us.', 'Hebrews 12:1'],
];
let passageIndex = 0;
let verseAnimation;

async function rotateVerse() {
  const verse = document.querySelector('.header-verse');
  passageIndex = (passageIndex + 1) % passages.length;
  const [quote, reference] = passages[passageIndex];
  verseAnimation?.cancel();
  const replaceVerse = () => {
    const citation = document.createElement('span');
    citation.textContent = '· ' + reference + ' (NLT)';
    verse.replaceChildren('“' + quote + '” ', citation);
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    replaceVerse();
    return;
  }
  verseAnimation = verse.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150 });
  try {
    await verseAnimation.finished;
  } catch {
    return;
  }
  replaceVerse();
  verseAnimation = verse.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 230 });
}

document.querySelector('#main-nav').onclick = event => {
  if (!event.target.dataset.tab) return;
  if (tab === event.target.dataset.tab && section === 'entry') return;
  rotateVerse();
  tab = event.target.dataset.tab;
  section = 'entry';
  backlog = false;
  render();
};
document.querySelector('#section-nav').onclick = event => {
  if (!event.target.dataset.section) return;
  if (section === event.target.dataset.section) return;
  rotateVerse();
  section = event.target.dataset.section;
  backlog = false;
  render();
};

document.querySelector('#export').onclick = () => {
  const blob = new Blob([JSON.stringify({ app: appId, version: 1, sessions, extras, notes, activities }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `katelins-workout-backup-${today}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

const backup = document.querySelector('#backup');
document.querySelector('#import').onclick = () => backup.click();
backup.onchange = async () => {
  const file = backup.files[0];
  backup.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!validBackup(data)) throw new Error('Invalid backup');
    if (!confirm('Restore this backup? It will replace all workout data currently in this browser.')) return;
    sessions = data.sessions;
    extras = data.extras || {};
    notes = data.notes || {};
    activities = data.activities || [];
    save('Backup restored.');
    render();
  } catch {
    status.textContent = 'Could not read this workout backup.';
  }
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  const current = localDate(new Date());
  if (current === today) return;
  today = current;
  date = today;
  plan = { 1: 'A', 3: 'B', 5: 'C' }[new Date().getDay()] || 'A';
  render();
});

render();
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    status.textContent = 'Offline setup failed. You can still use the app while online.';
  });
}

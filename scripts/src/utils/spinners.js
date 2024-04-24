import Spinnies from 'spinnies';
import chalk from 'chalk';

let spinners;

const getSpinners = () => {
  if (!spinners) {
    spinners = new Spinnies();
  }
  return spinners;
};

let _paused = [];
let _pausedFinishes = [];
let _pausedErrors = [];
let isPaused = false;

export const showSpinner = (spinnerName, message) => {
  if (getSpinners().pick(spinnerName)) {
    updateSpinner(spinnerName, message);
  } else {
    getSpinners().add(spinnerName, { text: message });
    if (isPaused) {
      _paused.push({ name: spinnerName, spinner: getSpinners().pick(spinnerName) });
      pauseSpinners();
    }
  }
};

export const updateSpinner = (spinnerName, message) => {
  const spinner = getSpinners().pick(spinnerName);
  if (spinner) {
    if (isPaused) {
      const pausedSpinner = _paused.find((s) => s.name === spinnerName);
      if (pausedSpinner) {
        pausedSpinner.text = message;
      } else {
        showSpinner(spinnerName, message);
      }
    } else {
      getSpinners().update(spinnerName, { text: message });
    }
  } else {
    showSpinner(spinnerName, message);
  }
};

export const pauseSpinners = () => {
  const spinners = getSpinners();
  const paused = [];
  Object.keys(spinners.spinners).forEach((spinner) => {
    const s = spinners.pick(spinner);
    if (s.status !== 'fail' && s.status !== 'succeed') {
      _paused.push({ name: spinner, spinner: s });
      paused.push({ name: spinner, spinner: s });
      spinners.remove(spinner);
    }
  });

  spinners.stopAll();
  isPaused = true;
  return paused;
};

export const resumeSpinners = (pausedSpinners = _paused) => {
  pausedSpinners.forEach((spinner) => {
    getSpinners().remove(spinner.name);
    getSpinners().add(spinner.name, { ...spinner.spinner });
  });
  _paused = [];
  _pausedFinishes.forEach((finish) => finishSpinner(finish.name, finish.message));
  _pausedFinishes = [];
  _pausedErrors.forEach((error) => errorSpinner(error.name, error.message));
  _pausedErrors = [];
  isPaused = false;
};

export const finishSpinner = (spinnerName, message) => {
  const s = getSpinners().pick(spinnerName);
  if (isPaused) {
    _paused = _paused.filter((s) => s.name !== spinnerName);
    if (message) {
      _pausedFinishes.push({ name: spinnerName, message });
    }
  } else if (message) {
    if (!s) {
      getSpinners().add(spinnerName, { text: message });
    }
    getSpinners().succeed(spinnerName, { text: message });
  } else {
    if (s) {
      getSpinners().remove(spinnerName);
      return s?.text;
    }
  }
  return message;
};

export const errorSpinner = (spinnerName, message) => {
  if (isPaused) {
    _paused = _paused.filter((s) => s.name !== spinnerName);
    _pausedErrors.push({ name: spinnerName, message: message });
  } else {
    if (!getSpinners().pick(spinnerName)) {
      getSpinners().add(spinnerName, { text: message });
    }
    getSpinners().fail(spinnerName, { text: message });
  }
};

const log = (color, ...args) => {
  pauseSpinners();
  console.log(
    ...args.map((arg) => {
      if (arg instanceof Error) {
        return arg;
      } else {
        return typeof arg === 'string' ? color(arg) : color(JSON.stringify(arg, null, 2));
      }
    }),
  );
  resumeSpinners();
};

export const useSpinners = (processName, color = chalk.white) => {
  const key = `${processName}-spinner`;
  if (typeof color === 'string') {
    color = chalk.hex(color);
  }
  return {
    showSpinner: (name, message) => {
      showSpinner(`${key}-${name}`, color.inverse(`${message}`));
      return {
        update: (addition) => updateSpinner(`${key}-${name}`, color.inverse(`${message} (${addition})`)),
        finish: (message) => finishSpinner(`${key}-${name}`, message ? color(`${message}`) : null),
        error: (info, addition = message) => {
          if (info instanceof Error) {
            errorSpinner(`${key}-${name}`, color(`${addition} (${info.message})`));
            log(color, info);
          } else {
            errorSpinner(`${key}-${name}`, color(`${info} ${addition}`));
          }
        },
      };
    },
    updateSpinner: (name, message) => updateSpinner(`${key}-${name}`, color.inverse(`${message}`)),
    finishSpinner: (name, message) => finishSpinner(`${key}-${name}`, message ? color(`${message}`) : null),
    errorSpinner: (name, message) => errorSpinner(`${key}-${name}`, color(`${message}`)),
    log: (...args) => log(color, ...args),
  };
};
